import { inngest } from '../client';
import { NonRetriableError } from 'inngest';
import { prisma } from '@/lib/db/prisma';
import { getProviderConfig } from '@/lib/providers/provider-config';
import { callExternalApi } from '@/lib/providers/api-wrapper';
import { spendCredits, COSTS } from '@/lib/services/credits';
import type { Provider } from '@/lib/services/real-costs';

interface PromptGenerationData {
  projectId: string;
  userId: string;
  jobId: string;
  story: {
    title: string;
    genre: string;
    tone: string;
    setting: string;
    concept: string;
  };
  style: string;
  settings: {
    aspectRatio: string;
    videoLanguage: string;
    sceneCount: number;
    characterCount: number;
    imageProvider: string;
    voiceProvider: string;
  };
  skipCreditCheck?: boolean;
}

// Generate master prompt for a project using LLM - runs in background
export const generatePromptBatch = inngest.createFunction(
  {
    id: 'generate-prompt-batch',
    name: 'Generate Master Prompt',
    retries: 2,
  },
  { event: 'prompt/generate.batch' },
  async ({ event, step }) => {
    const { projectId, userId, jobId, story, style, settings, skipCreditCheck = false } = event.data as PromptGenerationData;

    console.log(`[Inngest Prompt] Function invoked at ${new Date().toISOString()}`);
    console.log(`[Inngest Prompt] Starting job ${jobId} for project ${projectId}, skipCreditCheck=${skipCreditCheck}`);

    // Update job status to processing
    await step.run('update-job-processing', async () => {
      await prisma.promptGenerationJob.update({
        where: { id: jobId },
        data: { status: 'processing', startedAt: new Date() },
      });
    });

    // Get provider configuration using centralized system
    let providerConfig;
    let llmProvider: string;
    let llmModel: string;

    try {
      providerConfig = await step.run('get-provider-config', async () => {
        return getProviderConfig({
          userId,
          projectId,
          type: 'llm',
        });
      });

      llmProvider = providerConfig.provider;
      llmModel = providerConfig.model || '';

      console.log(`[Inngest Prompt] Provider config: provider=${llmProvider}, model=${llmModel}`);
    } catch (error: any) {
      console.error('[Inngest Prompt] Failed to get provider config:', error);
      await step.run('update-job-failed-no-provider', async () => {
        await prisma.promptGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errorDetails: error.message || 'No LLM provider configured',
            completedAt: new Date(),
          },
        });
      });
      return { success: false, error: error.message || 'No LLM provider configured' };
    }

    // Update job with LLM provider and model
    await step.run('update-job-with-llm-info', async () => {
      await prisma.promptGenerationJob.update({
        where: { id: jobId },
        data: {
          llmProvider,
          llmModel,
        },
      });
    });

    try {
      // Build the prompt
      const prompt = `Generate a complete master prompt for a ${settings.sceneCount}-scene animated short film based on the following details:

Story Title: ${story.title}
Genre: ${story.genre}
Tone: ${story.tone}
Setting: ${story.setting}
Concept: ${story.concept}
Visual Style: ${style}

Technical Settings:
- Aspect Ratio: ${settings.aspectRatio}
- Video Language: ${settings.videoLanguage}
- Image Provider: ${settings.imageProvider}
- Voice Provider: ${settings.voiceProvider}
- Characters: ${settings.characterCount}
- Scenes: ${settings.sceneCount}

Please generate a comprehensive master prompt that includes:
1. Detailed character descriptions with visual appearance, personality, and motivations
2. Scene breakdown with specific camera shots and compositions
3. Text-to-Image prompts for each character and scene
4. Image-to-Video prompts describing movements and actions
5. Sample dialogue for each scene

Format the output with clear CHARACTER: and SCENE: sections.`;

      const systemPrompt = 'You are a professional film prompt engineer specializing in creating detailed prompts for animated films.';

      console.log('[Inngest Prompt] Making LLM API call...');

      // Make the API call using centralized wrapper
      const response = await step.run('call-llm-api', async () => {
        return callExternalApi({
          userId,
          projectId,
          type: 'llm',
          body: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 8192,
            temperature: 0.9,
            stream: false,
          },
          showLoadingMessage: false, // Background job doesn't need loading message
        });
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Extract generated text from response
      let generatedText: string | undefined;

      if (response.data) {
        // Handle different provider response formats
        if (response.data.choices?.[0]?.message?.content) {
          // OpenAI/OpenRouter format
          generatedText = response.data.choices[0].message.content;
        } else if (response.data.choices?.[0]?.text) {
          // Alternative format
          generatedText = response.data.choices[0].text;
        } else if (response.data.text) {
          // Direct text format
          generatedText = response.data.text;
        } else if (response.data.result) {
          // Some providers use 'result'
          generatedText = response.data.result;
        } else if (response.data.completion) {
          // Some providers use 'completion'
          generatedText = response.data.completion;
        }
      }

      if (!generatedText) {
        throw new Error('No text generated from LLM response');
      }

      console.log('[Inngest Prompt] Generated prompt length:', generatedText.length);

      // Save the generated prompt to the project
      await step.run('save-prompt-to-project', async () => {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            masterPrompt: generatedText,
          },
        });
      });

      // Deduct credits if needed
      if (!skipCreditCheck) {
        await step.run('deduct-credits', async () => {
          const cost = COSTS.SCENE_GENERATION; // Using same cost as scene generation
          await spendCredits(
            userId,
            cost,
            'prompt',
            `Master prompt generation via ${llmProvider}`,
            projectId,
            llmProvider as Provider
          );
        });
      }

      // Update job status to completed
      await step.run('update-job-completed', async () => {
        await prisma.promptGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      });

      console.log(`[Inngest Prompt] Job ${jobId} completed successfully`);
      return { success: true, promptLength: generatedText.length };

    } catch (error: any) {
      console.error('[Inngest Prompt] Error generating prompt:', error);

      // Update job status to failed
      await step.run('update-job-failed', async () => {
        await prisma.promptGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errorDetails: error.message || 'Unknown error',
            completedAt: new Date(),
          },
        });
      });

      // Only throw NonRetriableError for errors we know we can't recover from
      if (error.message?.includes('insufficient credits') || error.message?.includes('API key')) {
        throw new NonRetriableError(error.message);
      }

      // Let Inngest retry other errors
      throw error;
    }
  }
);