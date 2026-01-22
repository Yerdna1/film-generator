// Gemini API Route - Text Generation
// Server-side API calls for secure API key handling

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, checkBalance, COSTS } from '@/lib/services/credits';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Cost for prompt enhancement (using scene generation cost as baseline)
const PROMPT_ENHANCEMENT_COST = COSTS.SCENE_GENERATION;

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'gemini-2.0-flash', skipCreditCheck = false } = await request.json();

    // Get session and check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check credits before making API call (unless explicitly skipped for free operations)
    if (!skipCreditCheck) {
      const balanceCheck = await checkBalance(userId, PROMPT_ENHANCEMENT_COST);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json(
          {
            error: `Insufficient credits. Need ${PROMPT_ENHANCEMENT_COST}, have ${balanceCheck.balance}`,
            creditsRequired: PROMPT_ENHANCEMENT_COST,
            balance: balanceCheck.balance
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // Get API key from user's database settings only
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId },
    });

    const apiKey = userApiKeys?.geminiApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add your API key in Settings.' },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
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
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to generate text' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'No text generated' },
        { status: 500 }
      );
    }

    // Deduct credits after successful generation (unless skipped)
    if (!skipCreditCheck) {
      const spendResult = await spendCredits(
        userId,
        PROMPT_ENHANCEMENT_COST,
        'prompt',
        'Master prompt enhancement via Gemini',
        undefined, // no project ID for general prompts
        'gemini'
      );

      if (!spendResult.success) {
        console.error('Failed to deduct credits:', spendResult.error);
        // Still return the text since generation succeeded
      }
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Gemini route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
