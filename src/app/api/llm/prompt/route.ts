// Unified LLM API Route for Master Prompt Enhancement
// Uses user's configured LLM provider (OpenRouter, Claude SDK, Modal, or Gemini)
// Now integrates with project.modelConfig via getProviderConfig

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, checkBalance, COSTS } from '@/lib/services/credits';
import { callOpenRouter, DEFAULT_OPENROUTER_MODEL } from '@/lib/services/openrouter';
import { getProviderConfig } from '@/lib/providers';
import type { Provider } from '@/lib/services/real-costs';

export const maxDuration = 120; // Allow up to 2 minutes for generation

// Cost for prompt enhancement
const PROMPT_ENHANCEMENT_COST = COSTS.SCENE_GENERATION;

// Gemini API URL
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Query Claude SDK (for local development with Claude CLI)
async function queryClaudeSDK(prompt: string, systemPrompt: string): Promise<string> {
  try {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    let fullResponse = '';

    const stream = query({
      prompt,
      options: {
        model: 'claude-sonnet-4-20250514',
        systemPrompt,
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

    return fullResponse;
  } catch (error) {
    throw new Error(`Claude SDK error: ${error instanceof Error ? error.message : String(error)}. Make sure Claude CLI is installed and authenticated.`);
  }
}

// Query Modal LLM endpoint
async function queryModalLLM(prompt: string, systemPrompt: string, endpoint: string): Promise<string> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        system_prompt: systemPrompt,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Modal LLM request failed: ${errorText}`);
    }

    const data = await response.json();

    if (data.response) return data.response;
    if (data.text) return data.text;
    if (data.content) return data.content;
    if (typeof data === 'string') return data;

    throw new Error('Modal endpoint did not return expected response format');
  } catch (error) {
    throw new Error(`Modal LLM error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Query Gemini API
async function queryGemini(prompt: string, apiKey: string, model: string = 'gemini-2.0-flash'): Promise<string> {
  const response = await fetch(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API failed');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text generated from Gemini');
  }

  return text;
}

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

    // Check if user is admin or premium status early
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    // Check subscription status for premium users
    const { getSubscription } = await import('@/lib/services/polar');
    const subscription = await getSubscription(userId);
    const isPremiumUser = subscription.status === 'active' && subscription.plan !== 'free';
    const { LEGACY_ADMIN_EMAIL } = await import('@/lib/admin');
    const isAdmin = user?.role === 'admin' || user?.email === LEGACY_ADMIN_EMAIL;

    // Use getProviderConfig to resolve LLM provider with project config priority
    let llmProvider: string;
    let openRouterApiKey: string | undefined;
    let llmModel: string;
    let modalLlmEndpoint: string | undefined;
    let geminiApiKey: string | undefined;
    let isUsingOwnKey = false;
    let isFreeGeminiModel = false;

    try {
      const providerConfig = await getProviderConfig({
        userId,
        projectId,
        type: 'llm',
      });

      llmProvider = providerConfig.provider;
      openRouterApiKey = providerConfig.apiKey || undefined;
      llmModel = model || providerConfig.model || DEFAULT_OPENROUTER_MODEL;

      // Check if user provided their own OpenRouter key
      if (llmProvider === 'openrouter' && openRouterApiKey) {
        isUsingOwnKey = true;
      }

      console.log(`[LLM Prompt] Provider resolved via getProviderConfig: ${llmProvider}, model: ${llmModel}, projectId: ${projectId || 'none'}`);
    } catch (configError) {
      // Fallback to legacy behavior if getProviderConfig fails (e.g., no API key)
      console.log(`[LLM Prompt] getProviderConfig failed, using legacy fallback: ${configError}`);

      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId },
      });

      llmProvider = userApiKeys?.llmProvider || 'openrouter';
      openRouterApiKey = userApiKeys?.openRouterApiKey || undefined;
      llmModel = model || userApiKeys?.openRouterModel || DEFAULT_OPENROUTER_MODEL;
      modalLlmEndpoint = userApiKeys?.modalLlmEndpoint || undefined;
      geminiApiKey = userApiKeys?.geminiApiKey || process.env.GEMINI_API_KEY;

      if (llmProvider === 'openrouter' && openRouterApiKey) isUsingOwnKey = true;
      if (llmProvider === 'modal' && modalLlmEndpoint) isUsingOwnKey = true;
      if (llmProvider === 'gemini' && userApiKeys?.geminiApiKey) isUsingOwnKey = true; // Use check against DB value, not env fallback
    }

    // Check for free Gemini models override
    if (model && model.includes('/')) {
      const [providerFromModel, modelName] = model.split('/');
      // Check if it's a free Gemini model
      isFreeGeminiModel = providerFromModel === 'google' && (modelName?.includes('free') || modelName?.includes('flash'));

      if (isFreeGeminiModel) {
        // Use Gemini directly for free models
        llmProvider = 'gemini';
        console.log(`[LLM Prompt] Using Gemini directly for free model: ${model}`);
      } else if (providerFromModel === 'anthropic' || providerFromModel === 'openai' || providerFromModel === 'meta' || providerFromModel === 'deepseek') {
        // Use OpenRouter for paid models if not already set
        if (llmProvider !== 'openrouter') {
          llmProvider = 'openrouter';
          console.log(`[LLM Prompt] Overriding provider to 'openrouter' based on model: ${model}`);
        }
      }
    }

    // Determine if we should charge credits
    // Charge if: NOT using own key AND NOT using a free Gemini model
    const shouldChargeCredits = !isUsingOwnKey && !isFreeGeminiModel;

    if (shouldChargeCredits) {
      // Check credits before making API call
      const balanceCheck = await checkBalance(userId, PROMPT_ENHANCEMENT_COST);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json(
          {
            error: `Insufficient credits. Need ${PROMPT_ENHANCEMENT_COST}, have ${balanceCheck.balance}`,
            creditsRequired: PROMPT_ENHANCEMENT_COST,
            balance: balanceCheck.balance
          },
          { status: 402 }
        );
      }
    }

    // For premium/admin users without their own key, use default system key
    if (!openRouterApiKey && (isPremiumUser || isAdmin)) {
      openRouterApiKey = process.env.OPENROUTER_API_KEY;
    }

    // Get Modal endpoint if needed
    if (llmProvider === 'modal' && !modalLlmEndpoint) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId },
        select: { modalLlmEndpoint: true },
      });
      modalLlmEndpoint = userApiKeys?.modalLlmEndpoint || undefined;
      if (modalLlmEndpoint) isUsingOwnKey = true;
    }

    // Get Gemini API key if needed
    if (llmProvider === 'gemini' && !geminiApiKey) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId },
        select: { geminiApiKey: true },
      });
      geminiApiKey = userApiKeys?.geminiApiKey || process.env.GEMINI_API_KEY;
      if (userApiKeys?.geminiApiKey) isUsingOwnKey = true;
    }

    // Validate API key/endpoint for selected provider
    if (llmProvider === 'openrouter' && !openRouterApiKey) {
      return NextResponse.json(
        {
          error: 'OpenRouter API key is required. Premium users can use the default key, or add your own in Settings.',
          requireApiKey: true,
          isPremiumUser,
          isAdmin
        },
        { status: 400 }
      );
    }

    if (llmProvider === 'modal' && !modalLlmEndpoint) {
      return NextResponse.json(
        { error: 'Modal LLM endpoint is required. Please configure it in Settings.' },
        { status: 400 }
      );
    }

    let fullResponse = '';
    let providerName = llmProvider;

    console.log(`[LLM Prompt] Using provider: ${llmProvider}, Charging credits: ${shouldChargeCredits}`);

    const defaultSystemPrompt = systemPrompt || 'You are a professional film prompt engineer specializing in creating detailed prompts for animated films.';

    if (llmProvider === 'modal') {
      // Use Modal self-hosted LLM endpoint
      fullResponse = await queryModalLLM(prompt, defaultSystemPrompt, modalLlmEndpoint!);
    } else if (llmProvider === 'openrouter') {
      // Use OpenRouter API
      fullResponse = await callOpenRouter(
        openRouterApiKey!,
        defaultSystemPrompt,
        prompt,
        llmModel,
        8192
      );
    } else if (llmProvider === 'claude-sdk') {
      // Use Claude SDK/CLI
      fullResponse = await queryClaudeSDK(prompt, defaultSystemPrompt);
    } else {
      // Fallback to Gemini if available
      if (geminiApiKey) {
        fullResponse = await queryGemini(prompt, geminiApiKey);
        providerName = 'gemini';
      } else {
        return NextResponse.json(
          { error: 'No LLM provider configured. Please set up OpenRouter or Gemini in Settings.' },
          { status: 400 }
        );
      }
    }

    // Deduct credits ONLY if using system resources (and not free model)
    if (shouldChargeCredits) {
      const spendResult = await spendCredits(
        userId,
        PROMPT_ENHANCEMENT_COST,
        'prompt',
        `Master prompt enhancement via ${providerName}`,
        undefined,
        providerName as Provider
      );

      if (!spendResult.success) {
        console.error('Failed to deduct credits:', spendResult.error);
        // Still return the text since generation succeeded
      }
    }

    return NextResponse.json({
      text: fullResponse,
      provider: providerName,
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
