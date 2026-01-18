// Unified Video API Route - Routes to appropriate provider based on user settings
// Supports: Kie.ai (Grok Imagine), Modal (self-hosted)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { optionalAuth, requireCredits, uploadMediaToS3, uploadBase64ToS3, isS3Configured } from '@/lib/api';
import { spendCredits, COSTS, trackRealCostOnly } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import { rateLimit } from '@/lib/services/rate-limit';
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
  skipCreditCheck?: boolean; // Skip credit check (used when admin prepaid for collaborator regeneration)
  ownerId?: string; // Use owner's settings instead of session user (for collaborator regeneration)
  videoProvider?: VideoProvider; // Provider from project model config
  model?: string; // Model ID from project model config (e.g., 'veo/3.1-text-to-video-fast-5s')
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

// Generate video using Kie.ai with model support
async function createKieTask(
  imageUrl: string,
  prompt: string,
  mode: string,
  seed: number | undefined,
  apiKey: string,
  modelId: string = 'grok-imagine/image-to-video'
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
    model: modelId,
    input: {
      image_urls: [publicImageUrl],
      prompt: enhancedPrompt,
      mode: effectiveMode,
    },
  };

  console.log(`[Kie] Creating video task with model: ${modelId}`);

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
  creditUserId: string | undefined, // For credit deduction (undefined to skip)
  realCostUserId: string | undefined, // For real cost tracking (track even if no credit deduction)
  download: boolean,
  isRegeneration: boolean = false,
  sceneId?: string,
  modelId: string = 'grok-imagine/image-to-video'
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
      videoUrl = await uploadMediaToS3(base64Video, 'video', projectId);
    } else {
      videoUrl = externalVideoUrl;
    }
  } else if (externalVideoUrl) {
    videoUrl = externalVideoUrl;
  }

  // Get model-specific cost
  const { getKieModelById } = await import('@/lib/constants/kie-models');
  const modelConfig = getKieModelById(modelId, 'video');
  const realCost = modelConfig?.cost || ACTION_COSTS.video.grok; // Fallback to default
  const modelName = modelConfig?.name || 'Video';
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (status === 'complete') {
    if (creditUserId) {
      // Normal case: deduct credits and track real cost
      await spendCredits(
        creditUserId,
        COSTS.VIDEO_GENERATION,
        'video',
        `KIE ${modelName} ${actionType}`,
        projectId,
        'kie',
        { isRegeneration, sceneId, model: modelId, kieCredits: modelConfig?.credits },
        realCost
      );
    } else if (realCostUserId) {
      // Collaborator regeneration: only track real cost (credits already prepaid by admin)
      await trackRealCostOnly(
        realCostUserId,
        realCost,
        'video',
        `KIE ${modelName} ${actionType} - prepaid`,
        projectId,
        'kie',
        { isRegeneration, sceneId, model: modelId, kieCredits: modelConfig?.credits, prepaidRegeneration: true }
      );
    }
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
  creditUserId: string | undefined, // For credit deduction (undefined to skip)
  realCostUserId: string | undefined, // For real cost tracking (track even if no credit deduction)
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

  const realCost = 0.15; // Modal GPU cost per video (~$0.15 on H100)
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (creditUserId) {
    // Normal case: deduct credits and track real cost
    await spendCredits(
      creditUserId,
      COSTS.VIDEO_GENERATION,
      'video',
      `Modal video ${actionType}`,
      projectId,
      'modal',
      { isRegeneration, sceneId },
      realCost
    );
  } else if (realCostUserId) {
    // Collaborator regeneration: only track real cost (credits already prepaid by admin)
    await trackRealCostOnly(
      realCostUserId,
      realCost,
      'video',
      `Modal video ${actionType} - prepaid`,
      projectId,
      'modal',
      { isRegeneration, sceneId, prepaidRegeneration: true }
    );
  }

  videoUrl = await uploadMediaToS3(videoUrl, 'video', projectId);

  return {
    videoUrl,
    cost: realCost,
    storage: videoUrl.startsWith('data:') ? 'base64' : 's3',
    status: 'complete',
  };
}

