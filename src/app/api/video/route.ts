// Unified Video API Route - Routes to appropriate provider based on user settings
// Supports: Kie.ai (Grok Imagine), Modal (self-hosted)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { uploadBase64ToS3, uploadVideoToS3, isS3Configured } from '@/lib/services/s3-upload';
import { spendCredits, COSTS, checkBalance } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { VideoProvider } from '@/types/project';

const KIE_API_URL = 'https://api.kie.ai';

export const maxDuration = 120;

interface VideoGenerationRequest {
  imageUrl: string;
  prompt: string;
  projectId?: string;
  mode?: 'fun' | 'normal' | 'spicy';
  seed?: number;
  isRegeneration?: boolean; // Track if this is regenerating an existing video
  sceneId?: string; // Optional scene ID for tracking
}

// Enhance I2V prompt with motion speed hints
function enhancePromptForMotion(prompt: string): string {
  const hasSpeedHint = /\b(quickly|fast|rapid|swift|dynamic|energetic|slow|gentle|smooth)\b/i.test(prompt);
  if (!hasSpeedHint) {
    return `${prompt}. Natural movement speed, dynamic motion, fluid animation.`;
  }
  return prompt;
}

// Helper function to download video and convert to base64
async function downloadVideoAsBase64(videoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'video/mp4';

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error downloading video:', error);
    return null;
  }
}

