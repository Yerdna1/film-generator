import { inngest } from '../client';
import { NonRetriableError } from 'inngest';
import { prisma } from '@/lib/db/prisma';
import { getProviderConfig } from '@/lib/providers/provider-config';
import { callExternalApi } from '@/lib/providers/api-wrapper';
import {
  SCENES_PER_BATCH,
  DEFAULT_STORY_MODEL,
  buildCharacterDescriptions,
  getCharacterNames,
  getStyleDescription,
  buildSceneGenerationPrompt,
  parseLLMResponse,
  validateScenes,
  saveScenesToDatabase,
  getExistingSceneCount,
  spendSceneCredits,
  type SceneGenerationData,
  type Scene,
} from './scene-generation';

// Generate scenes for a project using LLM - runs in background
export const generateScenesBatch = inngest.createFunction(
  {
    id: 'generate-scenes-batch',
    name: 'Generate Scenes',
    retries: 2,
  },
  { event: 'scenes/generate.batch' },
  async ({ event, step }) => {
    const { projectId, userId, jobId, story, characters, style, sceneCount, skipCreditCheck = false } = event.data as SceneGenerationData;

    console.log(`[Inngest Scenes] Function invoked at ${new Date().toISOString()}`);
    console.log(`[Inngest Scenes] Starting job ${jobId} for ${sceneCount} scenes, skipCreditCheck=${skipCreditCheck}`);

    // Update job status to processing
    await step.run('update-job-processing', async () => {
      await prisma.sceneGenerationJob.update({
        where: { id: jobId },
        data: { status: 'processing', startedAt: new Date() },
      });
    });

    // Get project to retrieve storyModel setting
    const project = await step.run('get-project', async () => {
      return prisma.project.findUnique({
        where: { id: projectId },
      });
    });

    if (!project) {
      await step.run('update-job-failed-no-project', async () => {
        await prisma.sceneGenerationJob.update({
          where: { id: jobId },
          data: { status: 'failed', errorDetails: 'Project not found' },
        });
      });
      return { success: false, error: 'Project not found' };
    }

    // Get storyModel from project settings (from Step1)
    const projectSettings = project.settings as any;
    const storyModel = projectSettings?.storyModel || DEFAULT_STORY_MODEL;

    console.log(`[Inngest Scenes] Using storyModel from project settings: ${storyModel}`);

    // Get provider configuration using centralized system
    let providerConfig;
    let llmProvider: string;
    let llmModel: string;

    try {
      providerConfig = await step.run('get-provider-config', async () => {
        return getProviderConfig({
          userId, // Use actual userId from event data
          projectId,
          type: 'llm',
        });
      });

      llmProvider = providerConfig.provider;
      llmModel = providerConfig.model || storyModel;

      console.log(`[Inngest Scenes] Provider config: provider=${llmProvider}, model=${llmModel}, storyModel=${storyModel}`);
    } catch (error: any) {
      console.error('[Inngest Scenes] Failed to get provider config:', error);
      await step.run('update-job-failed-no-provider', async () => {
        await prisma.sceneGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errorDetails: error.message || 'No LLM provider configured',
          },
        });
      });
      return { success: false, error: error.message || 'No LLM provider configured' };
    }

    // Update job with LLM provider and model
    await step.run('update-job-with-llm-info', async () => {
      await prisma.sceneGenerationJob.update({
        where: { id: jobId },
        data: {
          llmProvider,
          llmModel,
        },
      });
    });

    // Prepare prompt data
    const characterDescriptions = buildCharacterDescriptions(characters);
    const characterNames = getCharacterNames(characters);
    const styleDescription = getStyleDescription(style);

    // Calculate batches
    const totalBatches = Math.ceil(sceneCount / SCENES_PER_BATCH);
    let totalSavedScenes = 0;

    console.log(`[Inngest Scenes] Will generate ${sceneCount} scenes in ${totalBatches} batches`);

    // Check how many scenes already exist (for resume after partial failure)
    const existingSceneCount = await step.run('check-existing-scenes', async () => {
      return getExistingSceneCount(projectId);
    });

    if (existingSceneCount > 0) {
      console.log(`[Inngest Scenes] Found ${existingSceneCount} existing scenes, will continue from there`);
      totalSavedScenes = existingSceneCount;
    }

    // Generate scenes in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startScene = batchIndex * SCENES_PER_BATCH + 1;
      const endScene = Math.min((batchIndex + 1) * SCENES_PER_BATCH, sceneCount);
      const batchSize = endScene - startScene + 1;

      // Skip batches that are already saved
      if (startScene <= existingSceneCount) {
        console.log(`[Inngest Scenes] Skipping batch ${batchIndex + 1} (scenes ${startScene}-${endScene}) - already saved`);
        continue;
      }

      const batchResult = await step.run(`generate-batch-${batchIndex + 1}`, async () => {
        console.log(`[Inngest Scenes] Generating batch ${batchIndex + 1}/${totalBatches}: scenes ${startScene}-${endScene}`);

        // Build prompt
        const prompt = buildSceneGenerationPrompt({
          startScene,
          endScene,
          batchSize,
          story,
          styleDescription,
          characterDescriptions,
          characterNames,
          sceneCount,
          batchIndex,
          totalBatches,
        });

        // Call LLM using centralized API wrapper
        const llmResponse = await callExternalApi({
          userId, // Use actual userId from event data
          projectId,
          type: 'llm',
          body: {
            messages: [
              { role: 'system', content: 'You are an expert storyteller and screenwriter. Generate scenes for a movie based on the provided story.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 16384,
          },
          showLoadingMessage: false,
        });

        const fullResponse = llmResponse.data?.choices?.[0]?.message?.content || '';
        const llmError = llmResponse.error;

        if (llmError) {
          return { success: false, error: llmError };
        }

        // Parse response
        const scenes = parseLLMResponse(fullResponse, batchIndex);
        validateScenes(scenes, batchSize, batchIndex);

        console.log(`[Inngest Scenes] Batch ${batchIndex + 1} generated ${scenes.length} scenes`);
        return { success: true, scenes };
      });

      // Check if batch generation failed with a non-retriable error
      if (batchResult && !batchResult.success && 'error' in batchResult) {
        const errorMessage = batchResult.error;
        // If it's a credit error or other fatal error, fail the job and stop
        await step.run('fail-job-fatal-error', async () => {
          await prisma.sceneGenerationJob.update({
            where: { id: jobId },
            data: {
              status: 'failed',
              errorDetails: errorMessage
            },
          });
        });

        throw new NonRetriableError(errorMessage);
      }

      const batchScenes = (batchResult && 'scenes' in batchResult) ? batchResult.scenes : [];

      // Save this batch to DB immediately (so we don't lose progress if later batch fails)
      await step.run(`save-batch-${batchIndex + 1}`, async () => {
        console.log(`[Inngest Scenes] Saving batch ${batchIndex + 1} (${batchScenes.length} scenes) to DB`);
        return saveScenesToDatabase({ projectId, scenes: batchScenes, characters });
      });

      totalSavedScenes += batchScenes.length;

      // Update progress after each batch
      await step.run(`update-progress-${batchIndex + 1}`, async () => {
        const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
        await prisma.sceneGenerationJob.update({
          where: { id: jobId },
          data: { progress, completedScenes: totalSavedScenes },
        });
      });
    }

    // Get final scene count from DB (most accurate)
    const finalSceneCount = await step.run('get-final-count', async () => {
      return prisma.scene.count({ where: { projectId } });
    });

    // Spend credits (unless user provides own API key)
    if (!skipCreditCheck) {
      await step.run('spend-credits', async () => {
        await spendSceneCredits({
          userId,
          sceneCount: finalSceneCount,
          llmProvider: llmProvider as 'openrouter' | 'gemini' | 'claude-sdk' | 'modal' | 'kie',
          storyModel,
          projectId,
          totalBatches,
        });
      });
    } else {
      console.log(`[Inngest Scenes] Skipping credit spend - user provided their own API key`);
    }

    // Update job as completed
    await step.run('update-job-completed', async () => {
      await prisma.sceneGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedScenes: finalSceneCount,
          progress: 100,
        },
      });
    });

    console.log(`[Inngest Scenes] Job ${jobId} completed with ${finalSceneCount} scenes in ${totalBatches} batches`);

    return { success: true, sceneCount: finalSceneCount, batches: totalBatches };
  }
);

