import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { DEFAULT_MODELS } from '@/lib/constants/default-models';

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
      const defaultApiKeys = {
        id: `apikeys_${session.user.id}`,
        userId: session.user.id,
        geminiApiKey: '',
        grokApiKey: '',
        elevenLabsApiKey: '',
        claudeApiKey: '',
        openaiApiKey: '',
        nanoBananaApiKey: '',
        sunoApiKey: '',
        openRouterApiKey: '',
        openRouterModel: 'anthropic/claude-4.5-sonnet',
        piapiApiKey: '',
        kieApiKey: '',
        resendApiKey: '',
        kieLlmModel: DEFAULT_MODELS.kieLlmModel,
        kieImageModel: DEFAULT_MODELS.kieImageModel,
        kieVideoModel: DEFAULT_MODELS.kieVideoModel,
        kieTtsModel: DEFAULT_MODELS.kieTtsModel,
        kieMusicModel: DEFAULT_MODELS.kieMusicModel,
        llmProvider: 'kie',
        musicProvider: 'piapi',
        ttsProvider: 'gemini-tts',
        imageProvider: 'gemini',
        videoProvider: 'kie',
        modalLlmEndpoint: '',
        modalTtsEndpoint: '',
        modalImageEndpoint: '',
        modalImageEditEndpoint: '',
        modalVideoEndpoint: '',
        modalMusicEndpoint: '',
        modalVectcutEndpoint: '',
        preferOwnKeys: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return NextResponse.json(
        {
          ...defaultApiKeys,
          // Boolean flags for UI logic
          hasGeminiKey: false,
          hasGrokKey: false,
          hasElevenLabsKey: false,
          hasClaudeKey: false,
          hasOpenAIKey: false,
          hasNanoBananaKey: false,
          hasSunoKey: false,
          hasOpenRouterKey: false,
          hasPiApiKey: false,
          hasKieKey: false,
          hasResendKey: false,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          },
        }
      );
    }

    // Return API keys data for the context
    // This endpoint is used by the ApiKeysContext, not directly by UI components
    // Add cache headers for SWR deduplication (private, longer cache for stable data)
    return NextResponse.json(
      {
        // Flatten the structure - return all apiKeys properties at top level
        id: apiKeys.id,
        userId: apiKeys.userId,
        geminiApiKey: apiKeys.geminiApiKey || '',
        grokApiKey: apiKeys.grokApiKey || '',
        elevenLabsApiKey: apiKeys.elevenLabsApiKey || '',
        claudeApiKey: apiKeys.claudeApiKey || '',
        openaiApiKey: apiKeys.openaiApiKey || '',
        nanoBananaApiKey: apiKeys.nanoBananaApiKey || '',
        sunoApiKey: apiKeys.sunoApiKey || '',
        openRouterApiKey: apiKeys.openRouterApiKey || '',
        piapiApiKey: apiKeys.piapiApiKey || '',
        kieApiKey: apiKeys.kieApiKey || '',
        resendApiKey: apiKeys.resendApiKey || '',
        openRouterModel: apiKeys.openRouterModel || 'anthropic/claude-4.5-sonnet',
        kieLlmModel: apiKeys.kieLlmModel || DEFAULT_MODELS.kieLlmModel,
        kieImageModel: apiKeys.kieImageModel || DEFAULT_MODELS.kieImageModel,
        kieVideoModel: apiKeys.kieVideoModel || DEFAULT_MODELS.kieVideoModel,
        kieTtsModel: apiKeys.kieTtsModel || DEFAULT_MODELS.kieTtsModel,
        kieMusicModel: apiKeys.kieMusicModel || DEFAULT_MODELS.kieMusicModel,
        llmProvider: apiKeys.llmProvider || 'kie',
        musicProvider: apiKeys.musicProvider || 'piapi',
        ttsProvider: apiKeys.ttsProvider || 'gemini-tts',
        imageProvider: apiKeys.imageProvider || 'gemini',
        videoProvider: apiKeys.videoProvider || 'kie',
        modalLlmEndpoint: apiKeys.modalLlmEndpoint || '',
        modalTtsEndpoint: apiKeys.modalTtsEndpoint || '',
        modalImageEndpoint: apiKeys.modalImageEndpoint || '',
        modalImageEditEndpoint: apiKeys.modalImageEditEndpoint || '',
        modalVideoEndpoint: apiKeys.modalVideoEndpoint || '',
        modalMusicEndpoint: apiKeys.modalMusicEndpoint || '',
        modalVectcutEndpoint: apiKeys.modalVectcutEndpoint || '',
        preferOwnKeys: apiKeys.preferOwnKeys ?? false,
        // Boolean flags to indicate if key is set (for UI logic)
        hasGeminiKey: !!apiKeys.geminiApiKey,
        hasGrokKey: !!apiKeys.grokApiKey,
        hasElevenLabsKey: !!apiKeys.elevenLabsApiKey,
        hasClaudeKey: !!apiKeys.claudeApiKey,
        hasOpenAIKey: !!apiKeys.openaiApiKey,
        hasNanoBananaKey: !!apiKeys.nanoBananaApiKey,
        hasSunoKey: !!apiKeys.sunoApiKey,
        hasOpenRouterKey: !!apiKeys.openRouterApiKey,
        hasPiApiKey: !!apiKeys.piapiApiKey,
        hasKieKey: !!apiKeys.kieApiKey,
        hasResendKey: !!apiKeys.resendApiKey,
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
      kieLlmModel,
      piapiApiKey,
      kieApiKey,
      resendApiKey,
      kieImageModel,
      kieVideoModel,
      kieTtsModel,
      kieMusicModel,
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
      preferOwnKeys,
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
        ...(kieLlmModel !== undefined && { kieLlmModel }),
        ...(piapiApiKey !== undefined && { piapiApiKey }),
        ...(kieApiKey !== undefined && { kieApiKey }),
        ...(resendApiKey !== undefined && { resendApiKey }),
        ...(kieImageModel !== undefined && { kieImageModel }),
        ...(kieVideoModel !== undefined && { kieVideoModel }),
        ...(kieTtsModel !== undefined && { kieTtsModel }),
        ...(kieMusicModel !== undefined && { kieMusicModel }),
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
        ...(preferOwnKeys !== undefined && { preferOwnKeys }),
      },
      create: {
        id: `apikeys_${session.user.id}`,
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
        kieLlmModel: kieLlmModel || DEFAULT_MODELS.kieLlmModel,
        piapiApiKey: piapiApiKey || null,
        kieApiKey: kieApiKey || null,
        resendApiKey: resendApiKey || null,
        kieImageModel: kieImageModel || DEFAULT_MODELS.kieImageModel,
        kieVideoModel: kieVideoModel || DEFAULT_MODELS.kieVideoModel,
        kieTtsModel: kieTtsModel || DEFAULT_MODELS.kieTtsModel,
        kieMusicModel: kieMusicModel || DEFAULT_MODELS.kieMusicModel,
        llmProvider: llmProvider || 'kie',
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
        preferOwnKeys: preferOwnKeys ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'API keys saved successfully',
      apiKeys: {
        ...apiKeys,
        // Ensure consistent response format
        geminiApiKey: apiKeys.geminiApiKey || '',
        grokApiKey: apiKeys.grokApiKey || '',
        elevenLabsApiKey: apiKeys.elevenLabsApiKey || '',
        claudeApiKey: apiKeys.claudeApiKey || '',
        openaiApiKey: apiKeys.openaiApiKey || '',
        nanoBananaApiKey: apiKeys.nanoBananaApiKey || '',
        sunoApiKey: apiKeys.sunoApiKey || '',
        openRouterApiKey: apiKeys.openRouterApiKey || '',
        openRouterModel: apiKeys.openRouterModel || 'anthropic/claude-4.5-sonnet',
        piapiApiKey: apiKeys.piapiApiKey || '',
        kieApiKey: apiKeys.kieApiKey || '',
        resendApiKey: apiKeys.resendApiKey || '',
        preferOwnKeys: apiKeys.preferOwnKeys ?? false,
      },
    });
  } catch (error) {
    console.error('Error saving API keys:', error);
    // Return more detailed error in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        {
          error: 'Failed to save API keys',
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to save API keys' },
      { status: 500 }
    );
  }
}