// POST - Create video generation task
export async function POST(request: NextRequest) {
  // SECURITY: Rate limit generation to prevent abuse (20 requests/min)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const { imageUrl, prompt, projectId, mode = 'normal', seed, isRegeneration = false, sceneId, skipCreditCheck = false, ownerId, videoProvider: requestProvider, model: requestModel }: VideoGenerationRequest = await request.json();

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: 'Image URL and prompt are required' }, { status: 400 });
    }

    const authCtx = await optionalAuth();
    const sessionUserId = authCtx?.userId;
    let videoProvider: VideoProvider = requestProvider || 'kie'; // Use provider from request body, fallback to 'kie'
    let kieApiKey = process.env.KIE_API_KEY;
    let kieVideoModel = requestModel || 'grok-imagine/image-to-video'; // Use model from request body, fallback to default
    let modalVideoEndpoint: string | null = null;

    // When ownerId is provided (collaborator regeneration), use owner's settings
    // Otherwise use session user's settings
    const settingsUserId = ownerId || sessionUserId;

    if (settingsUserId) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: settingsUserId },
      });

      if (userApiKeys) {
        // Only use database values if not provided in request (for backward compatibility)
        if (!requestProvider) videoProvider = (userApiKeys.videoProvider as VideoProvider) || 'kie';
        if (userApiKeys.kieApiKey) kieApiKey = userApiKeys.kieApiKey;
        // Only use database model if not provided in request (for backward compatibility)
        if (!requestModel && userApiKeys.kieVideoModel) kieVideoModel = userApiKeys.kieVideoModel;
        modalVideoEndpoint = userApiKeys.modalVideoEndpoint;
      }

      // Pre-check credit balance (skip if credits were prepaid by admin for collaborator regeneration)
      if (!skipCreditCheck && sessionUserId) {
        const insufficientCredits = await requireCredits(sessionUserId, COSTS.VIDEO_GENERATION);
        if (insufficientCredits) return insufficientCredits;
      }
    }

    console.log(`[Video] Using provider: ${videoProvider}, model: ${kieVideoModel}, projectId: ${projectId}, isRegeneration: ${isRegeneration}, skipCreditCheck: ${skipCreditCheck}, ownerId: ${ownerId || 'none'}`);

    // For cost tracking:
    // - When skipCreditCheck is true (collaborator regeneration): credits already prepaid by admin,
    //   but we still want to track real API costs to the owner
    // - When skipCreditCheck is false (normal generation): track to session user
    const effectiveUserId = skipCreditCheck ? undefined : sessionUserId; // For credit deduction
    const realCostUserId = ownerId || sessionUserId; // For real cost tracking (always track to owner)

    if (videoProvider === 'modal') {
      if (!modalVideoEndpoint) {
        return NextResponse.json(
          { error: 'Modal video endpoint not configured. Please add your endpoint URL in Settings.' },
          { status: 400 }
        );
      }
      const result = await generateWithModal(imageUrl, prompt, projectId, modalVideoEndpoint, effectiveUserId, realCostUserId, isRegeneration, sceneId);
      return NextResponse.json(result);
    }

    // Default to Kie.ai
    if (!kieApiKey) {
      return NextResponse.json(
        { error: 'Kie.ai API key not configured. Please add your API key in Settings.' },
        { status: 500 }
      );
    }

    const result = await createKieTask(imageUrl, prompt, mode, seed, kieApiKey, kieVideoModel);
    return NextResponse.json({
      taskId: result.taskId,
      status: 'processing',
      message: 'Video generation started. Poll for status.',
      // Return these so client can pass back when polling
      projectId,
      isRegeneration,
      sceneId,
      ownerId, // Pass back for GET polling
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
    const ownerId = searchParams.get('ownerId') || undefined;
    const skipCreditCheck = searchParams.get('skipCreditCheck') === 'true';
    const model = searchParams.get('model') || undefined; // Model ID from query string

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const authCtx = await optionalAuth();
    const sessionUserId = authCtx?.userId;
    let kieApiKey = process.env.KIE_API_KEY;
    let kieVideoModel = model || 'grok-imagine/image-to-video'; // Use model from query string, fallback to default

    // When ownerId is provided, use owner's settings
    const settingsUserId = ownerId || sessionUserId;

    if (settingsUserId) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: settingsUserId },
      });
      if (userApiKeys?.kieApiKey) {
        kieApiKey = userApiKeys.kieApiKey;
      }
      // Only use database model if not provided in query string (for backward compatibility)
      if (!model && userApiKeys?.kieVideoModel) {
        kieVideoModel = userApiKeys.kieVideoModel;
      }
    }

    if (!kieApiKey) {
      return NextResponse.json({ error: 'Kie.ai API key not configured' }, { status: 500 });
    }

    // For cost tracking:
    // - When skipCreditCheck is true (collaborator regeneration): credits already prepaid by admin,
    //   but we still want to track real API costs to the owner
    // - When skipCreditCheck is false (normal generation): track to session user
    const effectiveUserId = skipCreditCheck ? undefined : sessionUserId; // For credit deduction
    const realCostUserId = ownerId || sessionUserId; // For real cost tracking (always track to owner)

    console.log(`[Video GET] Using model: ${kieVideoModel}, taskId: ${taskId}, projectId: ${projectId}`);

    const result = await checkKieTaskStatus(taskId, projectId || undefined, kieApiKey, effectiveUserId, realCostUserId, download, isRegeneration, sceneId, kieVideoModel);
    return NextResponse.json({ taskId, ...result });

  } catch (error) {
    console.error('Video status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
