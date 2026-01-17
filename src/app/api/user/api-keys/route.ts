import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

/**
 * SECURITY: Mask API key for safe display in browser
 * Shows only last 4 characters to confirm key is set
 */
function maskApiKey(key: string | null): string {
  if (!key || key.length < 8) return '';
  return `${'•'.repeat(Math.min(key.length - 4, 20))}${key.slice(-4)}`;
}

// GET - Fetch user's API keys (masked for security)
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
      // Add cache headers for SWR deduplication (private, longer cache for stable data)
      return NextResponse.json(
        {
          geminiApiKey: '',
          grokApiKey: '',
          elevenLabsApiKey: '',
          claudeApiKey: '',
          openaiApiKey: '',
          nanoBananaApiKey: '',
          sunoApiKey: '',
          openRouterApiKey: '',
          openRouterModel: 'anthropic/claude-4.5-sonnet', // Default model
          piapiApiKey: '',
          kieApiKey: '', // KIE AI API key
          kieImageModel: 'seedream/4-5-text-to-image', // Default KIE image model
          kieVideoModel: 'grok-imagine/image-to-video', // Default KIE video model
          llmProvider: 'openrouter', // Default to OpenRouter
          musicProvider: 'piapi', // Default to PiAPI
          ttsProvider: 'gemini-tts', // Default to Gemini TTS
          imageProvider: 'gemini', // Default to Gemini
          videoProvider: 'kie', // Default to Kie.ai
          // Modal endpoints (empty by default)
          modalLlmEndpoint: '',
          modalTtsEndpoint: '',
          modalImageEndpoint: '',
          modalImageEditEndpoint: '',
          modalVideoEndpoint: '',
          modalMusicEndpoint: '',
          modalVectcutEndpoint: '',
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          },
        }
      );
    }

    // SECURITY: Return masked keys - only show last 4 chars to confirm key is set
    // Full keys are never sent to client to prevent XSS/extension theft
    // Add cache headers for SWR deduplication (private, longer cache for stable data)
    return NextResponse.json(
      {
        // Masked API keys (shows ••••xxxx format)
        geminiApiKey: maskApiKey(apiKeys.geminiApiKey),
        grokApiKey: maskApiKey(apiKeys.grokApiKey),
        elevenLabsApiKey: maskApiKey(apiKeys.elevenLabsApiKey),
        claudeApiKey: maskApiKey(apiKeys.claudeApiKey),
        openaiApiKey: maskApiKey(apiKeys.openaiApiKey),
        nanoBananaApiKey: maskApiKey(apiKeys.nanoBananaApiKey),
        sunoApiKey: maskApiKey(apiKeys.sunoApiKey),
        openRouterApiKey: maskApiKey(apiKeys.openRouterApiKey),
        piapiApiKey: maskApiKey(apiKeys.piapiApiKey),
        kieApiKey: maskApiKey(apiKeys.kieApiKey),
        // Boolean flags to indicate if key is set (for UI logic)
        hasGeminiKey: !!apiKeys.geminiApiKey,
        hasGrokKey: !!apiKeys.grokApiKey,
        hasElevenLabsKey: !!apiKeys.elevenLabsApiKey,
        hasClaudeKey: !!apiKeys.claudeApiKey,
        hasOpenaiKey: !!apiKeys.openaiApiKey,
        hasNanoBananaKey: !!apiKeys.nanoBananaApiKey,
        hasSunoKey: !!apiKeys.sunoApiKey,
        hasOpenRouterKey: !!apiKeys.openRouterApiKey,
        hasPiapiKey: !!apiKeys.piapiApiKey,
        hasKieKey: !!apiKeys.kieApiKey,
        // Non-sensitive settings (can be sent in full)
        openRouterModel: apiKeys.openRouterModel || 'anthropic/claude-4.5-sonnet',
        kieImageModel: apiKeys.kieImageModel || 'seedream/4-5-text-to-image',
        kieVideoModel: apiKeys.kieVideoModel || 'grok-imagine/image-to-video',
        llmProvider: apiKeys.llmProvider || 'openrouter',
        musicProvider: apiKeys.musicProvider || 'piapi',
        ttsProvider: apiKeys.ttsProvider || 'gemini-tts',
        imageProvider: apiKeys.imageProvider || 'gemini',
        videoProvider: apiKeys.videoProvider || 'kie',
        // Modal endpoints (URLs, not secrets)
        modalLlmEndpoint: apiKeys.modalLlmEndpoint || '',
        modalTtsEndpoint: apiKeys.modalTtsEndpoint || '',
        modalImageEndpoint: apiKeys.modalImageEndpoint || '',
        modalImageEditEndpoint: apiKeys.modalImageEditEndpoint || '',
        modalVideoEndpoint: apiKeys.modalVideoEndpoint || '',
        modalMusicEndpoint: apiKeys.modalMusicEndpoint || '',
        modalVectcutEndpoint: apiKeys.modalVectcutEndpoint || '',
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
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
      openRouterApiKey,
      openRouterModel,
      piapiApiKey,
      kieApiKey,
      kieImageModel,
      kieVideoModel,
      llmProvider,
      musicProvider,
      ttsProvider,
      imageProvider,
      videoProvider,
      modalLlmEndpoint,
      modalTtsEndpoint,
      modalImageEndpoint,
      modalImageEditEndpoint,
      modalVideoEndpoint,
      modalMusicEndpoint,
      modalVectcutEndpoint,
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
        ...(openRouterApiKey !== undefined && { openRouterApiKey }),
        ...(openRouterModel !== undefined && { openRouterModel }),
        ...(piapiApiKey !== undefined && { piapiApiKey }),
        ...(kieApiKey !== undefined && { kieApiKey }),
        ...(kieImageModel !== undefined && { kieImageModel }),
        ...(kieVideoModel !== undefined && { kieVideoModel }),
        ...(llmProvider !== undefined && { llmProvider }),
        ...(musicProvider !== undefined && { musicProvider }),
        ...(ttsProvider !== undefined && { ttsProvider }),
        ...(imageProvider !== undefined && { imageProvider }),
        ...(videoProvider !== undefined && { videoProvider }),
        ...(modalLlmEndpoint !== undefined && { modalLlmEndpoint }),
        ...(modalTtsEndpoint !== undefined && { modalTtsEndpoint }),
        ...(modalImageEndpoint !== undefined && { modalImageEndpoint }),
        ...(modalImageEditEndpoint !== undefined && { modalImageEditEndpoint }),
        ...(modalVideoEndpoint !== undefined && { modalVideoEndpoint }),
        ...(modalMusicEndpoint !== undefined && { modalMusicEndpoint }),
        ...(modalVectcutEndpoint !== undefined && { modalVectcutEndpoint }),
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
        openRouterApiKey: openRouterApiKey || null,
        openRouterModel: openRouterModel || 'anthropic/claude-4.5-sonnet',
        piapiApiKey: piapiApiKey || null,
        kieApiKey: kieApiKey || null,
        kieImageModel: kieImageModel || 'seedream/4-5-text-to-image',
        kieVideoModel: kieVideoModel || 'grok-imagine/image-to-video',
        llmProvider: llmProvider || 'openrouter',
        musicProvider: musicProvider || 'piapi',
        ttsProvider: ttsProvider || 'gemini-tts',
        imageProvider: imageProvider || 'gemini',
        videoProvider: videoProvider || 'kie',
        modalLlmEndpoint: modalLlmEndpoint || null,
        modalTtsEndpoint: modalTtsEndpoint || null,
        modalImageEndpoint: modalImageEndpoint || null,
        modalImageEditEndpoint: modalImageEditEndpoint || null,
        modalVideoEndpoint: modalVideoEndpoint || null,
        modalMusicEndpoint: modalMusicEndpoint || null,
        modalVectcutEndpoint: modalVectcutEndpoint || null,
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
