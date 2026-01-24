import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS, trackRealCostOnly } from '@/lib/services/credits';
import { uploadMediaToS3, isS3Configured, uploadBase64ToS3 } from '@/lib/api';
import { cache, cacheKeys } from '@/lib/cache';
import { callExternalApi, pollKieTask } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { VideoProvider } from '@/types/project';
import type { Provider } from '@/lib/services/real-costs';

// Number of videos to generate in parallel
const PARALLEL_VIDEOS = 3; // Lower than images due to longer generation time

// Helper to enhance I2V prompt with motion speed hints
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

// Generate a single video using the API wrapper
async function generateSingleVideo(
  scene: { sceneId: string; sceneNumber: number; imageUrl: string; prompt: string },
  userId: string,
  projectId: string,
  videoMode: string = 'normal',
  videoProvider?: VideoProvider,
  videoModel?: string
): Promise<{ sceneId: string; success: boolean; videoUrl?: string; error?: string }> {
  try {
    console.log(`[Video ${scene.sceneNumber}] Starting generation`);

    // Get provider configuration - single source of truth
    const config = await getProviderConfig({
      userId,
      projectId,
      type: 'video',
    });

    const { provider, apiKey, model, endpoint } = config;
    console.log(`[Video ${scene.sceneNumber}] Using provider: ${provider}, model: ${model}`);

    let publicImageUrl = scene.imageUrl;

    // Upload base64 image to S3 if needed (KIE requires public URLs)
    if (scene.imageUrl.startsWith('data:') && provider === 'kie' && isS3Configured()) {
      console.log(`[Video ${scene.sceneNumber}] Uploading base64 image to S3...`);
      const uploadResult = await uploadBase64ToS3(scene.imageUrl, 'artflowly/scenes');
      if (uploadResult.success && uploadResult.url) {
        publicImageUrl = uploadResult.url;
      } else {
        throw new Error(uploadResult.error || 'Failed to upload image to S3');
      }
    }

    // Build request body based on provider
    let requestBody: any;
    const enhancedPrompt = enhancePromptForMotion(scene.prompt);

    switch (provider) {
      case 'modal':
        requestBody = {
          image_url: publicImageUrl,
          prompt: enhancedPrompt,
          mode: videoMode,
        };
        break;

      case 'kie':
        // Query model from database
        const modelConfig = await prisma.kieVideoModel.findUnique({
          where: { modelId: model || 'grok-imagine/image-to-video' }
        });

        if (!modelConfig || !modelConfig.isActive) {
          console.warn(`[Video ${scene.sceneNumber}] Model ${model} not found in database, using original modelId`);
        }

        const apiModelId = modelConfig?.apiModelId || model || 'grok-imagine/image-to-video';
        console.log(`[Video ${scene.sceneNumber}] Using KIE model: ${model} (API: ${apiModelId})`);

        requestBody = {
          model: apiModelId,
          input: {
            image_urls: [publicImageUrl],
            prompt: enhancedPrompt,
            mode: videoMode === 'spicy' ? 'normal' : videoMode,
          },
        };
        break;

      default:
        throw new Error(`Unsupported video provider: ${provider}`);
    }

    console.log(`[Video ${scene.sceneNumber}] Calling ${provider} API`);

    const response = await callExternalApi({
      userId,
      projectId,
      type: 'video',
      body: requestBody,
      endpoint,
      showLoadingMessage: false,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    let videoUrl: string | undefined;
    let realCost: number;

    // Handle response based on provider
    if (provider === 'kie') {
      // Get task ID and poll for completion
      const taskId = response.data?.data?.taskId;
      if (!taskId) {
        console.error(`[Video ${scene.sceneNumber}] KIE response missing taskId:`, response.data);
        throw new Error('KIE AI did not return a task ID');
      }

      console.log(`[Video ${scene.sceneNumber}] KIE task created: ${taskId}, polling...`);
      const taskData = await pollKieTask(taskId, apiKey!);

      // Extract video URL from result
      if (taskData.resultJson) {
        try {
          const result = typeof taskData.resultJson === 'string'
            ? JSON.parse(taskData.resultJson)
            : taskData.resultJson;
          console.log(`[Video ${scene.sceneNumber}] Parsed result from resultJson:`, result);

          // Try multiple possible fields
          videoUrl = result.video_url || result.videoUrl || result.url;
          if (!videoUrl && result.resultUrls?.[0]) {
            videoUrl = result.resultUrls[0];
          }
          if (!videoUrl && result.videos?.[0]) {
            videoUrl = result.videos[0];
          }
        } catch (e) {
          console.error(`[Video ${scene.sceneNumber}] Failed to parse KIE resultJson:`, e);
        }
      }

      // Fallback to direct URL fields on taskData
      if (!videoUrl) {
        videoUrl = taskData.videoUrl || taskData.video_url || taskData.resultUrl;
      }

      if (!videoUrl) {
        console.error(`[Video ${scene.sceneNumber}] KIE success but no video URL found. taskData:`, JSON.stringify(taskData, null, 2));
        throw new Error('KIE completed but did not return a video URL');
      }

      console.log(`[Video ${scene.sceneNumber}] Video generated: ${videoUrl}`);

      // Download and convert to base64 for S3 upload if needed
      if (isS3Configured()) {
        const base64Video = await downloadVideoAsBase64(videoUrl);
        if (base64Video) {
          videoUrl = base64Video;
        }
      }

      // Get model cost
      const modelId = model || 'grok-imagine/image-to-video';
      const modelInfo = await prisma.kieVideoModel.findUnique({ where: { modelId } });
      realCost = modelInfo?.cost || ACTION_COSTS.video.grok;

    } else {
      // Modal provider
      if (response.data.video) {
        videoUrl = response.data.video.startsWith('data:')
          ? response.data.video
          : `data:video/mp4;base64,${response.data.video}`;
      } else if (response.data.videoUrl || response.data.video_url) {
        videoUrl = response.data.videoUrl || response.data.video_url;
      }

      if (!videoUrl) {
        throw new Error('Modal did not return a video');
      }

      realCost = ACTION_COSTS.video.modal || 0.15; // Modal GPU cost
    }

    // Upload to S3 if configured
    let finalVideoUrl = videoUrl!;
    if (isS3Configured() && videoUrl!.startsWith('data:')) {
      console.log(`[Video ${scene.sceneNumber}] Uploading to S3...`);
      const s3Url = await uploadMediaToS3(videoUrl!, 'video', projectId);
      if (s3Url !== videoUrl) {
        finalVideoUrl = s3Url;
        console.log(`[Video ${scene.sceneNumber}] Uploaded to S3`);
      }
    }

    // Clear video cache for this project
    cache.invalidate(`project:${projectId}:videos`);

    // Update scene with video URL
    await prisma.scene.update({
      where: { id: scene.sceneId },
      data: { videoUrl: finalVideoUrl },
    });

    console.log(`[Video ${scene.sceneNumber}] Generation complete`);
    return { sceneId: scene.sceneId, success: true, videoUrl: finalVideoUrl };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Video ${scene.sceneNumber}] Error: ${errorMessage}`);
    return { sceneId: scene.sceneId, success: false, error: errorMessage };
  }
}

// Generate videos for a batch of scenes - processes them in parallel batches
export const generateVideosBatch = inngest.createFunction(
  {
    id: 'generate-videos-batch',
    name: 'Generate Videos Batch',
    retries: 3,
    cancelOn: [
      {
        event: 'video/batch.cancel',
        match: 'data.batchId',
      },
    ],
  },
  { event: 'video/generate.batch' },
  async ({ event, step }) => {
    const { projectId, userId, jobId, scenes, videoMode, videoProvider, videoModel } = event.data;

    console.log(`[Inngest Video] Starting job ${jobId} with ${scenes.length} scenes (parallel: ${PARALLEL_VIDEOS})`);

    // Get provider configuration
    const providerConfig = await step.run('get-provider-config', async () => {
      return await getProviderConfig({
        userId,
        projectId,
        type: 'video',
      });
    });

    console.log(`[Inngest Video] Using provider: ${providerConfig.provider}, model: ${providerConfig.model}`);

    // Update job status to processing
    await step.run('update-job-status-processing', async () => {
      await prisma.videoGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          videoProvider: providerConfig.provider,
          videoModel: providerConfig.model || 'default',
        },
      });
    });

    let totalCompleted = 0;
    let totalFailed = 0;
    const failedScenes: Array<{ sceneId: string; error: string }> = [];

    // Process videos in parallel batches
    for (let i = 0; i < scenes.length; i += PARALLEL_VIDEOS) {
      const batch = scenes.slice(i, i + PARALLEL_VIDEOS);
      const batchNumber = Math.floor(i / PARALLEL_VIDEOS) + 1;
      const totalBatches = Math.ceil(scenes.length / PARALLEL_VIDEOS);

      console.log(`[Inngest Video] Processing batch ${batchNumber}/${totalBatches}`);

      // Generate videos in parallel for this batch
      const results = await step.run(`generate-batch-${batchNumber}`, async () => {
        const promises = batch.map((scene: typeof scenes[0]) =>
          generateSingleVideo(
            scene,
            userId,
            projectId,
            videoMode,
            videoProvider,
            videoModel
          )
        );
        return Promise.all(promises);
      });

      // Count results
      for (const result of results) {
        if (result.success) {
          totalCompleted++;
        } else {
          totalFailed++;
          failedScenes.push({
            sceneId: result.sceneId,
            error: result.error || 'Unknown error',
          });
        }
      }

      // Update progress after each batch
      await step.run(`update-progress-${batchNumber}`, async () => {
        const progress = Math.round(((i + batch.length) / scenes.length) * 100);
        await prisma.videoGenerationJob.update({
          where: { id: jobId },
          data: {
            progress,
            completedVideos: totalCompleted,
            failedVideos: totalFailed,
          },
        });
      });

      // Small delay between batches to avoid rate limits
      if (i + PARALLEL_VIDEOS < scenes.length) {
        await step.sleep('batch-delay', 2000); // 2 seconds
      }
    }

    // Determine final status
    const finalStatus = totalFailed === 0 ? 'completed' :
      totalCompleted === 0 ? 'failed' : 'completed_with_errors';

    // Prepare error details if any
    const errorDetails = failedScenes.length > 0
      ? `Failed videos: ${failedScenes.map(f => `Scene ${scenes.find((s: typeof scenes[0]) => s.sceneId === f.sceneId)?.sceneNumber}: ${f.error}`).join(', ')}`
      : undefined;

    // Update job as completed
    await step.run('update-job-completed', async () => {
      await prisma.videoGenerationJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          completedVideos: totalCompleted,
          failedVideos: totalFailed,
          progress: 100,
          errorDetails,
        },
      });
    });

    // Spend credits for successfully generated videos
    if (totalCompleted > 0) {
      await step.run('spend-credits', async () => {
        // Determine cost based on provider
        let realCost: number;
        const provider = providerConfig.provider;
        const model = providerConfig.model;

        if (provider === 'modal') {
          realCost = (ACTION_COSTS.video.modal || 0.15) * totalCompleted;
        } else {
          // KIE costs vary by model
          const modelInfo = model ? await prisma.kieVideoModel.findUnique({ where: { modelId: model } }) : null;
          const perVideoCost = modelInfo?.cost || ACTION_COSTS.video.grok || 0.10;
          realCost = perVideoCost * totalCompleted;
        }

        // Only spend credits if not using user's own API key
        if (!providerConfig.userHasOwnApiKey) {
          await spendCredits(
            userId,
            COSTS.VIDEO_GENERATION * totalCompleted,
            'video',
            `${provider} video generation (${totalCompleted} videos)`,
            projectId,
            provider as Provider,
            undefined,
            realCost
          );
        } else {
          // Just track the real cost for analytics
          await trackRealCostOnly(
            userId,
            realCost,
            'video',
            `${provider} video generation (user's own API key)`,
            projectId,
            provider as Provider
          );
        }
      });
    }

    // Clear project cache
    await step.run('clear-cache', async () => {
      cache.invalidate(cacheKeys.project(projectId));
      cache.invalidate(`project:${projectId}:videos`);
    });

    console.log(`[Inngest Video] Job ${jobId} completed: ${totalCompleted} success, ${totalFailed} failed`);

    return {
      success: true,
      totalCompleted,
      totalFailed,
      failedScenes: failedScenes.map(f => f.sceneId),
    };
  }
);

// Cancel a running video generation job
export const cancelVideoGeneration = inngest.createFunction(
  {
    id: 'cancel-video-generation',
    name: 'Cancel Video Generation',
  },
  { event: 'video/batch.cancel' },
  async ({ event, step }) => {
    const { jobId } = event.data;

    await step.run('update-job-cancelled', async () => {
      await prisma.videoGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
        },
      });
    });

    console.log(`[Inngest Video] Job ${jobId} cancelled`);
    return { success: true };
  }
);