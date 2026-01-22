import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, getImageCreditCost } from '@/lib/services/credits';
import { uploadImageToS3, isS3Configured } from '@/lib/services/s3-upload';
import { cache, cacheKeys } from '@/lib/cache';
import { callExternalApi, pollKieTask } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import { buildApiUrl } from '@/lib/constants/api-endpoints';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { ImageResolution, Provider } from '@/lib/services/real-costs';

// Number of images to generate in parallel
const PARALLEL_IMAGES = 5;

// KIE model mapping: UI names to API model names
const KIE_MODEL_MAPPING: Record<string, string> = {
  'nano-banana-pro': 'google/gemini-3-pro-image-preview',
  'google-nano-banana-pro': 'google/gemini-3-pro-image-preview',
  'google-nano-banana-pro-4k': 'google/gemini-3-pro-image-preview',
  'seedream-4-5': 'seedream/4-5-text-to-image',
  'seedream/4-5-text-to-image': 'seedream/4-5-text-to-image',
  'grok-imagine': 'grok-imagine/text-to-image',
  'flux-pro': 'flux-2/pro-1.1-text-to-image',
};

// Generate a single image using the API wrapper
async function generateSingleImage(
  scene: { sceneId: string; sceneNumber: number; prompt: string },
  userId: string,
  projectId: string,
  aspectRatio: string,
  resolution: string,
  referenceImages: Array<{ name: string; imageUrl: string }>
): Promise<{ sceneId: string; success: boolean; error?: string }> {
  try {
    // Get provider configuration - single source of truth
    const config = await getProviderConfig({
      userId,
      projectId,
      type: 'image',
    });

    const { provider, apiKey, model, endpoint } = config;

    let imageUrl: string | undefined;

    if (provider === 'gemini') {
      // Special handling for Gemini - uses AI SDK
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }

      const google = createGoogleGenerativeAI({ apiKey });

      // Build message content with optional reference images
      const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> = [];

      if (referenceImages && referenceImages.length > 0) {
        messageContent.push({
          type: 'text',
          text: `REFERENCE IMAGES FOR VISUAL CONSISTENCY:\n${referenceImages.map(r => `- ${r.name}`).join('\n')}\n\n`,
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

      const mimeType = (generatedImage as any).mimeType || 'image/png';
      imageUrl = `data:${mimeType};base64,${generatedImage.base64}`;

    } else {
      // Use API wrapper for other providers
      let requestBody: any;
      const randomSeed = Math.floor(Math.random() * 2147483647);

      switch (provider) {
        case 'modal':
          requestBody = {
            prompt: scene.prompt,
            aspect_ratio: aspectRatio,
            resolution,
            seed: randomSeed,
          };
          break;

        case 'modal-edit':
          requestBody = {
            prompt: scene.prompt,
            aspect_ratio: aspectRatio,
            reference_images: referenceImages.map(ref => ref.imageUrl),
            seed: randomSeed,
          };
          break;

        case 'kie':
          // Map model name from UI to API format
          const rawModel = model || 'seedream/4-5-text-to-image';
          const kieModel = KIE_MODEL_MAPPING[rawModel] || rawModel;

          requestBody = {
            text: scene.prompt,
            model: kieModel,
            aspect_ratio: aspectRatio,
            // Map resolution to KIE format (they expect numeric string like '1024', '2048')
            resolution: resolution === '2k' ? '2048' : resolution === '4k' ? '4096' : '1024',
            seed: randomSeed,
          };
          break;

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      console.log(`[Inngest] Calling ${provider} API with model: ${model}`);

      const response = await callExternalApi({
        userId,
        projectId,
        type: 'image',
        body: requestBody,
        endpoint,
        showLoadingMessage: false,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Handle KIE response
      if (provider === 'kie') {
        // KIE /api/v1/generate/image returns task ID in response.data.taskId
        const taskId = response.data?.taskId;

        if (!taskId) {
          console.error('[Inngest] KIE response:', JSON.stringify(response.data, null, 2));
          throw new Error('KIE AI did not return a task ID');
        }

        console.log(`[Inngest] KIE task created: ${taskId}`);

        // Poll for task completion using the same pattern as the working script
        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));

          const statusResponse = await fetch(
            `${buildApiUrl('kie' as any, `/api/v1/fetch/image/${taskId}`)}`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
              },
            }
          );

          if (!statusResponse.ok) {
            throw new Error(`Failed to check KIE status: ${statusResponse.statusText}`);
          }

          const statusData = await statusResponse.json();
          const state = statusData.data?.state;

          console.log(`[Inngest] KIE status: ${state}, attempt ${attempts + 1}/${maxAttempts}`);

          if (state === 'COMPLETED') {
            imageUrl = statusData.data?.result?.url;
            if (!imageUrl) {
              throw new Error('KIE completed but no image URL in result');
            }
            break;
          }

          if (state === 'FAILED') {
            throw new Error(`KIE task failed: ${statusData.data?.error || 'Unknown error'}`);
          }

          attempts++;
        }

        if (!imageUrl) {
          throw new Error('KIE task timed out');
        }

      } else {
        // Modal providers
        if (response.data.image) {
          imageUrl = response.data.image.startsWith('data:')
            ? response.data.image
            : `data:image/png;base64,${response.data.image}`;
        } else if (response.data.imageUrl) {
          imageUrl = response.data.imageUrl;
        }
      }
    }

    if (!imageUrl) {
      throw new Error('Image generation failed: No image URL generated');
    }

    // Upload to S3 if configured
    if (isS3Configured() && imageUrl.startsWith('data:')) {
      const uploadResult = await uploadImageToS3(imageUrl, projectId);
      if (uploadResult.success && uploadResult.url) {
        imageUrl = uploadResult.url;
      }
    }

    // Save to scene
    await prisma.scene.update({
      where: { id: scene.sceneId },
      data: { imageUrl },
    });

    // Invalidate cache so next fetch gets fresh data
    cache.invalidate(cacheKeys.userProjects(userId));

    // Spend credits
    const creditCost = getImageCreditCost(resolution as ImageResolution);
    let realCost = 0.09; // Default cost
    if (provider === 'kie' && model) {
      // Set costs based on model
      if (model.includes('nano-banana')) {
        realCost = model.includes('4k') ? 0.12 : 0.09;
      } else if (model.includes('seedream')) {
        realCost = 0.10; // Seedream 4.5
      } else if (model.includes('grok')) {
        realCost = 0.02;
      } else if (model.includes('flux')) {
        realCost = 0.15; // Flux Pro
      }
    }

    await spendCredits(
      userId,
      creditCost,
      'image',
      `Image generation (scene ${scene.sceneNumber})`,
      projectId,
      provider as Provider,
      undefined,
      realCost
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

    // Get provider configuration
    const providerConfig = await step.run('get-provider-config', async () => {
      return await getProviderConfig({
        userId,
        projectId,
        type: 'image',
      });
    });

    console.log(`[Inngest] Using provider: ${providerConfig.provider}, model: ${providerConfig.model}`);

    // Update batch status to processing
    await step.run('update-batch-status-processing', async () => {
      await prisma.imageGenerationJob.update({
        where: { id: batchId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          imageProvider: providerConfig.provider,
          imageModel: providerConfig.model || 'default',
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