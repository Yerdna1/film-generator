// Unified Music Generation API Route
// Supports: PiAPI (default), Suno AI, and Modal (self-hosted ACE-Step)
//
// PiAPI: https://piapi.ai/docs/music-api/create-task
// Suno: https://docs.sunoapi.org
// Modal: Self-hosted music generation (e.g., ACE-Step)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth, isErrorResponse, requireCredits, uploadMediaToS3 } from '@/lib/api';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { createMusicTask, getMusicTaskStatus, PIAPI_MUSIC_COST } from '@/lib/services/piapi';
import { rateLimit } from '@/lib/services/rate-limit';
import type { Provider } from '@/lib/services/real-costs';
import { DEFAULT_MODEL_CONFIG, DEFAULT_MODELS } from '@/lib/constants/model-config-defaults';

type MusicProvider = 'piapi' | 'suno' | 'modal' | 'kie';

const SUNO_API_URL = 'https://api.sunoapi.org';

export const maxDuration = 120; // Allow up to 2 minutes for music generation

interface MusicGenerationRequest {
  prompt: string;
  model?: string;
  instrumental?: boolean;
  projectId?: string;
  title?: string;
  style?: string;
  provider?: 'piapi' | 'suno' | 'modal' | 'kie'; // Override provider from request
}

