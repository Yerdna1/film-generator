import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { addLog, buildFullI2VPrompt, createNotification } from '../lib';
import type { ActionContext, RegenerationResult } from '../lib';

/**
 * Handle regeneration attempt action
 * Called when collaborator uses one of their approved regeneration attempts
 */
export async function handleRegenerate(ctx: ActionContext): Promise<NextResponse> {
  const { session, projectId, requestId, regenerationRequest, scene, cookieHeader, baseUrl } = ctx;

  // Only requester can use their attempts
  if (regenerationRequest.requesterId !== session.user.id) {
    return NextResponse.json(
      { error: 'Only the requester can use regeneration attempts' },
      { status: 403 }
    );
  }

  // Check status is approved or generating
  if (!['approved', 'generating'].includes(regenerationRequest.status)) {
    return NextResponse.json(
      { error: `Cannot regenerate in ${regenerationRequest.status} status. Request must be approved first.` },
      { status: 400 }
    );
  }

  // Check attempts remaining
  if (regenerationRequest.attemptsUsed >= regenerationRequest.maxAttempts) {
    return NextResponse.json(
      { error: 'All regeneration attempts have been used. Please select the best option.' },
      { status: 400 }
    );
  }

  // Credits already prepaid by admin on approval - just verify they were paid
  if (regenerationRequest.creditsPaid <= 0) {
    return NextResponse.json(
      { error: 'No credits allocated for this regeneration request' },
      { status: 400 }
    );
  }

  // Get resolution and aspect ratio from project settings
  const settings = regenerationRequest.project?.settings as {
    resolution?: string;
    aspectRatio?: string;
    imageResolution?: string;
  } | null;
  const resolution = settings?.imageResolution || settings?.resolution || '2k';
  const aspectRatio = settings?.aspectRatio || '16:9';

  // Build reference images array from project characters
  const referenceImages = (regenerationRequest.project?.characters || [])
    .filter((char: { name: string; imageUrl: string | null }) => char.imageUrl)
    .map((char: { name: string; imageUrl: string | null }) => ({
      name: char.name,
      imageUrl: char.imageUrl as string,
    }));

  console.log(`[Regeneration] Using ${referenceImages.length} character reference images, resolution: ${resolution}, aspectRatio: ${aspectRatio}`);

  // Log regeneration start
  await addLog(requestId, {
    type: 'info',
    message: `Starting ${regenerationRequest.targetType} regeneration (attempt ${regenerationRequest.attemptsUsed + 1}/${regenerationRequest.maxAttempts})`,
    details: {
      resolution,
      aspectRatio,
      referenceImages: referenceImages.length,
      ownerId: regenerationRequest.project?.userId,
      skipCreditCheck: true,
    },
  });

  // Set status to generating
  await prisma.regenerationRequest.update({
    where: { id: requestId },
    data: { status: 'generating' },
  });

  // Perform the regeneration
  let regenerationResult: RegenerationResult;

  try {
    if (regenerationRequest.targetType === 'image') {
      regenerationResult = await generateImage({
        baseUrl,
        cookieHeader,
        prompt: scene.textToImagePrompt || '',
        aspectRatio,
        resolution,
        projectId,
        referenceImages,
        sceneId: scene.id,
        ownerId: regenerationRequest.project?.userId,
      });
    } else {
      regenerationResult = await generateVideo({
        baseUrl,
        cookieHeader,
        scene,
        projectId,
        ownerId: regenerationRequest.project?.userId,
      });
    }
  } catch (genError) {
    console.error('Regeneration error:', genError);
    regenerationResult = {
      success: false,
      error: genError instanceof Error ? genError.message : 'Regeneration failed',
    };
  }

  if (regenerationResult.success && regenerationResult.url) {
    // Log success
    await addLog(requestId, {
      type: 'success',
      message: `${regenerationRequest.targetType} generated successfully`,
      details: {
        provider: regenerationResult.provider,
        realCost: regenerationResult.cost,
        urlPreview: regenerationResult.url.substring(0, 80) + '...',
        creditsDeducted: 0,
        note: 'Credits prepaid by admin, real cost tracked to owner',
      },
    });

    // Add cost tracking log
    if (regenerationResult.cost) {
      await addLog(requestId, {
        type: 'cost',
        message: `Real cost $${regenerationResult.cost.toFixed(2)} tracked to project owner`,
        details: {
          provider: regenerationResult.provider,
          realCost: regenerationResult.cost,
          ownerId: regenerationRequest.project?.userId,
        },
      });
    }

    // Add URL to generatedUrls array
    const currentUrls = (regenerationRequest.generatedUrls as string[]) || [];
    const newUrls = [...currentUrls, regenerationResult.url];
    const newAttemptsUsed = regenerationRequest.attemptsUsed + 1;

    // Update request
    const newStatus = newAttemptsUsed >= regenerationRequest.maxAttempts ? 'selecting' : 'approved';
    await prisma.regenerationRequest.update({
      where: { id: requestId },
      data: {
        generatedUrls: newUrls,
        attemptsUsed: newAttemptsUsed,
        status: newStatus,
      },
    });

    // If all attempts used, notify collaborator to select
    if (newStatus === 'selecting') {
      await createNotification({
        userId: regenerationRequest.requesterId,
        type: 'regeneration_completed',
        title: 'Regeneration Complete - Select Best Option',
        message: `All ${regenerationRequest.maxAttempts} regeneration attempts for "${scene.title}" are complete. Please select the best option.`,
        metadata: {
          projectId,
          projectName: regenerationRequest.project?.name,
          requestId,
          sceneId: scene.id,
          generatedUrls: newUrls,
        },
        actionUrl: `/project/${projectId}`,
      });
    }

    return NextResponse.json({
      success: true,
      url: regenerationResult.url,
      attemptsUsed: newAttemptsUsed,
      attemptsRemaining: regenerationRequest.maxAttempts - newAttemptsUsed,
      status: newStatus,
      generatedUrls: newUrls,
    });
  } else {
    // Log error
    await addLog(requestId, {
      type: 'error',
      message: `${regenerationRequest.targetType} generation failed`,
      details: { error: regenerationResult.error },
    });

    // Regeneration failed, but don't count as attempt
    await prisma.regenerationRequest.update({
      where: { id: requestId },
      data: { status: 'approved' },
    });

    return NextResponse.json(
      { success: false, error: regenerationResult.error },
      { status: 500 }
    );
  }
}

