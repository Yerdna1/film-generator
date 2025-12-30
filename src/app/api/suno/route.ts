// Suno.ai API Route - Music Generation via sunoapi.org
// API Docs: https://docs.sunoapi.org
//
// Features:
// - Generate AI music from text prompts
// - Multiple models: V4, V4.5, V5
// - Instrumental mode for background music
// - Up to 4 minutes of music (V4) or 8 minutes (V4.5+)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { uploadAudioToS3, isS3Configured } from '@/lib/services/s3-upload';
import { spendCredits, COSTS, checkBalance } from '@/lib/services/credits';

const SUNO_API_URL = 'https://api.sunoapi.org';

export const maxDuration = 120; // Allow up to 2 minutes for music generation

interface MusicGenerationRequest {
  prompt: string;
  model?: 'V4' | 'V4.5' | 'V4.5ALL' | 'V4.5PLUS' | 'V5';
  instrumental?: boolean;
  projectId?: string;
  title?: string;
  style?: string;
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

    // Detect content type from response or default to mp3
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
    }: MusicGenerationRequest = await request.json();

    // Get API key from user's database settings or fallback to env
    let apiKey = process.env.SUNO_API_KEY;

    const session = await auth();
    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      if (userApiKeys?.sunoApiKey) {
        apiKey = userApiKeys.sunoApiKey;
      }

      // Pre-check credit balance before starting generation
      const balanceCheck = await checkBalance(session.user.id, COSTS.MUSIC_GENERATION);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json({
          error: 'Insufficient credits',
          required: balanceCheck.required,
          balance: balanceCheck.balance,
          needsPurchase: true,
        }, { status: 402 });
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Suno API key not configured. Please add your API key in Settings or get one from sunoapi.org' },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Music prompt is required' },
        { status: 400 }
      );
    }

    // Build the full prompt with style if provided
    const fullPrompt = style ? `${style}: ${prompt}` : prompt;

    // Call Suno API to generate music
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

    // Return task ID for polling
    return NextResponse.json({
      taskId: data.data?.taskId || data.data?.id,
      status: 'processing',
      message: 'Music generation started. Poll for status.',
    });
  } catch (error) {
    console.error('Suno route error:', error);
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

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get API key
    let apiKey = process.env.SUNO_API_KEY;

    const session = await auth();
    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      if (userApiKeys?.sunoApiKey) {
        apiKey = userApiKeys.sunoApiKey;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Suno API key not configured' },
        { status: 500 }
      );
    }

    // Poll status from Suno API
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
    const status = stateMapping[rawStatus.toLowerCase()] || rawStatus;

    let audioUrl: string | undefined;
    let externalAudioUrl: string | undefined;
    let title: string | undefined;
    let duration: number | undefined;

    // Extract audio URL and metadata from response
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

    // If complete and download is enabled, download and process audio
    if (status === 'complete' && externalAudioUrl && download) {
      console.log('Downloading audio from:', externalAudioUrl);
      const base64Audio = await downloadAudioAsBase64(externalAudioUrl);

      if (base64Audio) {
        // Upload to S3 if configured
        if (isS3Configured()) {
          console.log('[S3] Uploading audio to S3...');
          const uploadResult = await uploadAudioToS3(base64Audio, projectId || undefined);
          if (uploadResult.success && uploadResult.url) {
            audioUrl = uploadResult.url;
            console.log('[S3] Audio uploaded successfully:', uploadResult.url);
          } else {
            console.warn('[S3] Upload failed, falling back to base64:', uploadResult.error);
            audioUrl = base64Audio;
          }
        } else {
          audioUrl = base64Audio;
          console.log('Audio downloaded and converted to base64');
        }
      } else {
        // Fall back to external URL if download fails
        audioUrl = externalAudioUrl;
        console.warn('Failed to download audio, using external URL');
      }
    } else if (externalAudioUrl) {
      audioUrl = externalAudioUrl;
    }

    // Track cost when complete
    const realCost = 0.05; // Estimated Suno cost per generation
    if (status === 'complete' && session?.user?.id) {
      await spendCredits(
        session.user.id,
        COSTS.MUSIC_GENERATION || 10, // 10 credits for music
        'music',
        'Suno music generation',
        projectId || undefined,
        'suno'
      );
    }

    return NextResponse.json({
      taskId,
      status,
      audioUrl,
      externalAudioUrl,
      title: title || taskData.title,
      duration: duration || taskData.duration,
      cost: status === 'complete' ? realCost : undefined,
      storage: audioUrl && !audioUrl.startsWith('data:') && !audioUrl.startsWith('http') ? 's3' : (audioUrl?.startsWith('data:') ? 'base64' : 'external'),
    });
  } catch (error) {
    console.error('Suno status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