// Generate music using Modal (self-hosted ACE-Step or similar)
async function generateWithModal(
  prompt: string,
  instrumental: boolean,
  title: string | undefined,
  projectId: string | undefined,
  modalEndpoint: string,
  userId: string | undefined
): Promise<{ audioUrl: string; cost: number; storage: string; status: string; title?: string }> {
  console.log('[Modal] Generating music with endpoint:', modalEndpoint);

  const response = await fetch(modalEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      instrumental,
      title: title || 'Generated Music',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Modal music generation failed: ${errorText}`);
  }

  const data = await response.json();

  let audioUrl: string;
  if (data.audio) {
    audioUrl = data.audio.startsWith('data:') ? data.audio : `data:audio/wav;base64,${data.audio}`;
  } else if (data.audioUrl) {
    audioUrl = data.audioUrl;
  } else {
    throw new Error('Modal endpoint did not return audio');
  }

  const realCost = 0.03; // Modal GPU cost per music track (~$0.03 on A100)

  if (userId) {
    await spendCredits(userId, COSTS.MUSIC_GENERATION || 10, 'music', `Modal music generation`, projectId, 'modal', undefined, realCost);
  }

  // Upload to S3 if configured
  audioUrl = await uploadMediaToS3(audioUrl, 'audio', projectId);

  return {
    audioUrl,
    cost: realCost,
    storage: audioUrl.startsWith('data:') ? 'base64' : 's3',
    status: 'complete',
    title: data.title || title,
  };
}

// KIE.ai API configuration
const KIE_API_URL = 'https://api.kie.ai';

// Generate music using KIE.ai (Suno via KIE)
async function generateWithKie(
  prompt: string,
  instrumental: boolean,
  title: string | undefined,
  projectId: string | undefined,
  kieApiKey: string,
  modelId: string,
  userId: string | undefined
): Promise<{ taskId: string; status: string; message: string; projectId?: string }> {
  console.log(`[KIE] Generating music with model: ${modelId}`);

  // Query model from database to get apiModelId
  const modelConfig = await prisma.kieMusicModel.findUnique({
    where: { modelId }
  });

  if (!modelConfig || !modelConfig.isActive) {
    console.warn(`[Kie] Music model ${modelId} not found in database, using original modelId`);
  }

  // Use apiModelId for KIE.ai API call, fall back to modelId if not set
  const apiModelId = modelConfig?.apiModelId || modelId;
  console.log(`[KIE] Creating music task with model: ${modelId} (API: ${apiModelId})`);

  const requestBody = {
    model: apiModelId, // Use apiModelId for KIE.ai API call
    input: {
      prompt,
      instrumental,
      title: title || 'Generated Music',
    },
  };

  const response = await fetch(`${KIE_API_URL}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${kieApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    throw new Error(data.msg || data.message || 'Failed to create KIE music task');
  }

  return {
    taskId: data.data.taskId,
    status: 'processing',
    message: 'Music generation started. Poll for status.',
    projectId,
  };
}

// Check KIE.ai task status
async function checkKieMusicStatus(
  taskId: string,
  kieApiKey: string,
  userId: string | undefined,
  projectId: string | undefined,
  modelId: string,
  download: boolean
): Promise<{
  status: string;
  audioUrl?: string;
  externalAudioUrl?: string;
  title?: string;
  duration?: number;
  cost?: number;
  storage?: string;
}> {
  const response = await fetch(
    `${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
    {
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Accept': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    throw new Error(data.msg || data.message || 'Failed to check KIE task status');
  }

  const taskData = data.data;
  const stateMapping: Record<string, string> = {
    'waiting': 'processing',
    'queuing': 'processing',
    'generating': 'processing',
    'success': 'complete',
    'fail': 'error',
  };

  const status = stateMapping[taskData.state] || taskData.state;

  let externalAudioUrl: string | undefined;
  let audioUrl: string | undefined;
  let title: string | undefined;
  let duration: number | undefined;

  if (taskData.resultJson) {
    try {
      const result = JSON.parse(taskData.resultJson);
      externalAudioUrl = result.audioUrl || result.audio_url || result.resultUrls?.[0];
      title = result.title;
      duration = result.duration;
    } catch {
      console.error('Failed to parse KIE resultJson');
    }
  }

  if (status === 'complete' && externalAudioUrl && download) {
    const base64Audio = await downloadAudioAsBase64(externalAudioUrl);

    if (base64Audio) {
      audioUrl = await uploadMediaToS3(base64Audio, 'audio', projectId);
    } else {
      audioUrl = externalAudioUrl;
    }
  } else if (externalAudioUrl) {
    audioUrl = externalAudioUrl;
  }

  // Get model-specific cost from database
  const modelConfig = await prisma.kieMusicModel.findUnique({
    where: { modelId }
  });
  const realCost = modelConfig?.cost || 0.50; // Fallback to default

  if (status === 'complete' && userId) {
    await spendCredits(
      userId,
      COSTS.MUSIC_GENERATION || 10,
      'music',
      `KIE ${modelConfig?.name || 'Music'} generation`,
      projectId,
      'kie' as Provider,
      { model: modelId, kieCredits: modelConfig?.credits },
      realCost
    );
  }

  return {
    status,
    audioUrl,
    externalAudioUrl,
    title,
    duration,
    cost: status === 'complete' ? realCost : undefined,
    storage: audioUrl && !audioUrl.startsWith('data:') && !audioUrl.startsWith('http')
      ? 's3'
      : (audioUrl?.startsWith('data:') ? 'base64' : 'external'),
  };
}

// Helper function to download audio and convert to base64
async function downloadAudioAsBase64(audioUrl: string): Promise<string | null> {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      console.error('Failed to download audio:', response.status);
      return null;
    }

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

// POST - Create music generation task
export async function POST(request: NextRequest) {
  // SECURITY: Rate limit generation to prevent abuse (20 requests/min)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const {
      prompt,
      model: requestModel,  // Model ID from project config
      instrumental = true,
      title,
      style,
      projectId,
      provider: requestProvider,
    }: MusicGenerationRequest = await request.json();

    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    // Fetch project modelConfig if projectId is provided (single source of truth)
    let projectModelConfig = DEFAULT_MODEL_CONFIG.music;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { modelConfig: true },
      });
      if (project?.modelConfig && typeof project.modelConfig === 'object') {
        const config = project.modelConfig as any;
        if (config.music) {
          projectModelConfig = config.music;
        }
      }
    }

    // Get user's API keys (for actual API keys only, not preferences)
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId },
    });

    // Use project modelConfig or DEFAULT_MODEL_CONFIG (no fallback to userApiKeys preferences)
    const provider = requestProvider || projectModelConfig.provider;
    const modalMusicEndpoint = userApiKeys?.modalMusicEndpoint;
    const kieMusicModel = requestModel || projectModelConfig.model || DEFAULT_MODELS.kieMusicModel;

    // Track if user has their own API keys (to skip credit check)
    let userHasOwnApiKey = !!userApiKeys?.modalMusicEndpoint;

    console.log(`[Music] Using provider: ${provider}, model: ${kieMusicModel}`);

    // Handle Modal provider first (doesn't require API key)
    if (provider === 'modal') {
      if (!modalMusicEndpoint) {
        return NextResponse.json(
          { error: 'Modal music endpoint not configured. Please add your endpoint URL in Settings.' },
          { status: 400 }
        );
      }

      // Build the full prompt with style if provided
      const fullPrompt = style ? `${style}: ${prompt}` : prompt;

      // Modal returns audio directly (synchronous)
      // Skip credit deduction if user has their own endpoint
      const effectiveUserId = userHasOwnApiKey ? undefined : userId;
      const result = await generateWithModal(
        fullPrompt,
        instrumental,
        title,
        undefined,
        modalMusicEndpoint,
        effectiveUserId
      );
      return NextResponse.json(result);
    }

    // Handle KIE provider
    if (provider === 'kie') {
      const kieApiKey = userApiKeys?.kieApiKey;
      if (!kieApiKey) {
        return NextResponse.json(
          { error: 'KIE.ai API key not configured. Please add your API key in Settings.' },
          { status: 400 }
        );
      }

      userHasOwnApiKey = true; // User has their own KIE API key

      // Use the kieMusicModel (from request or user settings)
      const modelId = kieMusicModel;

      // Pre-check credit balance (skip if user has own API key)
      if (!userHasOwnApiKey) {
        const insufficientCredits = await requireCredits(userId, COSTS.MUSIC_GENERATION);
        if (insufficientCredits) return insufficientCredits;
      } else {
        console.log('[Music] User has own KIE API key - skipping credit check and deduction');
      }

      if (!prompt) {
        return NextResponse.json(
          { error: 'Music prompt is required' },
          { status: 400 }
        );
      }

      // Build the full prompt with style if provided
      const fullPrompt = style ? `${style}: ${prompt}` : prompt;

      // KIE returns task ID (asynchronous) - pass undefined userId to skip credit deduction
      const result = await generateWithKie(
        fullPrompt,
        instrumental,
        title,
        request.headers.get('x-project-id') || undefined,
        kieApiKey,
        modelId,
        userHasOwnApiKey ? undefined : userId // Skip credit deduction if user has own API key
      );
      return NextResponse.json(result);
    }

    // Get appropriate API key for PiAPI or Suno
    let apiKey: string | null = null;
    if (provider === 'piapi') {
      apiKey = userApiKeys?.piapiApiKey || process.env.PIAPI_API_KEY || null;
    } else {
      apiKey = userApiKeys?.sunoApiKey || process.env.SUNO_API_KEY || null;
    }

    if (!apiKey) {
      const providerName = provider === 'piapi' ? 'PiAPI' : 'Suno';
      return NextResponse.json(
        { error: `${providerName} API key not configured. Please add your API key in Settings.` },
        { status: 400 }
      );
    }

    // Check if user has their own API key (not using platform default)
    const isUsingOwnKey = !!(userApiKeys?.piapiApiKey && provider === 'piapi') ||
                         !!(userApiKeys?.sunoApiKey && provider === 'suno');

    if (isUsingOwnKey) {
      userHasOwnApiKey = true;
      console.log('[Music] User has own API key - skipping credit check and deduction');
    }

    // Pre-check credit balance (skip if user has own API key)
    if (!userHasOwnApiKey) {
      const insufficientCredits = await requireCredits(userId, COSTS.MUSIC_GENERATION);
      if (insufficientCredits) return insufficientCredits;
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Music prompt is required' },
        { status: 400 }
      );
    }

    // Build the full prompt with style if provided
    const fullPrompt = style ? `${style}: ${prompt}` : prompt;

    let taskId: string;

    if (provider === 'piapi') {
      // Use PiAPI
      const result = await createMusicTask(apiKey, {
        prompt: fullPrompt,
        title: title || 'Generated Music',
        lyricsType: instrumental ? 'instrumental' : 'generate',
      });
      taskId = result.taskId;
    } else {
      // Use Suno API
      const response = await fetch(`${SUNO_API_URL}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          customMode: false,
          instrumental,
          ...(title && { title }),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.code !== 200) {
        console.error('Suno API error:', data);
        return NextResponse.json(
          { error: data.msg || data.message || 'Failed to generate music' },
          { status: response.status }
        );
      }

      taskId = data.data?.taskId || data.data?.id;
    }

    return NextResponse.json({
      taskId,
      provider,
      status: 'processing',
      message: 'Music generation started. Poll for status.',
    });
  } catch (error) {
    console.error('Music generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Check music generation status and download audio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const download = searchParams.get('download') !== 'false';
    const requestProvider = searchParams.get('provider') as 'piapi' | 'suno' | 'kie' | null;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    // Fetch project modelConfig if projectId is provided (single source of truth)
    let projectModelConfig = DEFAULT_MODEL_CONFIG.music;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { modelConfig: true },
      });
      if (project?.modelConfig && typeof project.modelConfig === 'object') {
        const config = project.modelConfig as any;
        if (config.music) {
          projectModelConfig = config.music;
        }
      }
    }

    // Get user's API keys (for actual API keys only, not preferences)
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId },
    });

    // Use project modelConfig or DEFAULT_MODEL_CONFIG (no fallback to userApiKeys preferences)
    const provider = requestProvider || projectModelConfig.provider;

    // Handle KIE provider
    if (provider === 'kie') {
      const kieApiKey = userApiKeys?.kieApiKey;
      if (!kieApiKey) {
        return NextResponse.json(
          { error: 'KIE.ai API key not configured' },
          { status: 500 }
        );
      }

      // Use the model from query string or project config
      const modelId = searchParams.get('model') || projectModelConfig.model || DEFAULT_MODELS.kieMusicModel;

      const result = await checkKieMusicStatus(
        taskId,
        kieApiKey,
        userId,
        projectId || undefined,
        modelId,
        download
      );

      return NextResponse.json({
        taskId,
        provider,
        ...result,
      });
    }

    let apiKey: string | null = null;
    if (provider === 'piapi') {
      apiKey = userApiKeys?.piapiApiKey || process.env.PIAPI_API_KEY || null;
    } else {
      apiKey = userApiKeys?.sunoApiKey || process.env.SUNO_API_KEY || null;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    let status: string;
    let audioUrl: string | undefined;
    let externalAudioUrl: string | undefined;
    let title: string | undefined;
    let duration: number | undefined;

    if (provider === 'piapi') {
      // Use PiAPI to check status
      const result = await getMusicTaskStatus(apiKey, taskId);

      status = result.status === 'completed' ? 'complete' :
               result.status === 'failed' ? 'error' : 'processing';
      externalAudioUrl = result.audioUrl;
      title = result.title;
      duration = result.duration;

      if (result.error) {
        return NextResponse.json({
          taskId,
          provider,
          status: 'error',
          error: result.error,
        });
      }
    } else {
      // Use Suno API
      const response = await fetch(
        `${SUNO_API_URL}/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.code !== 200) {
        return NextResponse.json(
          { error: data.msg || data.message || 'Failed to check status' },
          { status: response.status }
        );
      }

      const taskData = data.data;

      // Map Suno states to our states
      const stateMapping: Record<string, string> = {
        'waiting': 'processing',
        'queuing': 'processing',
        'pending': 'processing',
        'generating': 'processing',
        'success': 'complete',
        'completed': 'complete',
        'fail': 'error',
        'failed': 'error',
      };

      const rawStatus = taskData.status || taskData.state || 'processing';
      status = stateMapping[rawStatus.toLowerCase()] || rawStatus;

      // Extract audio URL and metadata
      if (taskData.audioUrl || taskData.audio_url) {
        externalAudioUrl = taskData.audioUrl || taskData.audio_url;
      }
      if (taskData.songs && taskData.songs.length > 0) {
        const song = taskData.songs[0];
        externalAudioUrl = song.audioUrl || song.audio_url;
        title = song.title;
        duration = song.duration;
      }
      if (taskData.result) {
        externalAudioUrl = taskData.result.audioUrl || taskData.result.audio_url || externalAudioUrl;
        title = taskData.result.title || title;
        duration = taskData.result.duration || duration;
      }
    }

    // If complete and download is enabled, download and process audio
    if (status === 'complete' && externalAudioUrl && download) {
      console.log('Downloading audio from:', externalAudioUrl);
      const base64Audio = await downloadAudioAsBase64(externalAudioUrl);

      if (base64Audio) {
        audioUrl = await uploadMediaToS3(base64Audio, 'audio', projectId || undefined);
      } else {
        audioUrl = externalAudioUrl;
        console.warn('Failed to download audio, using external URL');
      }
    } else if (externalAudioUrl) {
      audioUrl = externalAudioUrl;
    }

    // Track cost when complete
    const realCost = provider === 'piapi' ? PIAPI_MUSIC_COST : 0.05;
    if (status === 'complete') {
      await spendCredits(
        userId,
        COSTS.MUSIC_GENERATION || 10,
        'music',
        `${provider === 'piapi' ? 'PiAPI' : 'Suno'} music generation`,
        projectId || undefined,
        provider as Provider
      );
    }

    return NextResponse.json({
      taskId,
      provider,
      status,
      audioUrl,
      externalAudioUrl,
      title,
      duration,
      cost: status === 'complete' ? realCost : undefined,
      storage: audioUrl && !audioUrl.startsWith('data:') && !audioUrl.startsWith('http')
        ? 's3'
        : (audioUrl?.startsWith('data:') ? 'base64' : 'external'),
    });
  } catch (error) {
    console.error('Music status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
