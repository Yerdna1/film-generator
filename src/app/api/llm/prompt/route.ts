// Unified LLM API Route using centralized API wrapper
// All provider configurations come from Settings (single source of truth)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { getUserPermissions } from '@/lib/services/user-permissions';
import { callExternalApi } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import type { Provider } from '@/lib/services/real-costs';

// Import modular components
import { buildRequestBody } from './lib/request-builders';
import { extractGeneratedText } from './lib/response-parsers';
import { handleClaudeSDK } from './lib/claude-sdk-handler';
import { checkLLMPermissions } from './lib/permissions-checker';

export const maxDuration = 120; // Allow up to 2 minutes for generation

// Cost for prompt enhancement
const PROMPT_ENHANCEMENT_COST = COSTS.SCENE_GENERATION;

export async function POST(request: NextRequest) {
  try {
    const { prompt, systemPrompt = '', model, projectId } = await request.json();

    // Get session and check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get provider configuration - single source of truth
    let config;
    try {
      config = await getProviderConfig({
        userId,
        projectId,
        type: 'llm',
      });
    } catch (error) {
      // Return error indicating API key configuration is required
      return NextResponse.json(
        {
          error: error instanceof Error && error.message.includes('NO_PROVIDER_CONFIGURED')
            ? 'No LLM provider configured. Please configure your providers in settings.'
            : 'API configuration required. Please configure your API keys in Settings.',
          code: 'API_KEY_REQUIRED',
          type: 'llm'
        },
        { status: 402 }
      );
    }

    const isUsingOwnKey = config.userHasOwnApiKey || false;
    const isFreeGeminiModel = (model || config.model || '').includes('free') || (model || config.model || '').includes('flash');
    const defaultSystemPrompt = systemPrompt || 'You are a professional film prompt engineer specializing in creating detailed prompts for animated films.';

    // Check user permissions
    const permissionCheck = await checkLLMPermissions({
      userId,
      isUsingOwnKey,
      isFreeModel: isFreeGeminiModel
    });

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        permissionCheck.error!,
        { status: permissionCheck.error!.status }
      );
    }

    // Special handling for Claude SDK (local development only)
    if (config.provider === 'claude-sdk') {
      const permissions = await getUserPermissions(userId);
      const shouldChargeCredits = permissions.requiresCredits && !isUsingOwnKey && !isFreeGeminiModel;

      const result = await handleClaudeSDK({
        config,
        prompt,
        systemPrompt: defaultSystemPrompt,
        userId,
        projectId,
        shouldChargeCredits
      });

      return NextResponse.json(result);
    }

    // Build request body based on provider
    const requestBody = buildRequestBody({
      provider: config.provider,
      model: config.model || model,
      prompt,
      systemPrompt: defaultSystemPrompt
    });

    // Make the API call using the centralized wrapper
    console.log(`[LLM Prompt] Calling ${config.provider} with model ${config.model} (requested: ${model})`);

    const response = await callExternalApi({
      userId,
      projectId,
      type: 'llm',
      body: requestBody,
      endpoint: config.provider === 'modal' ? (config.endpoint || undefined) : undefined,
      showLoadingMessage: true,
      loadingMessage: `Generating enhanced prompt using ${config.provider}...`,
    });

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status }
      );
    }

    // Extract text from response based on provider format
    const generatedText = extractGeneratedText(response);

    if (!generatedText) {
      console.error('No text generated from response:', {
        provider: response.provider,
        data: JSON.stringify(response.data, null, 2),
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });
      return NextResponse.json(
        { error: `No text generated from ${response.provider}. Check console for response structure.` },
        { status: 500 }
      );
    }

    // Determine if we should charge credits
    const permissions = await getUserPermissions(userId);
    const shouldChargeCredits = permissions.requiresCredits && !isUsingOwnKey && !isFreeGeminiModel;

    // Deduct credits ONLY if using system resources (and not free model)
    if (shouldChargeCredits) {
      const spendResult = await spendCredits(
        userId,
        PROMPT_ENHANCEMENT_COST,
        'prompt',
        `Master prompt enhancement via ${response.provider}`,
        projectId,
        response.provider as Provider
      );

      if (!spendResult.success) {
        console.error('Failed to deduct credits:', spendResult.error);
        // Still return the text since generation succeeded
      }
    }

    return NextResponse.json({
      text: generatedText,
      provider: response.provider,
      creditsUsed: shouldChargeCredits ? PROMPT_ENHANCEMENT_COST : 0,
      isFreeGeneration: !shouldChargeCredits
    });
  } catch (error) {
    console.error('LLM prompt route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}