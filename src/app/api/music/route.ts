// Unified Music Generation API Route using centralized API wrapper
// All provider configurations come from Settings (single source of truth)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth, isErrorResponse, requireCredits, uploadMediaToS3 } from '@/lib/api';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { rateLimit } from '@/lib/services/rate-limit';
import { callExternalApi, pollKieTask } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import { createMusicTask, getMusicTaskStatus, PIAPI_MUSIC_COST } from '@/lib/services/piapi';
import type { Provider } from '@/lib/services/real-costs';

type MusicProvider = 'piapi' | 'suno' | 'modal' | 'kie';

export const maxDuration = 120; // Allow up to 2 minutes for music generation

interface MusicGenerationRequest {
  prompt: string;
  model?: string;
  instrumental?: boolean;
  projectId?: string;
  title?: string;
  style?: string;
  provider?: MusicProvider;
}

// Helper function to download audio and convert to base64
async function downloadAudioAsBase64(audioUrl: string): Promise<string | null> {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'audio/mpeg';

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error downloading audio:', error);
    return null;
  }
}

// Generate music using centralized API wrapper
async function generateWithWrapper(
  userId: string,
  projectId: string | undefined,
  provider: string,
  prompt: string,
  instrumental: boolean,
  title: string | undefined,
  model?: string,
  endpoint?: string
): Promise<{ audioUrl?: string; cost: number; status: string; title?: string; taskId?: string }> {
  console.log(`[${provider}] Generating music with wrapper`);

  // Build request body based on provider
  let requestBody: any;
  let modelConfig: Awaited<ReturnType<typeof prisma.kieMusicModel.findUnique>> | null = null;

  switch (provider) {
    case 'modal':
      requestBody = {
        prompt,
        instrumental,
        title: title || 'Generated Music',
      };
      break;

    case 'kie':
      // Get model from config
      const config = await getProviderConfig({
        userId,
        projectId,
        type: 'music'
      });

      // Query model from database
      modelConfig = await prisma.kieMusicModel.findUnique({
        where: { modelId: config.model || model || 'suno/v3-music' }
      });

      if (!modelConfig || !modelConfig.isActive) {
        console.warn(`[KIE] Music model ${config.model} not found in database, using original modelId`);
      }

      const apiModelId = modelConfig?.apiModelId || config.model || model || 'suno/v3-music';

      requestBody = {
        model: apiModelId,
        input: {
          prompt,
          instrumental,
          title: title || 'Generated Music',
        },
      };
      break;

    case 'suno':
      requestBody = {
        prompt,
        mv: 'chirp-v3-5',
        instrumental,
        title: title || 'Generated Music',
      };
      break;

    case 'piapi':
      // PiAPI has its own implementation, handled separately
      return {
        audioUrl: undefined,
        cost: PIAPI_MUSIC_COST,
        status: 'use_piapi',
        title,
      };

    default:
      throw new Error(`Unsupported music provider: ${provider}`);
  }

  // Make the API call using wrapper
  const response = await callExternalApi({
    userId,
    projectId,
    type: 'music',
    body: requestBody,
    endpoint,
    showLoadingMessage: true,
    loadingMessage: `Generating music using ${provider}...`,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  let audioUrl: string | undefined;
  let realCost: number;
  let taskId: string | undefined;
  let status = 'complete';

  // Handle response based on provider
  switch (provider) {
    case 'modal':
      if (response.data.audio) {
        audioUrl = response.data.audio.startsWith('data:')
          ? response.data.audio
          : `data:audio/wav;base64,${response.data.audio}`;
      } else if (response.data.audioUrl) {
        audioUrl = response.data.audioUrl;
      }

      if (!audioUrl) {
        throw new Error('Modal did not return audio');
      }

      realCost = 0.03; // Modal GPU cost
      break;

    case 'kie':
      // Get task ID for polling
      taskId = response.data?.data?.taskId;
      if (!taskId) {
        throw new Error('KIE AI did not return a task ID');
      }

      status = 'processing';
      realCost = modelConfig?.cost || 0.50;
      break;

    case 'suno':
      // Suno returns clips array
      if (response.data.clips && response.data.clips.length > 0) {
        const clip = response.data.clips[0];
        audioUrl = clip.audio_url;
        title = clip.title || title;
      }

      if (!audioUrl) {
        throw new Error('Suno did not return audio');
      }

      realCost = 0.40; // Suno cost estimate
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  // Upload to S3 if we have audio
  if (audioUrl) {
    // Download if it's a URL
    if (audioUrl.startsWith('http')) {
      const base64Audio = await downloadAudioAsBase64(audioUrl);
      if (base64Audio) {
        audioUrl = base64Audio;
      }
    }

    audioUrl = await uploadMediaToS3(audioUrl, 'audio', projectId);
  }

  // Track costs
  if (status === 'complete') {
    await spendCredits(
      userId,
      COSTS.MUSIC_GENERATION || 10,
      'music',
      `${provider} music generation`,
      projectId,
      provider as Provider,
      undefined,
      realCost
    );
  }

  return {
    audioUrl,
    cost: realCost,
    status,
    title,
    taskId,
  };
}

// POST - Create music generation task
export async function POST(request: NextRequest) {
  // SECURITY: Rate limit generation to prevent abuse (10 requests/min)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const {
      prompt,
      model,
      instrumental = true,
      projectId,
      title,
      style,
      provider: requestProvider
    }: MusicGenerationRequest = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const authResponse = await requireAuth();
    if (isErrorResponse(authResponse)) return authResponse;
    const { userId } = authResponse;

    // Get provider configuration - single source of truth
    const config = await getProviderConfig({
      userId,
      projectId,
      type: 'music',
      requestProvider: requestProvider || undefined,
    });

    const musicProvider = config.provider as MusicProvider;
    const userHasOwnApiKey = config.userHasOwnApiKey;

    // Check credits if not using own API key
    if (!userHasOwnApiKey) {
      const insufficientCredits = await requireCredits(userId, COSTS.MUSIC_GENERATION || 10);
      if (insufficientCredits) return insufficientCredits;
    }

    console.log(`[Music] Using provider: ${musicProvider}, model: ${config.model}`);

    // Handle PiAPI separately (has its own implementation)
    if (musicProvider === 'piapi') {
      // Validate PiAPI key
      if (!config.apiKey) {
        return NextResponse.json(
          { error: 'PiAPI key not configured. Please add your API key in Settings.' },
          { status: 400 }
        );
      }

      const taskId = await createMusicTask(config.apiKey, {
        prompt,
        title,
        lyricsType: instrumental ? 'instrumental' : undefined,
      });

      // Spend credits immediately for PiAPI
      await spendCredits(
        userId,
        COSTS.MUSIC_GENERATION || 10,
        'music',
        'PiAPI music generation',
        projectId,
        'piapi',
        undefined,
        PIAPI_MUSIC_COST
      );

      return NextResponse.json({
        taskId,
        provider: 'piapi',
        status: 'processing',
        message: 'Music generation started. Poll for status.'
      });
    }

    // Use wrapper for other providers
    const result = await generateWithWrapper(
      userId,
      projectId,
      musicProvider,
      prompt,
      instrumental,
      title,
      model,
      config.endpoint // For modal endpoints
    );

    // Special handling for use_piapi status
    if (result.status === 'use_piapi') {
      // This shouldn't happen since we handle piapi above
      throw new Error('Unexpected PiAPI routing');
    }

    return NextResponse.json({
      ...result,
      provider: musicProvider,
      message: result.status === 'processing'
        ? 'Music generation started. Poll for status.'
        : 'Music generation completed',
    });

  } catch (error) {
    console.error('Music generation error:', error);

    let errorMessage = 'Unknown error occurred during music generation';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('rate') || error.message.includes('quota')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Try again later.';
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET - Check music generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const provider = searchParams.get('provider') as MusicProvider;

    if (!taskId || !provider) {
      return NextResponse.json(
        { error: 'Task ID and provider are required' },
        { status: 400 }
      );
    }

    const authResponse = await requireAuth();
    if (isErrorResponse(authResponse)) return authResponse;
    const { userId } = authResponse;

    if (provider === 'piapi') {
      // Check PiAPI status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { apiKeys: true },
      });

      const piapiKey = user?.apiKeys?.piapiApiKey || process.env.PIAPI_API_KEY;
      if (!piapiKey) {
        return NextResponse.json(
          { error: 'PiAPI key not configured' },
          { status: 400 }
        );
      }

      const status = await getMusicTaskStatus(piapiKey, taskId);
      return NextResponse.json(status);
    }

    if (provider === 'kie') {
      // Get provider configuration to get API key
      const config = await getProviderConfig({
        userId,
        type: 'music',
      });

      if (!config.apiKey) {
        return NextResponse.json({ error: 'KIE API key not configured' }, { status: 400 });
      }

      // Poll for task status
      const taskData = await pollKieTask(taskId, config.apiKey, 1); // Single poll

      // Extract audio URL
      let audioUrl: string | undefined;
      let title: string | undefined;

      if (taskData.resultJson) {
        try {
          const result = typeof taskData.resultJson === 'string'
            ? JSON.parse(taskData.resultJson)
            : taskData.resultJson;

          // Try various possible fields
          audioUrl = result.audioUrl || result.audio_url || result.resultUrl;
          if (!audioUrl && result.resultUrls?.length > 0) {
            audioUrl = result.resultUrls[0];
          }
          title = result.title;
        } catch {
          console.error('Failed to parse resultJson');
        }
      }

      const status = taskData.state === 'success' ? 'complete' :
                    taskData.state === 'fail' ? 'error' : 'processing';

      if (status === 'complete' && audioUrl) {
        // Download and upload to S3
        if (audioUrl.startsWith('http')) {
          const base64Audio = await downloadAudioAsBase64(audioUrl);
          if (base64Audio) {
            audioUrl = await uploadMediaToS3(base64Audio, 'audio');
          }
        }

        // Get model cost and spend credits
        const modelId = searchParams.get('model') || 'suno/v3-music';
        const modelInfo = await prisma.kieMusicModel.findUnique({ where: { modelId } });
        const realCost = modelInfo?.cost || 0.50;

        await spendCredits(
          userId,
          COSTS.MUSIC_GENERATION || 10,
          'music',
          `KIE music generation`,
          undefined,
          'kie',
          undefined,
          realCost
        );
      }

      return NextResponse.json({
        status,
        audioUrl,
        title,
        message: taskData.failMsg || taskData.fail_reason,
      });
    }

    return NextResponse.json(
      { error: 'Unsupported provider for status check' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}