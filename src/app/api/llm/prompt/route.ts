// Unified LLM API Route for Master Prompt Enhancement
// Uses user's configured LLM provider (OpenRouter, Claude SDK, Modal, or Gemini)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, checkBalance, COSTS } from '@/lib/services/credits';
import { callOpenRouter, DEFAULT_OPENROUTER_MODEL } from '@/lib/services/openrouter';
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
    const { prompt, systemPrompt = '', model } = await request.json();

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

    // Fetch user's API keys and LLM provider preference
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId },
    });

    // Default to OpenRouter if no preference set
    const llmProvider = userApiKeys?.llmProvider || 'openrouter';
    const openRouterApiKey = userApiKeys?.openRouterApiKey || process.env.OPENROUTER_API_KEY;
    // Use model from request if provided, otherwise use user's default
    const openRouterModel = model || userApiKeys?.openRouterModel || DEFAULT_OPENROUTER_MODEL;
    const modalLlmEndpoint = userApiKeys?.modalLlmEndpoint;
    const geminiApiKey = userApiKeys?.geminiApiKey || process.env.GEMINI_API_KEY;

    // Validate API key/endpoint for selected provider
    if (llmProvider === 'openrouter' && !openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is required. Please configure it in Settings.' },
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

    console.log(`[LLM Prompt] Using provider: ${llmProvider}`);

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
        openRouterModel,
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

    // Deduct credits after successful generation
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

    return NextResponse.json({
      text: fullResponse,
      provider: providerName,
      creditsUsed: PROMPT_ENHANCEMENT_COST,
    });
  } catch (error) {
    console.error('LLM prompt route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
