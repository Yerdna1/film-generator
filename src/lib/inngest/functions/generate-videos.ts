import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS, trackRealCostOnly } from '@/lib/services/credits';
import { uploadMediaToS3, isS3Configured } from '@/lib/api';
import { cache, cacheKeys } from '@/lib/cache';
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

// Generate a single video - extracted for reuse
async function generateSingleVideo(
  scene: { sceneId: string; sceneNumber: number; imageUrl: string; prompt: string },
  userId: string,
  projectId: string,
  videoMode: string = 'normal',
  videoProvider?: VideoProvider,
  videoModel?: string
): Promise<{ sceneId: string; success: boolean; videoUrl?: string; error?: string }> {
  try {
    // Get user's video provider settings
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId },
    });

    const effectiveProvider = videoProvider || userApiKeys?.videoProvider || 'kie';
    const effectiveModel = videoModel || userApiKeys?.kieVideoModel || 'grok-imagine/image-to-video';

    console.log(`[Video ${scene.sceneNumber}] Starting generation with ${effectiveProvider}/${effectiveModel}`);

    let videoUrl: string;

    if (effectiveProvider === 'modal') {
      // Use Modal endpoint
      const modalEndpoint = userApiKeys?.modalVideoEndpoint;
      if (!modalEndpoint) {
        throw new Error('Modal video endpoint not configured');
      }

      const response = await fetch(modalEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: scene.imageUrl,
          prompt: enhancePromptForMotion(scene.prompt),
          mode: videoMode,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal failed: ${errorText}`);
      }

      const data = await response.json();
      videoUrl = data.video_url;

    } else {
      // Use Kie.ai
      const kieApiKey = userApiKeys?.kieApiKey || process.env.KIE_API_KEY;
      if (!kieApiKey) {
        throw new Error('Kie API key not configured');
      }

      // Create Kie task
      const createTaskResponse = await fetch('https://api.kie.ai/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kieApiKey}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          input: {
            image_urls: [scene.imageUrl],
            prompt: enhancePromptForMotion(scene.prompt),
            mode: videoMode === 'spicy' ? 'normal' : videoMode, // Kie doesn't support 'spicy'
          },
        }),
      });

      if (!createTaskResponse.ok) {
        const errorData = await createTaskResponse.json();
        throw new Error(`Kie task creation failed: ${errorData.detail || errorData.message || 'Unknown error'}`);
      }

      const { task_id } = await createTaskResponse.json();
      console.log(`[Video ${scene.sceneNumber}] Kie task created: ${task_id}`);

      // Poll for completion (max 2 minutes)
      const maxRetries = 60;
      let retries = 0;
      let taskStatus = 'processing';
      let output: any;

      while (taskStatus === 'processing' && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds between polls

        const statusResponse = await fetch(`https://api.kie.ai/v1/tasks/${task_id}`, {
          headers: { 'Authorization': `Bearer ${kieApiKey}` },
        });

        if (!statusResponse.ok) {
          console.error(`[Video ${scene.sceneNumber}] Failed to check task status`);
          retries++;
          continue;
        }

        const statusData = await statusResponse.json();
        taskStatus = statusData.status;
        output = statusData.output;
        retries++;
      }

      if (taskStatus !== 'completed') {
        throw new Error(`Video generation timed out or failed (status: ${taskStatus})`);
      }

      if (!output?.video_url) {
        throw new Error('No video URL in task output');
      }

      videoUrl = output.video_url;
    }

    // Upload to S3 if configured
    if (isS3Configured() && videoUrl.startsWith('http')) {
      console.log(`[Video ${scene.sceneNumber}] Downloading and uploading to S3...`);
      try {
        // Download video first
        const response = await fetch(videoUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          const contentType = response.headers.get('content-type') || 'video/mp4';
          const dataUrl = `data:${contentType};base64,${base64}`;

          // Upload to S3
          const s3Url = await uploadMediaToS3(dataUrl, 'video', projectId);
          if (s3Url !== dataUrl) {
            videoUrl = s3Url;
            console.log(`[Video ${scene.sceneNumber}] Uploaded to S3`);
          }
        }
      } catch (error) {
        console.error(`[Video ${scene.sceneNumber}] Failed to upload to S3:`, error);
      }
    }

    // Clear video cache for this project
    cache.invalidate(`project:${projectId}:videos`);

    // Update scene with video URL
    await prisma.scene.update({
      where: { id: scene.sceneId },
      data: { videoUrl },
    });

    console.log(`[Video ${scene.sceneNumber}] Generation complete`);
    return { sceneId: scene.sceneId, success: true, videoUrl };

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

    // Update job status to processing
    await step.run('update-job-status-processing', async () => {
      await prisma.videoGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          videoProvider,
          videoModel,
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
        let creditProvider: Provider;

        if (videoProvider === 'modal') {
          realCost = ACTION_COSTS.video.modal * totalCompleted; // ~$0.025 per video
          creditProvider = 'modal';
        } else {
          // Kie.ai costs vary by model and duration
          // Using default 5s video cost, but in production you'd check the actual model
          realCost = ACTION_COSTS.video.kie * totalCompleted; // ~$0.10 per video
          creditProvider = 'kie';
        }

        // Only spend credits if not using user's own API key
        const userApiKeys = await prisma.apiKeys.findUnique({
          where: { userId },
          select: { kieApiKey: true, modalVideoEndpoint: true },
        });

        const isUsingOwnKey = (videoProvider === 'kie' && userApiKeys?.kieApiKey) ||
                             (videoProvider === 'modal' && userApiKeys?.modalVideoEndpoint);

        if (!isUsingOwnKey) {
          await spendCredits(
            userId,
            COSTS.VIDEO_GENERATION * totalCompleted,
            'video',
            `${videoProvider} video generation (${totalCompleted} videos)`,
            projectId,
            creditProvider,
            undefined,
            realCost
          );
        } else {
          // Just track the real cost for analytics
          await trackRealCostOnly(
            userId,
            realCost,
            'video',
            `${videoProvider} video generation (user's own API key)`,
            projectId,
            creditProvider
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