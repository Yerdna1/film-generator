// Unified LLM API Route using centralized API wrapper
// All provider configurations come from Settings (single source of truth)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, checkBalance, COSTS } from '@/lib/services/credits';
import { getUserPermissions, shouldUseOwnApiKeys, checkRequiredApiKeys, getMissingRequirementError } from '@/lib/services/user-permissions';
import { callExternalApi } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import type { Provider } from '@/lib/services/real-costs';

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

    // Check user permissions and premium status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    const { getSubscription } = await import('@/lib/services/polar');
    const subscription = await getSubscription(userId);
    const isPremiumUser = subscription.status === 'active' && subscription.plan !== 'free';
    const { LEGACY_ADMIN_EMAIL } = await import('@/lib/admin');
    const isAdmin = user?.role === 'admin' || user?.email === LEGACY_ADMIN_EMAIL;

    // Get provider configuration - single source of truth
    let config;
    try {
      config = await getProviderConfig({
        userId,
        projectId,
        type: 'llm',
      });
    } catch (error) {
      console.log('[LLM Prompt] getProviderConfig failed, using defaults:', error);
      // For premium/admin users, we can fallback to system keys
      if (isPremiumUser || isAdmin) {
        const userSettings = await prisma.apiKeys.findUnique({
          where: { userId },
          select: {
            llmProvider: true,
            openRouterModel: true,
            kieLlmModel: true,
            modalLlmEndpoint: true,
          },
        });

        config = {
          provider: userSettings?.llmProvider || 'kie',
          model: model || userSettings?.openRouterModel || userSettings?.kieLlmModel || 'gemini-2.5-flash',
          apiKey: process.env.KIE_API_KEY || process.env.OPENROUTER_API_KEY,
          endpoint: userSettings?.modalLlmEndpoint,
          userHasOwnApiKey: false,
        };
      } else {
        return NextResponse.json(
          { error: 'API configuration required. Please configure your API keys in Settings.' },
          { status: 403 }
        );
      }
    }

    const isUsingOwnKey = config.userHasOwnApiKey || false;
    const isFreeGeminiModel = (model || config.model || '').includes('free') || (model || config.model || '').includes('flash');

    // Check user permissions and credit/API key requirements
    const permissions = await getUserPermissions(userId);
    const useOwnKeys = await shouldUseOwnApiKeys(userId, 'llm');

    // Check if user needs API keys
    if ((useOwnKeys || permissions.requiresApiKeys) && !isUsingOwnKey && !isFreeGeminiModel) {
      const keyCheck = await checkRequiredApiKeys(userId, 'llm');

      if (!keyCheck.hasKeys) {
        const error = getMissingRequirementError(permissions, 'llm', keyCheck.missing);
        return NextResponse.json(
          {
            ...error,
            creditsRequired: PROMPT_ENHANCEMENT_COST,
            balance: 0
          },
          { status: error.code === 'API_KEY_REQUIRED' ? 403 : 402 }
        );
      }
    } else if (permissions.requiresCredits && !isUsingOwnKey && !isFreeGeminiModel) {
      // Premium/admin user using system keys - check credits
      const balanceCheck = await checkBalance(userId, PROMPT_ENHANCEMENT_COST);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json(
          {
            error: `Insufficient credits. Need ${PROMPT_ENHANCEMENT_COST}, have ${balanceCheck.balance}`,
            creditsRequired: PROMPT_ENHANCEMENT_COST,
            balance: balanceCheck.balance,
            code: 'INSUFFICIENT_CREDITS',
            showCreditsModal: true
          },
          { status: 402 }
        );
      }
    }

    const defaultSystemPrompt = systemPrompt || 'You are a professional film prompt engineer specializing in creating detailed prompts for animated films.';

    // Special handling for Claude SDK (local development only)
    if (config.provider === 'claude-sdk') {
      try {
        const { query } = await import('@anthropic-ai/claude-agent-sdk');
        let fullResponse = '';

        const stream = query({
          prompt,
          options: {
            model: 'claude-sonnet-4-20250514',
            systemPrompt: defaultSystemPrompt,
            maxTurns: 1,
            allowedTools: [],
          },
        });

        for await (const message of stream) {
          if (message.type === 'assistant' && message.message?.content) {
            for (const block of message.message.content) {
              if (block.type === 'text') {
                fullResponse += block.text;
              }
            }
          }
        }

        // Deduct credits if needed
        const shouldChargeCredits = permissions.requiresCredits && !isUsingOwnKey && !isFreeGeminiModel;
        if (shouldChargeCredits) {
          await spendCredits(
            userId,
            PROMPT_ENHANCEMENT_COST,
            'prompt',
            'Master prompt enhancement via Claude SDK',
            projectId,
            'claude-sdk' as Provider
          );
        }

        return NextResponse.json({
          text: fullResponse,
          provider: 'claude-sdk',
          creditsUsed: shouldChargeCredits ? PROMPT_ENHANCEMENT_COST : 0,
          isFreeGeneration: !shouldChargeCredits
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Claude SDK error: ${error instanceof Error ? error.message : String(error)}. Make sure Claude CLI is installed and authenticated.` },
          { status: 500 }
        );
      }
    }

    // Build request body based on provider
    let requestBody: any;
    const llmModel = model || config.model;

    switch (config.provider) {
      case 'openrouter':
      case 'openai':
      case 'kie':
        // Map model format if needed for KIE
        let finalModel = llmModel;
        if (config.provider === 'kie' && llmModel?.includes('/')) {
          // Try to find matching model in database
          const kieLlmModel = await prisma.kieLlmModel.findFirst({
            where: {
              OR: [
                { modelId: llmModel },
                { apiModelId: llmModel },
                { modelId: { contains: llmModel.split('/')[1]?.replace(':free', '').replace(':exp', '') || '' } }
              ]
            },
            select: { modelId: true, apiModelId: true }
          });

          if (kieLlmModel) {
            finalModel = kieLlmModel.apiModelId || kieLlmModel.modelId;
          }
        }

        requestBody = {
          model: finalModel,
          messages: [
            { role: 'system', content: defaultSystemPrompt },
            { role: 'user', content: prompt },
          ],
          max_tokens: 8192,
          temperature: 0.9,
          stream: false,
        };
        break;

      case 'modal':
        requestBody = {
          prompt,
          system_prompt: defaultSystemPrompt,
          max_tokens: 8192,
        };
        break;

      case 'gemini':
        requestBody = {
          contents: [{ parts: [{ text: `${defaultSystemPrompt}\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported LLM provider: ${config.provider}` },
          { status: 400 }
        );
    }

    // Make the API call using the centralized wrapper
    console.log(`[LLM Prompt] Calling ${config.provider} with model ${llmModel}`);

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
    let generatedText: string | undefined;

    switch (response.provider) {
      case 'openrouter':
      case 'openai':
      case 'kie':
        generatedText = response.data?.choices?.[0]?.message?.content;
        // KIE wrapped format
        if (!generatedText && response.data?.data) {
          generatedText = response.data.data.choices?.[0]?.message?.content ||
                         response.data.data.output ||
                         response.data.data.text ||
                         response.data.data.result;
        }
        break;

      case 'modal':
        generatedText = response.data?.response ||
                       response.data?.text ||
                       response.data?.content ||
                       (typeof response.data === 'string' ? response.data : undefined);
        break;

      case 'gemini':
        generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        break;
    }

    if (!generatedText) {
      console.error('No text generated from response:', response.data);
      return NextResponse.json(
        { error: 'No text generated from the model' },
        { status: 500 }
      );
    }

    // Determine if we should charge credits
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