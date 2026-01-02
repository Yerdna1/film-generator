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
    let imageUrl: string;

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

    // Update batch status to processing
    await step.run('update-batch-status-processing', async () => {
      await prisma.imageGenerationJob.update({
        where: { id: batchId },
        data: { status: 'processing', startedAt: new Date() },
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
