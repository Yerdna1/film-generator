import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

// GET - Fetch user's API keys
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiKeys = await prisma.apiKeys.findUnique({
      where: { userId: session.user.id },
    });

    if (!apiKeys) {
      return NextResponse.json({
        geminiApiKey: '',
        grokApiKey: '',
        elevenLabsApiKey: '',
        claudeApiKey: '',
        openaiApiKey: '',
        nanoBananaApiKey: '',
        sunoApiKey: '',
      });
    }

    // Return keys (masked for display, full for internal use)
    return NextResponse.json({
      geminiApiKey: apiKeys.geminiApiKey || '',
      grokApiKey: apiKeys.grokApiKey || '',
      elevenLabsApiKey: apiKeys.elevenLabsApiKey || '',
      claudeApiKey: apiKeys.claudeApiKey || '',
      openaiApiKey: apiKeys.openaiApiKey || '',
      nanoBananaApiKey: apiKeys.nanoBananaApiKey || '',
      sunoApiKey: apiKeys.sunoApiKey || '',
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST - Save user's API keys
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      geminiApiKey,
      grokApiKey,
      elevenLabsApiKey,
      claudeApiKey,
      openaiApiKey,
      nanoBananaApiKey,
      sunoApiKey,
    } = body;

    const apiKeys = await prisma.apiKeys.upsert({
      where: { userId: session.user.id },
      update: {
        ...(geminiApiKey !== undefined && { geminiApiKey }),
        ...(grokApiKey !== undefined && { grokApiKey }),
        ...(elevenLabsApiKey !== undefined && { elevenLabsApiKey }),
        ...(claudeApiKey !== undefined && { claudeApiKey }),
        ...(openaiApiKey !== undefined && { openaiApiKey }),
        ...(nanoBananaApiKey !== undefined && { nanoBananaApiKey }),
        ...(sunoApiKey !== undefined && { sunoApiKey }),
      },
      create: {
        userId: session.user.id,
        geminiApiKey: geminiApiKey || null,
        grokApiKey: grokApiKey || null,
        elevenLabsApiKey: elevenLabsApiKey || null,
        claudeApiKey: claudeApiKey || null,
        openaiApiKey: openaiApiKey || null,
        nanoBananaApiKey: nanoBananaApiKey || null,
        sunoApiKey: sunoApiKey || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'API keys saved successfully',
    });
  } catch (error) {
    console.error('Error saving API keys:', error);
    return NextResponse.json(
      { error: 'Failed to save API keys' },
      { status: 500 }
    );
  }
}
