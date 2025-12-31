import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, getImageCreditCost } from '@/lib/services/credits';
import { uploadImageToS3, isS3Configured } from '@/lib/services/s3-upload';
import type { ImageResolution, Provider } from '@/lib/services/real-costs';

// Generate images for a batch of scenes - processes them sequentially
export const generateImagesBatch = inngest.createFunction(
  {
    id: 'generate-images-batch',
    name: 'Generate Images Batch',
    // Retry configuration
    retries: 3,
    // Allow up to 30 minutes for the entire batch
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

    console.log(`[Inngest] Starting batch ${batchId} with ${scenes.length} scenes`);

    // Update batch status to processing
    await step.run('update-batch-status-processing', async () => {
      await prisma.imageGenerationJob.update({
        where: { id: batchId },
        data: { status: 'processing', startedAt: new Date() },
      });
    });

    const results: Array<{ sceneId: string; success: boolean; error?: string }> = [];

    // Process each scene sequentially
    for (const scene of scenes) {
      const result = await step.run(`generate-scene-${scene.sceneNumber}`, async () => {
        console.log(`[Inngest] Generating image for scene ${scene.sceneNumber}`);

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

            if (imageProvider === 'modal-edit') {
              body.reference_images = referenceImages.map((r: { name: string; imageUrl: string }) => r.imageUrl);
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
                text: `REFERENCE IMAGES FOR VISUAL CONSISTENCY:\n${referenceImages.map((r: { name: string; imageUrl: string }) => `- ${r.name}`).join('\n')}\n\n`,
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

          // Spend credits
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
      });

      results.push(result);

      // Update progress
      await step.run(`update-progress-${scene.sceneNumber}`, async () => {
        const completed = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        await prisma.imageGenerationJob.update({
          where: { id: batchId },
          data: {
            completedScenes: completed,
            failedScenes: failed,
            progress: Math.round((results.length / scenes.length) * 100),
          },
        });
      });
    }

    // Final update
    await step.run('update-batch-status-complete', async () => {
      const completed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      await prisma.imageGenerationJob.update({
        where: { id: batchId },
        data: {
          status: failed > 0 ? 'completed_with_errors' : 'completed',
          completedAt: new Date(),
          completedScenes: completed,
          failedScenes: failed,
          progress: 100,
          errorDetails: failed > 0
            ? JSON.stringify(results.filter(r => !r.success))
            : null,
        },
      });
    });

    console.log(`[Inngest] Batch ${batchId} completed: ${results.filter(r => r.success).length}/${scenes.length} successful`);

    return { batchId, results };
  }
);