// Synchronous version for when Inngest is not available
export async function generateScenesSynchronously(data: SceneGenerationData) {
  const { projectId, userId, jobId, story, characters, style, sceneCount, skipCreditCheck = false } = data;

  console.log(`[Sync Scenes] Starting job ${jobId} for ${sceneCount} scenes, skipCreditCheck=${skipCreditCheck}`);

  // Update job status to processing
  await prisma.sceneGenerationJob.update({
    where: { id: jobId },
    data: { status: 'processing', startedAt: new Date() },
  });

  // Get project to retrieve storyModel setting
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    await prisma.sceneGenerationJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorDetails: 'Project not found' },
    });
    return { success: false, error: 'Project not found' };
  }

  // Get storyModel from project settings (from Step1)
  const projectSettings = project.settings as any;
  const storyModel = projectSettings?.storyModel || DEFAULT_STORY_MODEL;

  console.log(`[Sync Scenes] Using storyModel from project settings: ${storyModel}`);

  // Get provider configuration using centralized system
  let providerConfig;
  let llmProvider: string;
  let llmModel: string;

  try {
    providerConfig = await getProviderConfig({
      userId,
      projectId,
      type: 'llm',
    });

    llmProvider = providerConfig.provider;
    llmModel = providerConfig.model || storyModel;

    console.log(`[Sync Scenes] Provider config: provider=${llmProvider}, model=${llmModel}`);
  } catch (error: any) {
    console.error('[Sync Scenes] Failed to get provider config:', error);
    await prisma.sceneGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorDetails: error.message || 'No LLM provider configured',
      },
    });
    return { success: false, error: error.message || 'No LLM provider configured' };
  }

  // Prepare prompt data
  const characterDescriptions = buildCharacterDescriptions(characters);
  const characterNames = getCharacterNames(characters);
  const styleDescription = getStyleDescription(style);

  // Calculate batches
  const totalBatches = Math.ceil(sceneCount / SCENES_PER_BATCH);
  let totalSavedScenes = 0;

  console.log(`[Sync Scenes] Will generate ${sceneCount} scenes in ${totalBatches} batches`);

  // Check how many scenes already exist
  const existingSceneCount = await getExistingSceneCount(projectId);

  if (existingSceneCount > 0) {
    console.log(`[Sync Scenes] Found ${existingSceneCount} existing scenes, will continue from there`);
    totalSavedScenes = existingSceneCount;
  }

  // Generate scenes in batches
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startScene = batchIndex * SCENES_PER_BATCH + 1;
    const endScene = Math.min((batchIndex + 1) * SCENES_PER_BATCH, sceneCount);
    const batchSize = endScene - startScene + 1;

    // Skip batches that are already saved
    if (startScene <= existingSceneCount) {
      console.log(`[Sync Scenes] Skipping batch ${batchIndex + 1} (scenes ${startScene}-${endScene}) - already saved`);
      continue;
    }

    console.log(`[Sync Scenes] Generating batch ${batchIndex + 1}/${totalBatches}: scenes ${startScene}-${endScene}`);

    // Build prompt
    const prompt = buildSceneGenerationPrompt({
      startScene,
      endScene,
      batchSize,
      story,
      styleDescription,
      characterDescriptions,
      characterNames,
      sceneCount,
      batchIndex,
      totalBatches,
    });

    // Call LLM using centralized API wrapper
    const llmResponse = await callExternalApi({
      userId,
      projectId,
      type: 'llm',
      body: {
        messages: [
          { role: 'system', content: 'You are an expert storyteller and screenwriter. Generate scenes for a movie based on the provided story.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 16384,
      },
      showLoadingMessage: false,
    });

    if (llmResponse.error) {
      throw new Error(llmResponse.error);
    }

    const fullResponse = llmResponse.data?.choices?.[0]?.message?.content || '';

    // Parse response
    const scenes = parseLLMResponse(fullResponse, batchIndex);

    if (!Array.isArray(scenes) || scenes.length < batchSize) {
      throw new Error(`Batch ${batchIndex + 1} returned invalid or insufficient scenes`);
    }

    console.log(`[Sync Scenes] Batch ${batchIndex + 1} generated ${scenes.length} scenes`);

    // Save batch to DB
    const saved = await saveScenesToDatabase({ projectId, scenes, characters });
    totalSavedScenes += saved;

    // Update progress
    const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
    await prisma.sceneGenerationJob.update({
      where: { id: jobId },
      data: { progress, completedScenes: totalSavedScenes },
    });
  }

  // Get final scene count
  const finalSceneCount = await prisma.scene.count({ where: { projectId } });

  // Spend credits (unless user provides own API key)
  if (!skipCreditCheck) {
    await spendSceneCredits({
      userId,
      sceneCount: finalSceneCount,
      llmProvider: llmProvider as 'openrouter' | 'gemini' | 'claude-sdk' | 'modal' | 'kie',
      storyModel,
      projectId,
      totalBatches,
    });
  } else {
    console.log(`[Sync Scenes] Skipping credit spend - user provided their own API key`);
  }

  // Update job as completed
  await prisma.sceneGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      completedScenes: finalSceneCount,
      progress: 100,
    },
  });

  console.log(`[Sync Scenes] Job ${jobId} completed with ${finalSceneCount} scenes`);

  return { success: true, sceneCount: finalSceneCount, batches: totalBatches };
}
