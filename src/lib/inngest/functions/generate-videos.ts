import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS, trackRealCostOnly } from '@/lib/services/credits';
import { uploadMediaToS3, isS3Configured } from '@/lib/api';
import { cache, cacheKeys } from '@/lib/cache';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { VideoProvider } from '@/types/project';
import type { Provider } from '@/lib/services/real-costs';
import { DEFAULT_MODEL_CONFIG } from '@/lib/constants/model-config-defaults';
import { DEFAULT_MODELS } from '@/lib/constants/default-models';

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
    // Get project's modelConfig (single source of truth)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { modelConfig: true },
    });

    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId },
    });

    // Use project's modelConfig, or DEFAULT_MODEL_CONFIG as fallback
    const config = project?.modelConfig || DEFAULT_MODEL_CONFIG;
    const configObj = typeof config === 'object' ? config as any : DEFAULT_MODEL_CONFIG;
    const effectiveProvider = videoProvider || configObj.video.provider;
    const effectiveModel = videoModel || configObj.video.model || DEFAULT_MODELS.kieVideoModel;

    console.log(`[Video ${scene.sceneNumber}] Starting generation with ${effectiveProvider}/${effectiveModel}`);

    let videoUrl: string | undefined;

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

      // Query model from database to get apiModelId
      const modelConfig = await prisma.kieVideoModel.findUnique({
        where: { modelId: effectiveModel }
      });

      const apiModelId = modelConfig?.apiModelId || effectiveModel;
      console.log(`[Video ${scene.sceneNumber}] Using KIE model: ${effectiveModel} (API: ${apiModelId})`);

      // Create Kie task using the correct endpoint
      const createTaskResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kieApiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: apiModelId,
          input: {
            image_urls: [scene.imageUrl],
            prompt: enhancePromptForMotion(scene.prompt),
            mode: videoMode === 'spicy' ? 'normal' : videoMode,
          },
        }),
      });

      const createData = await createTaskResponse.json();
      console.log(`[Video ${scene.sceneNumber}] KIE create response:`, JSON.stringify({
        status: createTaskResponse.status,
        code: createData.code,
        hasData: !!createData.data,
        data: createData.data,
        fullCreateData: createData
      }, null, 2));

      if (!createTaskResponse.ok || createData.code !== 200) {
        const errorMsg = createData.msg || createData.message || 'Failed to create KIE video task';
        console.error(`[Video ${scene.sceneNumber}] KIE create failed:`, { status: createTaskResponse.status, code: createData.code, body: createData });
        throw new Error(`Kie task creation failed: ${errorMsg}`);
      }

      const taskId = createData.data?.taskId;
      if (!taskId) {
        console.error(`[Video ${scene.sceneNumber}] KIE response missing taskId:`, createData);
        throw new Error('KIE did not return a task ID');
      }

      console.log(`[Video ${scene.sceneNumber}] KIE task created: ${taskId}`);

      // Poll for completion (max 2 minutes)
      const maxRetries = 60;
      let retries = 0;
      let state = 'waiting';

      while (state !== 'success' && state !== 'fail' && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds between polls

        const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          headers: {
            'Authorization': `Bearer ${kieApiKey}`,
            'Accept': 'application/json',
          },
        });

        if (!statusResponse.ok) {
          console.error(`[Video ${scene.sceneNumber}] Failed to check task status`);
          retries++;
          continue;
        }

        const statusData = await statusResponse.json();
        if (statusData.code !== 200) {
          console.error(`[Video ${scene.sceneNumber}] Status check failed:`, statusData);
          retries++;
          continue;
        }

        const taskData = statusData.data;
        state = taskData?.state;

        if (state === 'success') {
          // Log full taskData for debugging
          console.log(`[Video ${scene.sceneNumber}] KIE task completed successfully, taskData:`, JSON.stringify({
            hasResultJson: !!taskData.resultJson,
            resultJsonType: typeof taskData.resultJson,
            resultJson: taskData.resultJson,
            output: taskData.output,
            fullTaskData: taskData
          }, null, 2));

          // Extract video URL from resultJson - same logic as direct API route
          if (taskData.resultJson) {
            try {
              const result = typeof taskData.resultJson === 'string'
                ? JSON.parse(taskData.resultJson)
                : taskData.resultJson;
              console.log(`[Video ${scene.sceneNumber}] Parsed result from resultJson:`, result);

              // Try multiple possible fields (same order as image generation)
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

          // Fallback to direct URL fields on taskData (same as direct API route)
          if (!videoUrl) {
            videoUrl = taskData.videoUrl || taskData.video_url || taskData.resultUrl;
          }

          if (!videoUrl) {
            console.error(`[Video ${scene.sceneNumber}] KIE success but no video URL found. taskData:`, JSON.stringify(taskData, null, 2));
            throw new Error('KIE completed but did not return a video URL');
          }

          console.log(`[Video ${scene.sceneNumber}] Video generated: ${videoUrl}`);
        } else if (state === 'fail') {
          const failReason = taskData?.fail_reason || taskData?.resultJson?.error || 'Unknown error';
          console.error(`[Video ${scene.sceneNumber}] KIE generation failed:`, { taskId, failReason, taskData });
          throw new Error(`Video generation failed: ${failReason}`);
        }

        retries++;
      }

      if (state !== 'success' || !videoUrl) {
        throw new Error(`Video generation timed out or failed (final state: ${state})`);
      }
    }

    // At this point, videoUrl is guaranteed to be defined (type assertion for TypeScript)
    const finalVideoUrl = videoUrl!;

    // Upload to S3 if configured
    if (isS3Configured() && finalVideoUrl.startsWith('http')) {
      console.log(`[Video ${scene.sceneNumber}] Downloading and uploading to S3...`);
      try {
        // Download video first
        const response = await fetch(finalVideoUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          const contentType = response.headers.get('content-type') || 'video/mp4';
          const dataUrl = `data:${contentType};base64,${base64}`;

          // Upload to S3
          const s3Url = await uploadMediaToS3(dataUrl, 'video', projectId);
          let urlToReturn = finalVideoUrl;
          if (s3Url !== dataUrl) {
            urlToReturn = s3Url;
            console.log(`[Video ${scene.sceneNumber}] Uploaded to S3`);
          }

          // Clear video cache for this project
          cache.invalidate(`project:${projectId}:videos`);

          // Update scene with video URL
          await prisma.scene.update({
            where: { id: scene.sceneId },
            data: { videoUrl: urlToReturn },
          });

          console.log(`[Video ${scene.sceneNumber}] Generation complete`);
          return { sceneId: scene.sceneId, success: true, videoUrl: urlToReturn };
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