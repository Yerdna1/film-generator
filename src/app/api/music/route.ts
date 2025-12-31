// Unified Music Generation API Route
// Supports: PiAPI (default), Suno AI, and Modal (self-hosted ACE-Step)
//
// PiAPI: https://piapi.ai/docs/music-api/create-task
// Suno: https://docs.sunoapi.org
// Modal: Self-hosted music generation (e.g., ACE-Step)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { uploadAudioToS3, isS3Configured } from '@/lib/services/s3-upload';
import { spendCredits, COSTS, checkBalance } from '@/lib/services/credits';
import { createMusicTask, getMusicTaskStatus, PIAPI_MUSIC_COST } from '@/lib/services/piapi';
import type { Provider } from '@/lib/services/real-costs';

type MusicProvider = 'piapi' | 'suno' | 'modal';

const SUNO_API_URL = 'https://api.sunoapi.org';

export const maxDuration = 120; // Allow up to 2 minutes for music generation

interface MusicGenerationRequest {
  prompt: string;
  model?: string;
  instrumental?: boolean;
  projectId?: string;
  title?: string;
  style?: string;
  provider?: 'piapi' | 'suno' | 'modal'; // Override provider from request
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

  const realCost = 0; // Self-hosted = no API cost

  if (userId) {
    await spendCredits(userId, COSTS.MUSIC_GENERATION || 10, 'music', `Modal music generation`, projectId, 'modal', undefined, realCost);
  }

  // Upload to S3 if configured
  if (isS3Configured() && audioUrl.startsWith('data:')) {
    const uploadResult = await uploadAudioToS3(audioUrl, projectId);
    if (uploadResult.success && uploadResult.url) {
      audioUrl = uploadResult.url;
    }
  }

  return {
    audioUrl,
    cost: realCost,
    storage: audioUrl.startsWith('data:') ? 'base64' : 's3',
    status: 'complete',
    title: data.title || title,
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
  try {
    const {
      prompt,
      model = 'V4.5',
      instrumental = true,
      title,
      style,
      provider: requestProvider,
    }: MusicGenerationRequest = await request.json();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's API keys and provider preference
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId: session.user.id },
    });

    // Determine which provider to use
    const provider = requestProvider || userApiKeys?.musicProvider || 'piapi';
    const modalMusicEndpoint = userApiKeys?.modalMusicEndpoint;

    console.log(`[Music] Using provider: ${provider}`);

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
      const result = await generateWithModal(
        fullPrompt,
        instrumental,
        title,
        undefined,
        modalMusicEndpoint,
        session.user.id
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

    // Pre-check credit balance
    const balanceCheck = await checkBalance(session.user.id, COSTS.MUSIC_GENERATION);
    if (!balanceCheck.hasEnough) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: balanceCheck.required,
        balance: balanceCheck.balance,
        needsPurchase: true,
      }, { status: 402 });
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
          model,
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
    const requestProvider = searchParams.get('provider') as 'piapi' | 'suno' | null;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's API keys and provider preference
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId: session.user.id },
    });

    const provider = requestProvider || userApiKeys?.musicProvider || 'piapi';

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
        if (isS3Configured()) {
          console.log('[S3] Uploading audio to S3...');
          const uploadResult = await uploadAudioToS3(base64Audio, projectId || undefined);
          if (uploadResult.success && uploadResult.url) {
            audioUrl = uploadResult.url;
            console.log('[S3] Audio uploaded successfully');
          } else {
            console.warn('[S3] Upload failed, falling back to base64');
            audioUrl = base64Audio;
          }
        } else {
          audioUrl = base64Audio;
        }
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
        session.user.id,
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
