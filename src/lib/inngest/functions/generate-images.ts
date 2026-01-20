import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, getImageCreditCost } from '@/lib/services/credits';
import { uploadImageToS3, isS3Configured } from '@/lib/services/s3-upload';
import { cache, cacheKeys } from '@/lib/cache';
import type { ImageResolution, Provider } from '@/lib/services/real-costs';

// Number of images to generate in parallel
const PARALLEL_IMAGES = 5;

// Generate a single image - extracted for reuse
async function generateSingleImage(
  scene: { sceneId: string; sceneNumber: number; prompt: string },
  userId: string,
  projectId: string,
  aspectRatio: string,
  resolution: string,
  referenceImages: Array<{ name: string; imageUrl: string }>
): Promise<{ sceneId: string; success: boolean; error?: string }> {
  try {
    // Get user's image provider settings
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId },
    });

    const imageProvider = userApiKeys?.imageProvider || 'gemini';
    let imageUrl: string | undefined;

    if (imageProvider === 'modal' || imageProvider === 'modal-edit') {
      // Use Modal endpoint
      const endpoint = imageProvider === 'modal-edit'
        ? userApiKeys?.modalImageEditEndpoint
        : userApiKeys?.modalImageEndpoint;

      if (!endpoint) {
        throw new Error(`Modal endpoint not configured for ${imageProvider}`);
      }

      const body: Record<string, unknown> = {
        prompt: scene.prompt,
        aspect_ratio: aspectRatio,
      };

      // Always include reference images for character consistency
      if (referenceImages.length > 0) {
        body.reference_images = referenceImages.map((r) => r.imageUrl);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal failed: ${errorText}`);
      }

      const data = await response.json();
      imageUrl = data.image?.startsWith('data:')
        ? data.image
        : `data:image/png;base64,${data.image}`;

    } else if (imageProvider === 'kie') {
      // Use KIE.ai API
      const kieApiKey = userApiKeys?.kieApiKey;
      if (!kieApiKey) {
        throw new Error('KIE API key not configured. Please add your API key in Settings.');
      }

      const modelId = userApiKeys?.kieImageModel || 'nano-banana-pro';
      console.log(`[Inngest] Using KIE model: ${modelId}`);

      // Query model from database to get apiModelId
      const modelConfig = await prisma.kieImageModel.findUnique({
        where: { modelId }
      });

      if (!modelConfig || !modelConfig.isActive) {
        throw new Error(`Invalid KIE image model: ${modelId}`);
      }

      if (!modelConfig.apiModelId) {
        throw new Error(
          `The model "${modelConfig.name}" (${modelId}) is not directly supported by KIE's API. ` +
          `Please select a different model in Settings. ` +
          `Working models: "Ideogram V3", "Grok Imagine", "Z-Image"`
        );
      }

      const apiModelId = modelConfig.apiModelId;
      console.log(`[Inngest] KIE API model ID: ${apiModelId}`);

      const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kieApiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: apiModelId,
          input: {
            prompt: scene.prompt,
            aspect_ratio: aspectRatio,
            // Model-specific parameters
            ...(apiModelId.includes('ideogram') && { render_text: true }),
            ...(apiModelId.includes('flux') && { guidance_scale: 7.5 }),
          },
        }),
      });

      const createData = await response.json();
      console.log(`[Inngest] KIE create task response:`, {
        status: response.status,
        code: createData.code,
        hasData: !!createData.data,
        data: createData.data,
      });

      if (!response.ok || createData.code !== 200) {
        const errorMsg = createData.msg || createData.message || createData.error || 'Failed to create KIE task';
        console.error(`[Inngest] KIE API error:`, {
          status: response.status,
          code: createData.code,
          body: createData,
          modelId,
          apiModelId,
        });

        if (errorMsg.includes('key') || errorMsg.includes('auth') || errorMsg.includes('valid')) {
          throw new Error('KIE API key is invalid or has expired. Please update your API key in Settings.');
        }
        throw new Error(`KIE API error: ${errorMsg}`);
      }

      const taskId = createData.data?.taskId;

      if (!taskId) {
        console.error(`[Inngest] KIE response missing taskId:`, createData);
        throw new Error('KIE AI did not return a task ID. Please try again or contact support.');
      }

      console.log(`[Inngest] KIE task created: ${taskId}`);

      // Poll for task completion
      const maxPolls = 60; // 2 minutes (60 * 2s)
      let polls = 0;

      while (polls < maxPolls && !imageUrl) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          headers: {
            'Authorization': `Bearer ${kieApiKey}`,
            'Accept': 'application/json',
          },
        });

        const statusData = await statusResponse.json();

        if (!statusResponse.ok || statusData.code !== 200) {
          console.error(`[Inngest] KIE status check failed:`, {
            status: statusResponse.status,
            code: statusData.code,
            body: statusData,
          });
          throw new Error(statusData.msg || statusData.message || 'Failed to check KIE task status');
        }

        const taskData = statusData.data;
        const state = taskData?.state;

        if (state === 'success') {
          // Log full taskData for debugging
          console.log('[Inngest] KIE task completed successfully, taskData:', JSON.stringify({
            hasResultJson: !!taskData.resultJson,
            resultJsonType: typeof taskData.resultJson,
            resultJson: taskData.resultJson,
            output: taskData.output,
            fullTaskData: taskData,
          }, null, 2));

          // Extract image URL from resultJson - same logic as direct API route
          if (taskData.resultJson) {
            try {
              const result = typeof taskData.resultJson === 'string'
                ? JSON.parse(taskData.resultJson)
                : taskData.resultJson;
              console.log('[Inngest] Parsed result from resultJson:', result);

              // Try multiple possible fields (same order as direct API route)
              imageUrl = result.resultUrls?.[0] || result.imageUrl || result.image_url || result.url;
              if (!imageUrl && result.images?.length > 0) {
                imageUrl = result.images[0];
              }
            } catch (e) {
              console.error('[Inngest] Failed to parse KIE resultJson:', e);
            }
          }

          // Fallback to direct URL fields on taskData (same as direct API route)
          if (!imageUrl) {
            imageUrl = taskData.imageUrl || taskData.image_url || taskData.resultUrl;
          }

          if (!imageUrl) {
            console.error('[Inngest] KIE success but no image URL found. taskData:', JSON.stringify(taskData, null, 2));
            throw new Error('KIE completed successfully but did not return an image URL');
          }

          console.log(`[Inngest] KIE image generated: ${imageUrl}`);
        } else if (state === 'fail') {
          const failReason = taskData?.fail_reason || taskData?.resultJson?.error || 'Unknown error';
          console.error(`[Inngest] KIE generation failed:`, { taskId, failReason, taskData });
          throw new Error(`KIE generation failed: ${failReason}`);
        } else if (state !== 'waiting' && state !== 'queuing' && state !== 'generating') {
          console.error(`[Inngest] Unknown KIE job state:`, { state, taskData });
          throw new Error(`Unknown KIE job state: ${state}`);
        }

        polls++;
      }

      if (!imageUrl) {
        throw new Error('KIE generation timed out after 2 minutes. Please try again.');
      }

      // Upload KIE image to S3 for consistency
      if (isS3Configured()) {
        console.log(`[Inngest] Uploading KIE image to S3: ${imageUrl}`);
        try {
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch KIE image: ${imageResponse.status}`);
          }
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const base64Data = `data:image/png;base64,${imageBuffer.toString('base64')}`;
          const uploadResult = await uploadImageToS3(base64Data);
          if (!uploadResult.success || !uploadResult.url) {
            console.warn('[Inngest] S3 upload failed, using original KIE URL:', uploadResult);
            // Keep original imageUrl instead of throwing
          } else {
            console.log(`[Inngest] S3 upload successful: ${uploadResult.url}`);
            imageUrl = uploadResult.url;
          }
        } catch (error) {
          console.error('[Inngest] S3 upload error, using original KIE URL:', error);
          // Keep original imageUrl instead of throwing
        }
      }

    } else {
      // Use Gemini
      const geminiApiKey = userApiKeys?.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('Gemini API key not configured');
      }

      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      const { generateText } = await import('ai');

      const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });

      const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> = [];

      // Add reference images for Gemini
      if (referenceImages.length > 0) {
        messageContent.push({
          type: 'text',
          text: `REFERENCE IMAGES FOR VISUAL CONSISTENCY:\n${referenceImages.map((r) => `- ${r.name}`).join('\n')}\n\n`,
        });

        for (const ref of referenceImages) {
          if (ref.imageUrl) {
            try {
              let base64Data: string;
              let mimeType: string;

              if (ref.imageUrl.startsWith('data:')) {
                const matches = ref.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                  [, mimeType, base64Data] = matches;
                  messageContent.push({ type: 'image', image: base64Data, mimeType });
                  messageContent.push({ type: 'text', text: `(Above: ${ref.name})` });
                }
              } else if (ref.imageUrl.startsWith('http')) {
                const imageResponse = await fetch(ref.imageUrl);
                if (imageResponse.ok) {
                  const arrayBuffer = await imageResponse.arrayBuffer();
                  base64Data = Buffer.from(arrayBuffer).toString('base64');
                  mimeType = imageResponse.headers.get('content-type') || 'image/png';
                  messageContent.push({ type: 'image', image: base64Data, mimeType });
                  messageContent.push({ type: 'text', text: `(Above: ${ref.name})` });
                }
              }
            } catch (e) {
              console.error(`Failed to load reference image: ${e}`);
            }
          }
        }
      }

      messageContent.push({ type: 'text', text: scene.prompt });

      const result = await generateText({
        model: google('gemini-3-pro-image-preview'),
        messages: [{ role: 'user', content: messageContent }],
        providerOptions: {
          google: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio },
          },
        },
      });

      const generatedImage = result.files?.[0];
      if (!generatedImage?.base64) {
        throw new Error('No image generated');
      }

      const mimeType = (generatedImage as { mimeType?: string }).mimeType || 'image/png';
      imageUrl = `data:${mimeType};base64,${generatedImage.base64}`;
    }

    // Upload to S3 if configured
    if (isS3Configured() && imageUrl && imageUrl.startsWith('data:')) {
      const uploadResult = await uploadImageToS3(imageUrl, projectId);
      if (uploadResult.success && uploadResult.url) {
        imageUrl = uploadResult.url;
      }
    }

    // Save to scene
    if (!imageUrl) {
      throw new Error('Image generation failed: No image URL generated');
    }

    await prisma.scene.update({
      where: { id: scene.sceneId },
      data: { imageUrl },
    });

    // Invalidate cache so next fetch gets fresh data
    cache.invalidate(cacheKeys.userProjects(userId));

    // Spend credits (reuse userApiKeys from earlier lookup to avoid duplicate DB query)
    const creditCost = getImageCreditCost(resolution as ImageResolution);

    await spendCredits(
      userId,
      creditCost,
      'image',
      `Image generation (scene ${scene.sceneNumber})`,
      projectId,
      imageProvider as Provider,
      undefined,
      imageProvider.startsWith('modal') ? 0 : undefined
    );

    console.log(`[Inngest] Scene ${scene.sceneNumber} completed`);
    return { sceneId: scene.sceneId, success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Inngest] Scene ${scene.sceneNumber} failed: ${errorMessage}`);
    return { sceneId: scene.sceneId, success: false, error: errorMessage };
  }
}

