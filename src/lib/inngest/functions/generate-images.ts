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
  'flux-kontext-dev/max': 'flux-kontext-dev/max', // Direct mapping
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
  // Declare variables outside try block for error handler access
  let provider: string | undefined;
  let apiKey: string | undefined;
  let model: string | undefined;
  let endpoint: string | undefined;

  try {
    // Get provider configuration - single source of truth
    const config = await getProviderConfig({
      userId,
      projectId,
      type: 'image',
    });

    // Assign values from config
    provider = config.provider;
    apiKey = config.apiKey;
    model = config.model;
    endpoint = config.endpoint;

    console.log(`[Inngest] Provider config loaded:`, {
      provider,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      model,
      endpoint,
    });

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
          // Use the model name directly from config - KIE API uses the model name as-is
          const kieModel = model || 'seedream/4-5-text-to-image';

          console.log(`[Inngest] KIE model:`, {
            kieModel,
            mapping: KIE_MODEL_MAPPING[kieModel]
          });

          // KIE uses createTask with model and input structure
          requestBody = {
            model: kieModel,
            input: {
              prompt: scene.prompt,
              aspect_ratio: aspectRatio,
              // Additional parameters based on model type
              ...(kieModel.includes('ideogram') && { render_text: true }),
              ...(kieModel.includes('flux') && { guidance_scale: 7.5 }),
            },
          };

          console.log(`[Inngest] KIE request body:`, JSON.stringify(requestBody, null, 2));
          break;

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      console.log(`[Inngest] Calling ${provider} API with model: ${model}`);
      console.log(`[Inngest] API call details:`, {
        provider,
        type: 'image',
        endpoint,
        hasRequestBody: !!requestBody,
        bodyKeys: requestBody ? Object.keys(requestBody) : null
      });

      const response = await callExternalApi({
        userId,
        projectId,
        type: 'image',
        body: requestBody,
        endpoint,
        showLoadingMessage: false,
      });

      console.log(`[Inngest] API response:`, {
        status: response.status,
        provider: response.provider,
        model: response.model,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataString: typeof response.data === 'string' ? response.data : undefined,
        error: response.error,
        dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : null,
        fullResponse: JSON.stringify(response, null, 2)
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Handle KIE response
      if (provider === 'kie') {
        // KIE createTask returns the response in data field with taskId
        // The response.data is the full API response: { code: 200, msg: "success", data: { taskId: "..." } }
        const responseData = response.data;
        const taskId = responseData?.data?.taskId;

        if (!taskId) {
          console.error('[Inngest] KIE response structure issue:', {
            hasResponseData: !!responseData,
            responseDataType: typeof responseData,
            responseDataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
            hasNestedData: !!responseData?.data,
            nestedDataType: typeof responseData?.data,
            nestedDataKeys: responseData?.data && typeof responseData.data === 'object' ? Object.keys(responseData.data) : null,
            fullResponse: JSON.stringify(responseData, null, 2),
          });
          throw new Error('KIE AI did not return a task ID');
        }

        console.log(`[Inngest] KIE task created: ${taskId}`);

        // Poll for task completion using the same pattern as the working script
        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));

          const statusResponse = await fetch(
            `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
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

          // Check if we have the expected response structure
          if (statusData.code !== 200) {
            throw new Error(statusData.msg || 'Failed to check task status');
          }

          const taskData = statusData.data;
          const state = taskData?.state;

          console.log(`[Inngest] KIE status: ${state}, attempt ${attempts + 1}/${maxAttempts}`);

          if (state === 'success') {
            // Extract image URL from resultJson
            if (taskData.resultJson) {
              try {
                const result = typeof taskData.resultJson === 'string'
                  ? JSON.parse(taskData.resultJson)
                  : taskData.resultJson;
                imageUrl = result.resultUrls?.[0] || result.imageUrl || result.image_url || result.url;
                if (!imageUrl && result.images?.length > 0) {
                  imageUrl = result.images[0];
                }
              } catch (e) {
                console.error('[Inngest] Failed to parse KIE resultJson:', e);
              }
            }

            // Fallback to direct URL fields
            if (!imageUrl) {
              imageUrl = taskData.imageUrl || taskData.image_url || taskData.resultUrl;
            }

            if (!imageUrl) {
              throw new Error('KIE completed but no image URL in result');
            }
            break;
          }

          if (state === 'fail') {
            const failReason = taskData.fail_reason || taskData.resultJson?.error || 'Unknown error';
            throw new Error(`KIE task failed: ${failReason}`);
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
        if (model.includes('kontext')) {
          realCost = 0.20; // Flux Kontext models are more expensive
        } else {
          realCost = 0.15; // Flux Pro
        }
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
    const errorMessage = error instanceof Error ? error.message : (error ? String(error) : 'No message available');
    console.error(`[Inngest] Scene ${scene.sceneNumber} failed:`, error);
    console.error(`[Inngest] Error details:`, {
      sceneNumber: scene.sceneNumber,
      provider,
      model,
      errorMessage,
      errorType: error?.constructor?.name,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorValue: error,
      errorStringified: JSON.stringify(error)
    });
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