// Music generation Inngest function
import { inngest } from '../../client';
import { prisma } from '@/lib/db/prisma';
import { getProviderConfig } from '@/lib/providers';
import { generateMusic } from './music-generator';
import type { MusicGenerationRequest, MusicGenerationOptions } from './types';

// Generate music using Inngest
export const generateMusicBatch = inngest.createFunction(
  {
    id: 'generate-music-batch',
    name: 'Generate Music',
    retries: 3,
  },
  { event: 'music/generate.batch' },
  async ({ event, step }) => {
    const { projectId, userId, batchId, prompt, instrumental, title, userHasOwnApiKey = false } = event.data;

    console.log(`[Inngest] Starting music generation ${batchId}`);
    console.log(`[Inngest] User has own API key: ${userHasOwnApiKey} - ${userHasOwnApiKey ? 'skipping credit charges' : 'charging credits'}`);

    // Get provider configuration
    const providerConfig = await step.run('get-provider-config', async () => {
      return await getProviderConfig({
        userId,
        projectId,
        type: 'music',
      });
    });

    console.log(`[Inngest] Using provider: ${providerConfig.provider}, model: ${providerConfig.model}`);

    // Update batch status to processing
    await step.run('update-batch-status-processing', async () => {
      await prisma.musicGenerationJob.update({
        where: { id: batchId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          musicProvider: providerConfig.provider,
          musicModel: providerConfig.model || 'default',
        },
      });
    });

    // Prepare request and options
    const request: MusicGenerationRequest = {
      prompt,
      instrumental,
      title,
    };

    const options: MusicGenerationOptions = {
      userId,
      projectId,
      userHasOwnApiKey,
    };

    // Generate music
    const result = await step.run('generate-music', async () => {
      return await generateMusic(request, options);
    });

    // Update batch status
    await step.run('update-batch-status-final', async () => {
      if (result.success) {
        await prisma.musicGenerationJob.update({
          where: { id: batchId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            progress: 100,
            audioUrl: result.audioUrl,
            title: result.title,
          },
        });
      } else {
        await prisma.musicGenerationJob.update({
          where: { id: batchId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            progress: 0,
            errorDetails: result.error || 'Music generation failed',
          },
        });
      }
    });

    console.log(`[Inngest] Music generation ${batchId} completed: ${result.success ? 'success' : 'failed'}`);

    return { batchId, result };
  }
);