// Helper: Generate image
async function generateImage(params: {
  baseUrl: string;
  cookieHeader: string | null;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  projectId: string;
  referenceImages: { name: string; imageUrl: string }[];
  sceneId: string;
  ownerId?: string;
}): Promise<RegenerationResult> {
  const imageResponse = await fetch(`${params.baseUrl}/api/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': params.cookieHeader || '',
    },
    body: JSON.stringify({
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      projectId: params.projectId,
      referenceImages: params.referenceImages,
      isRegeneration: true,
      sceneId: params.sceneId,
      skipCreditCheck: true,
      ownerId: params.ownerId,
    }),
  });

  const imageData = await imageResponse.json();

  if (imageResponse.ok && imageData.imageUrl) {
    return {
      success: true,
      url: imageData.imageUrl,
      cost: imageData.cost,
      provider: imageData.storage === 's3' ? 'modal-edit' : 'gemini',
    };
  }

  return { success: false, error: imageData.error || 'Image generation failed' };
}

// Helper: Generate video
async function generateVideo(params: {
  baseUrl: string;
  cookieHeader: string | null;
  scene: { id: string; imageUrl: string | null; imageToVideoPrompt: string | null; dialogue: unknown[] | null };
  projectId: string;
  ownerId?: string;
}): Promise<RegenerationResult> {
  if (!params.scene.imageUrl) {
    return { success: false, error: 'Scene has no image. Generate image first.' };
  }

  const fullVideoPrompt = buildFullI2VPrompt(
    params.scene.imageToVideoPrompt,
    params.scene.dialogue
  );

  const videoResponse = await fetch(`${params.baseUrl}/api/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': params.cookieHeader || '',
    },
    body: JSON.stringify({
      imageUrl: params.scene.imageUrl,
      prompt: fullVideoPrompt,
      projectId: params.projectId,
      isRegeneration: true,
      sceneId: params.scene.id,
      skipCreditCheck: true,
      ownerId: params.ownerId,
    }),
  });

  const videoData = await videoResponse.json();

  // Direct video result from Modal
  if (videoResponse.ok && videoData.videoUrl) {
    return {
      success: true,
      url: videoData.videoUrl,
      cost: videoData.cost,
      provider: videoData.storage === 's3' ? 'modal' : 'kie',
    };
  }

  // Kie.ai returns taskId - need to poll for completion
  if (videoResponse.ok && videoData.taskId) {
    return await pollKieVideo({
      baseUrl: params.baseUrl,
      cookieHeader: params.cookieHeader,
      taskId: videoData.taskId,
      projectId: params.projectId,
      sceneId: params.scene.id,
      ownerId: params.ownerId,
    });
  }

  return { success: false, error: videoData.error || 'Video generation failed' };
}

// Helper: Poll Kie.ai for video completion
async function pollKieVideo(params: {
  baseUrl: string;
  cookieHeader: string | null;
  taskId: string;
  projectId: string;
  sceneId: string;
  ownerId?: string;
}): Promise<RegenerationResult> {
  console.log(`[Regeneration] Kie.ai video task started: ${params.taskId}, polling...`);

  const maxPolls = 120; // 10 minutes max (5s intervals)
  const pollInterval = 5000; // 5 seconds
  let pollCount = 0;

  while (pollCount < maxPolls) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    pollCount++;

    const statusUrl = `${params.baseUrl}/api/video?taskId=${params.taskId}&projectId=${params.projectId}&download=true&isRegeneration=true&sceneId=${params.sceneId}&ownerId=${params.ownerId}&skipCreditCheck=true`;
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Cookie': params.cookieHeader || '' },
    });

    const statusData = await statusResponse.json();

    if (statusData.status === 'complete' && statusData.videoUrl) {
      return {
        success: true,
        url: statusData.videoUrl,
        cost: statusData.cost,
        provider: 'kie',
      };
    }

    if (statusData.status === 'error') {
      return {
        success: false,
        error: statusData.failMessage || 'Video generation failed',
      };
    }

    console.log(`[Regeneration] Kie.ai poll ${pollCount}/${maxPolls}: ${statusData.status}`);
  }

  return { success: false, error: 'Video generation timed out' };
}
