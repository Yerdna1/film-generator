// Unified Video API Route using centralized API wrapper
// All provider configurations come from Settings (single source of truth)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { optionalAuth, requireCredits, uploadMediaToS3, uploadBase64ToS3, isS3Configured } from '@/lib/api';
import { spendCredits, COSTS, trackRealCostOnly } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import { rateLimit } from '@/lib/services/rate-limit';
import { getUserPermissions, shouldUseOwnApiKeys, checkRequiredApiKeys, getMissingRequirementError } from '@/lib/services/user-permissions';
import { callExternalApi, pollKieTask } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import type { VideoProvider } from '@/types/project';

export const maxDuration = 120;

interface VideoGenerationRequest {
  imageUrl: string;
  prompt: string;
  projectId?: string;
  mode?: 'fun' | 'normal' | 'spicy';
  seed?: number;
  isRegeneration?: boolean;
  sceneId?: string;
  skipCreditCheck?: boolean;
  ownerId?: string;
  model?: string;
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

// Generate video using centralized API wrapper
async function generateWithWrapper(
  userId: string | undefined,
  projectId: string | undefined,
  provider: string,
  imageUrl: string,
  prompt: string,
  mode: string,
  seed: number | undefined,
  creditUserId: string | undefined,
  realCostUserId: string | undefined,
  isRegeneration: boolean = false,
  sceneId?: string,
  endpoint?: string,
  download: boolean = true
): Promise<{ videoUrl: string; cost: number; storage: string; status: string; externalVideoUrl?: string }> {
  console.log(`[${provider}] Generating video with wrapper`);

  // Upload base64 image to S3 first if needed
  let publicImageUrl = imageUrl;
  if (imageUrl.startsWith('data:') && isS3Configured()) {
    console.log(`[${provider}] Uploading base64 image to S3...`);
    const uploadResult = await uploadBase64ToS3(imageUrl, 'film-generator/scenes');
    if (uploadResult.success && uploadResult.url) {
      publicImageUrl = uploadResult.url;
    }
  }

  // Build request body based on provider
  let requestBody: any;

  switch (provider) {
    case 'modal':
      requestBody = {
        image_url: publicImageUrl,
        prompt: enhancePromptForMotion(prompt),
      };
      break;

    case 'kie':
      // Get model from config
      const config = await getProviderConfig({
        userId: userId || 'system',
        projectId,
        type: 'video'
      });

      // Query model from database
      const modelConfig = await prisma.kieVideoModel.findUnique({
        where: { modelId: config.model || 'grok-imagine/image-to-video' }
      });

      if (!modelConfig || !modelConfig.isActive) {
        console.warn(`[KIE] Model ${config.model} not found in database, using original modelId`);
      }

      const apiModelId = modelConfig?.apiModelId || config.model || 'grok-imagine/image-to-video';
      const effectiveMode = mode === 'spicy' ? 'normal' : mode;

      requestBody = {
        model: apiModelId,
        input: {
          image_urls: [publicImageUrl],
          prompt: enhancePromptForMotion(prompt),
          mode: effectiveMode,
        },
      };

      if (seed !== undefined) {
        requestBody.input.seed = seed;
      }
      break;

    default:
      throw new Error(`Unsupported video provider: ${provider}`);
  }

  // Make the API call using wrapper
  const response = await callExternalApi({
    userId: userId || 'system',
    projectId,
    type: 'video',
    body: requestBody,
    endpoint,
    showLoadingMessage: true,
    loadingMessage: `Generating video using ${provider}...`,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  let videoUrl: string | undefined;
  let externalVideoUrl: string | undefined;
  let realCost: number;

  // Handle response based on provider
  if (provider === 'kie') {
    // Get task ID and poll for completion
    const taskId = response.data?.data?.taskId;
    if (!taskId) {
      throw new Error('KIE AI did not return a task ID');
    }

    console.log(`[KIE] Task created: ${taskId}, polling for completion...`);

    // Get API key from config for polling
    const config = await getProviderConfig({
      userId: userId || 'system',
      projectId,
      type: 'video'
    });

    const taskData = await pollKieTask(taskId, config.apiKey!);

    // Extract video URL from result
    if (taskData.resultJson) {
      try {
        const result = typeof taskData.resultJson === 'string'
          ? JSON.parse(taskData.resultJson)
          : taskData.resultJson;
        externalVideoUrl = result.resultUrls?.[0];
      } catch {
        console.error('Failed to parse resultJson');
      }
    }

    if (!externalVideoUrl) {
      throw new Error('KIE AI completed but did not return a video URL');
    }

    // Download and convert to base64 if needed
    if (download) {
      const base64Video = await downloadVideoAsBase64(externalVideoUrl);
      if (base64Video) {
        videoUrl = await uploadMediaToS3(base64Video, 'video', projectId);
      } else {
        videoUrl = externalVideoUrl;
      }
    } else {
      videoUrl = externalVideoUrl;
    }

    // Get model cost
    const modelId = response.model || 'grok-imagine/image-to-video';
    const modelInfo = await prisma.kieVideoModel.findUnique({ where: { modelId } });
    realCost = modelInfo?.cost || ACTION_COSTS.video.grok;

  } else {
    // Modal provider
    if (response.data.video) {
      videoUrl = response.data.video.startsWith('data:')
        ? response.data.video
        : `data:video/mp4;base64,${response.data.video}`;
    } else if (response.data.videoUrl) {
      videoUrl = response.data.videoUrl;
    }

    if (!videoUrl) {
      throw new Error(`${provider} did not return a video`);
    }

    videoUrl = await uploadMediaToS3(videoUrl, 'video', projectId);
    realCost = 0.15; // Modal GPU cost
  }

  // Track costs
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (creditUserId) {
    await spendCredits(
      creditUserId,
      COSTS.VIDEO_GENERATION,
      'video',
      `${provider} video ${actionType}`,
      projectId,
      provider as any,
      { isRegeneration, sceneId },
      realCost
    );
  } else if (realCostUserId) {
    await trackRealCostOnly(
      realCostUserId,
      realCost,
      'video',
      `${provider} video ${actionType} - prepaid`,
      projectId,
      provider as any,
      { isRegeneration, sceneId, prepaidRegeneration: true }
    );
  }

  return {
    videoUrl: videoUrl!,
    externalVideoUrl,
    cost: realCost,
    storage: videoUrl && !videoUrl.startsWith('data:') && !videoUrl.startsWith('http')
      ? 's3'
      : (videoUrl?.startsWith('data:') ? 'base64' : 'external'),
    status: 'complete',
  };
}

// POST - Create video generation task
export async function POST(request: NextRequest) {
  // SECURITY: Rate limit generation to prevent abuse (20 requests/min)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const {
      imageUrl,
      prompt,
      projectId,
      mode = 'normal',
      seed,
      isRegeneration = false,
      sceneId,
      skipCreditCheck = false,
      ownerId,
      model: requestModel
    }: VideoGenerationRequest = await request.json();

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: 'Image URL and prompt are required' }, { status: 400 });
    }

    const authCtx = await optionalAuth();
    const sessionUserId = authCtx?.userId;

    // Get provider configuration - single source of truth
    const settingsUserId = ownerId || sessionUserId || 'system';
    const config = await getProviderConfig({
      userId: settingsUserId,
      projectId,
      type: 'video',
    });

    const videoProvider = config.provider;
    const userHasOwnApiKey = config.userHasOwnApiKey;

    // Check permissions and credits
    if (sessionUserId && !skipCreditCheck) {
      const permissions = await getUserPermissions(sessionUserId);
      const useOwnKeys = await shouldUseOwnApiKeys(sessionUserId, 'video');

      if ((useOwnKeys || permissions.requiresApiKeys) && !userHasOwnApiKey) {
        const keyCheck = await checkRequiredApiKeys(sessionUserId, 'video');
        if (!keyCheck.hasKeys) {
          const error = getMissingRequirementError(permissions, 'video', keyCheck.missing);
          return NextResponse.json(error, { status: error.code === 'API_KEY_REQUIRED' ? 403 : 402 });
        }
      } else if (permissions.requiresCredits && !userHasOwnApiKey) {
        const insufficientCredits = await requireCredits(sessionUserId, COSTS.VIDEO_GENERATION);
        if (insufficientCredits) return insufficientCredits;
      }
    }

    console.log(`[Video] Using provider: ${videoProvider}, model: ${config.model}`);

    // For cost tracking
    const effectiveUserId = (skipCreditCheck || userHasOwnApiKey) ? undefined : sessionUserId;
    const realCostUserId = ownerId || sessionUserId;

    const result = await generateWithWrapper(
      settingsUserId === 'system' ? undefined : settingsUserId,
      projectId,
      videoProvider,
      imageUrl,
      prompt,
      mode,
      seed,
      effectiveUserId,
      realCostUserId,
      isRegeneration,
      sceneId,
      config.endpoint, // For modal endpoints
      true // download
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Video generation error:', error);

    let errorMessage = 'Unknown error occurred during video generation';
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

// GET - Check video generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const download = searchParams.get('download') !== 'false';
    const projectId = searchParams.get('projectId') || undefined;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const authCtx = await optionalAuth();
    const sessionUserId = authCtx?.userId;

    // Get provider configuration to get API key
    const config = await getProviderConfig({
      userId: sessionUserId || 'system',
      projectId,
      type: 'video',
    });

    if (config.provider !== 'kie') {
      return NextResponse.json({ error: 'Task status only supported for KIE provider' }, { status: 400 });
    }

    if (!config.apiKey) {
      return NextResponse.json({ error: 'KIE API key not configured' }, { status: 400 });
    }

    // Poll for task status
    const taskData = await pollKieTask(taskId, config.apiKey, 1); // Single poll

    // Extract status and video URL
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
        const result = typeof taskData.resultJson === 'string'
          ? JSON.parse(taskData.resultJson)
          : taskData.resultJson;
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

    return NextResponse.json({
      status,
      videoUrl,
      externalVideoUrl,
      failMessage: taskData.failMsg || taskData.fail_reason,
      storage: videoUrl && !videoUrl.startsWith('data:') && !videoUrl.startsWith('http')
        ? 's3'
        : (videoUrl?.startsWith('data:') ? 'base64' : 'external'),
    });

  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check task status' },
      { status: 500 }
    );
  }
}