// Generate video using Kie.ai (Grok Imagine)
async function createKieTask(
  imageUrl: string,
  prompt: string,
  mode: string,
  seed: number | undefined,
  apiKey: string
): Promise<{ taskId: string }> {
  // Upload base64 image to S3 first if needed
  let publicImageUrl = imageUrl;
  if (imageUrl.startsWith('data:')) {
    console.log('[Kie] Uploading base64 image to S3...');
    const uploadResult = await uploadBase64ToS3(imageUrl, 'film-generator/scenes');
    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(uploadResult.error || 'Failed to upload image to S3');
    }
    publicImageUrl = uploadResult.url;
  }

  const enhancedPrompt = enhancePromptForMotion(prompt);
  const effectiveMode = mode === 'spicy' ? 'normal' : mode;

  const requestBody: any = {
    model: 'grok-imagine/image-to-video',
    input: {
      image_urls: [publicImageUrl],
      prompt: enhancedPrompt,
      mode: effectiveMode,
    },
  };

  if (seed !== undefined) {
    requestBody.input.seed = seed;
  }

  const response = await fetch(`${KIE_API_URL}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    throw new Error(data.msg || data.message || 'Failed to create Kie video task');
  }

  return { taskId: data.data.taskId };
}

// Check Kie.ai task status
async function checkKieTaskStatus(
  taskId: string,
  projectId: string | undefined,
  apiKey: string,
  userId: string | undefined,
  download: boolean,
  isRegeneration: boolean = false,
  sceneId?: string
): Promise<{ status: string; videoUrl?: string; externalVideoUrl?: string; failMessage?: string; cost?: number; storage?: string }> {
  const response = await fetch(
    `${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    throw new Error(data.msg || data.message || 'Failed to check Kie task status');
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

  let externalVideoUrl: string | undefined;
  let videoUrl: string | undefined;

  if (taskData.resultJson) {
    try {
      const result = JSON.parse(taskData.resultJson);
      externalVideoUrl = result.resultUrls?.[0];
    } catch {
      console.error('Failed to parse resultJson');
    }
  }

  if (status === 'complete' && externalVideoUrl && download) {
    const base64Video = await downloadVideoAsBase64(externalVideoUrl);

    if (base64Video) {
      if (isS3Configured()) {
        const uploadResult = await uploadVideoToS3(base64Video, projectId);
        if (uploadResult.success && uploadResult.url) {
          videoUrl = uploadResult.url;
        } else {
          videoUrl = base64Video;
        }
      } else {
        videoUrl = base64Video;
      }
    } else {
      videoUrl = externalVideoUrl;
    }
  } else if (externalVideoUrl) {
    videoUrl = externalVideoUrl;
  }

  const realCost = ACTION_COSTS.video.grok;
  if (status === 'complete' && userId) {
    const actionType = isRegeneration ? 'regeneration' : 'generation';
    await spendCredits(
      userId,
      COSTS.VIDEO_GENERATION,
      'video',
      `Kie.ai video ${actionType}`,
      projectId,
      'kie',
      { isRegeneration, sceneId },
      realCost
    );
  }

  return {
    status,
    videoUrl,
    externalVideoUrl,
    failMessage: taskData.failMsg,
    cost: status === 'complete' ? realCost : undefined,
    storage: videoUrl && !videoUrl.startsWith('data:') && !videoUrl.startsWith('http') ? 's3' : (videoUrl?.startsWith('data:') ? 'base64' : 'external'),
  };
}

// Generate video using Modal (self-hosted)
async function generateWithModal(
  imageUrl: string,
  prompt: string,
  projectId: string | undefined,
  modalEndpoint: string,
  userId: string | undefined,
  isRegeneration: boolean = false,
  sceneId?: string
): Promise<{ videoUrl: string; cost: number; storage: string; status: string }> {
  console.log('[Modal] Generating video with endpoint:', modalEndpoint);

  // Upload base64 image to S3 first if needed for Modal
  let publicImageUrl = imageUrl;
  if (imageUrl.startsWith('data:') && isS3Configured()) {
    const uploadResult = await uploadBase64ToS3(imageUrl, 'film-generator/scenes');
    if (uploadResult.success && uploadResult.url) {
      publicImageUrl = uploadResult.url;
    }
  }

  const response = await fetch(modalEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: publicImageUrl,
      prompt: enhancePromptForMotion(prompt),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Modal video generation failed: ${errorText}`);
  }

  const data = await response.json();

  let videoUrl: string;
  if (data.video) {
    videoUrl = data.video.startsWith('data:') ? data.video : `data:video/mp4;base64,${data.video}`;
  } else if (data.videoUrl) {
    videoUrl = data.videoUrl;
  } else {
    throw new Error('Modal endpoint did not return video');
  }

  const realCost = 0; // Self-hosted = no API cost

  if (userId) {
    const actionType = isRegeneration ? 'regeneration' : 'generation';
    await spendCredits(
      userId,
      COSTS.VIDEO_GENERATION,
      'video',
      `Modal video ${actionType}`,
      projectId,
      'modal',
      { isRegeneration, sceneId },
      realCost
    );
  }

  if (isS3Configured() && videoUrl.startsWith('data:')) {
    const uploadResult = await uploadVideoToS3(videoUrl, projectId);
    if (uploadResult.success && uploadResult.url) {
      videoUrl = uploadResult.url;
    }
  }

  return {
    videoUrl,
    cost: realCost,
    storage: videoUrl.startsWith('data:') ? 'base64' : 's3',
    status: 'complete',
  };
}

// POST - Create video generation task
export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt, projectId, mode = 'normal', seed, isRegeneration = false, sceneId }: VideoGenerationRequest = await request.json();

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: 'Image URL and prompt are required' }, { status: 400 });
    }

    const session = await auth();
    let videoProvider: VideoProvider = 'kie';
    let kieApiKey = process.env.KIE_API_KEY;
    let modalVideoEndpoint: string | null = null;

    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });

      if (userApiKeys) {
        videoProvider = (userApiKeys.videoProvider as VideoProvider) || 'kie';
        if (userApiKeys.kieApiKey) kieApiKey = userApiKeys.kieApiKey;
        modalVideoEndpoint = userApiKeys.modalVideoEndpoint;
      }

      const balanceCheck = await checkBalance(session.user.id, COSTS.VIDEO_GENERATION);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json({
          error: 'Insufficient credits',
          required: balanceCheck.required,
          balance: balanceCheck.balance,
          needsPurchase: true,
        }, { status: 402 });
      }
    }

    console.log(`[Video] Using provider: ${videoProvider}, projectId: ${projectId}, isRegeneration: ${isRegeneration}`);

    if (videoProvider === 'modal') {
      if (!modalVideoEndpoint) {
        return NextResponse.json(
          { error: 'Modal video endpoint not configured. Please add your endpoint URL in Settings.' },
          { status: 400 }
        );
      }
      const result = await generateWithModal(imageUrl, prompt, projectId, modalVideoEndpoint, session?.user?.id, isRegeneration, sceneId);
      return NextResponse.json(result);
    }

    // Default to Kie.ai
    if (!kieApiKey) {
      return NextResponse.json(
        { error: 'Kie.ai API key not configured. Please add your API key in Settings.' },
        { status: 500 }
      );
    }

    const result = await createKieTask(imageUrl, prompt, mode, seed, kieApiKey);
    return NextResponse.json({
      taskId: result.taskId,
      status: 'processing',
      message: 'Video generation started. Poll for status.',
      // Return these so client can pass back when polling
      projectId,
      isRegeneration,
      sceneId,
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Check video generation status (for Kie.ai polling)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const download = searchParams.get('download') !== 'false';
    const isRegeneration = searchParams.get('isRegeneration') === 'true';
    const sceneId = searchParams.get('sceneId') || undefined;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const session = await auth();
    let kieApiKey = process.env.KIE_API_KEY;

    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      if (userApiKeys?.kieApiKey) {
        kieApiKey = userApiKeys.kieApiKey;
      }
    }

    if (!kieApiKey) {
      return NextResponse.json({ error: 'Kie.ai API key not configured' }, { status: 500 });
    }

    const result = await checkKieTaskStatus(taskId, projectId || undefined, kieApiKey, session?.user?.id, download, isRegeneration, sceneId);
    return NextResponse.json({ taskId, ...result });

  } catch (error) {
    console.error('Video status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
