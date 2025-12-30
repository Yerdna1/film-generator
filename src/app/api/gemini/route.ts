// Gemini API Route - Text Generation
// Server-side API calls for secure API key handling

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'gemini-1.5-pro' } = await request.json();

    // Get API key from user's database settings or fallback to env
    let apiKey = process.env.GEMINI_API_KEY;

    const session = await auth();
    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      if (userApiKeys?.geminiApiKey) {
        apiKey = userApiKeys.geminiApiKey;
      }
    }

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

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Gemini route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