// Generate images for a batch of scenes - processes them in parallel batches
export const generateImagesBatch = inngest.createFunction(
  {
    id: 'generate-images-batch',
    name: 'Generate Images Batch',
    retries: 3,
    cancelOn: [
      {
        event: 'image/batch.cancel',
        match: 'data.batchId',
      },
    ],
  },
  { event: 'image/generate.batch' },
  async ({ event, step }) => {
    const { projectId, userId, batchId, scenes, aspectRatio, resolution, referenceImages } = event.data;

    console.log(`[Inngest] Starting batch ${batchId} with ${scenes.length} scenes (parallel: ${PARALLEL_IMAGES})`);

    // Determine provider and model
    const userApiKeys = await step.run('get-user-api-keys', async () => {
      return await prisma.apiKeys.findUnique({
        where: { userId },
      });
    });

    const imageProvider = userApiKeys?.imageProvider || 'gemini';
    const imageModel = imageProvider === 'modal' || imageProvider === 'modal-edit'
      ? 'modal'
      : userApiKeys?.kieImageModel || 'imagen-3.0-generate-001';

    console.log(`[Inngest] Using provider: ${imageProvider}, model: ${imageModel}`);

    // Update batch status to processing with provider/model
    await step.run('update-batch-status-processing', async () => {
      await prisma.imageGenerationJob.update({
        where: { id: batchId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          imageProvider,
          imageModel,
        },
      });
    });

    const allResults: Array<{ sceneId: string; success: boolean; error?: string }> = [];

    // Process scenes in parallel batches
    const totalBatches = Math.ceil(scenes.length / PARALLEL_IMAGES);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * PARALLEL_IMAGES;
      const endIdx = Math.min(startIdx + PARALLEL_IMAGES, scenes.length);
      const batchScenes = scenes.slice(startIdx, endIdx);

      // Generate this batch of images in parallel
      const batchResults = await step.run(`generate-parallel-batch-${batchIndex + 1}`, async () => {
        console.log(`[Inngest] Parallel batch ${batchIndex + 1}/${totalBatches}: scenes ${startIdx + 1}-${endIdx}`);

        const promises = batchScenes.map((scene: { sceneId: string; sceneNumber: number; prompt: string }) =>
          generateSingleImage(scene, userId, projectId, aspectRatio, resolution, referenceImages)
        );

        return Promise.all(promises);
      });

      allResults.push(...batchResults);

      // Update progress after each parallel batch
      await step.run(`update-progress-batch-${batchIndex + 1}`, async () => {
        const completed = allResults.filter(r => r.success).length;
        const failed = allResults.filter(r => !r.success).length;

        await prisma.imageGenerationJob.update({
          where: { id: batchId },
          data: {
            completedScenes: completed,
            failedScenes: failed,
            progress: Math.round((allResults.length / scenes.length) * 100),
          },
        });
      });
    }

    // Final update
    await step.run('update-batch-status-complete', async () => {
      const completed = allResults.filter(r => r.success).length;
      const failed = allResults.filter(r => !r.success).length;

      await prisma.imageGenerationJob.update({
        where: { id: batchId },
        data: {
          status: failed > 0 ? 'completed_with_errors' : 'completed',
          completedAt: new Date(),
          completedScenes: completed,
          failedScenes: failed,
          progress: 100,
          errorDetails: failed > 0
            ? JSON.stringify(allResults.filter(r => !r.success))
            : null,
        },
      });
    });

    console.log(`[Inngest] Batch ${batchId} completed: ${allResults.filter(r => r.success).length}/${scenes.length} successful`);

    return { batchId, results: allResults };
  }
);
