import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import { callOpenRouter, DEFAULT_OPENROUTER_MODEL } from '@/lib/services/openrouter';

// Maximum scenes per LLM call to avoid token limits
const SCENES_PER_BATCH = 30;

// Generate scenes for a project using LLM - runs in background
export const generateScenesBatch = inngest.createFunction(
  {
    id: 'generate-scenes-batch',
    name: 'Generate Scenes',
    retries: 2,
  },
  { event: 'scenes/generate.batch' },
  async ({ event, step }) => {
    const { projectId, userId, jobId, story, characters, style, sceneCount } = event.data;

    console.log(`[Inngest Scenes] Starting job ${jobId} for ${sceneCount} scenes`);

    // Update job status to processing
    await step.run('update-job-processing', async () => {
      await prisma.sceneGenerationJob.update({
        where: { id: jobId },
        data: { status: 'processing', startedAt: new Date() },
      });
    });

    // Get user's API keys and LLM provider preference
    const userSettings = await step.run('get-user-settings', async () => {
      return prisma.apiKeys.findUnique({
        where: { userId },
      });
    });

    const llmProvider = userSettings?.llmProvider || 'openrouter';
    const openRouterApiKey = userSettings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;
    const openRouterModel = userSettings?.openRouterModel || DEFAULT_OPENROUTER_MODEL;
    const modalLlmEndpoint = userSettings?.modalLlmEndpoint;

    // Validate provider settings
    if (llmProvider === 'openrouter' && !openRouterApiKey) {
      await step.run('update-job-failed-no-key', async () => {
        await prisma.sceneGenerationJob.update({
          where: { id: jobId },
          data: { status: 'failed', errorDetails: 'OpenRouter API key not configured' },
        });
      });
      return { success: false, error: 'OpenRouter API key not configured' };
    }

    if (llmProvider === 'modal' && !modalLlmEndpoint) {
      await step.run('update-job-failed-no-endpoint', async () => {
        await prisma.sceneGenerationJob.update({
          where: { id: jobId },
          data: { status: 'failed', errorDetails: 'Modal LLM endpoint not configured' },
        });
      });
      return { success: false, error: 'Modal LLM endpoint not configured' };
    }

    // Character descriptions for prompts
    const characterDescriptions = characters
      .map((c: { name: string; masterPrompt?: string; description?: string }) =>
        `[${c.name.toUpperCase()}] Master Prompt:\n${c.masterPrompt || c.description}`)
      .join('\n\n');

    const characterNames = characters.map((c: { name: string }) => c.name).join(' and ');

    const styleMapping: Record<string, string> = {
      'disney-pixar': 'high-quality Disney/Pixar 3D animation style',
      'realistic': 'photorealistic cinematic style with real people',
      'anime': 'high-quality Japanese anime style',
      'custom': 'custom artistic style',
    };

    const styleDescription = styleMapping[style] || styleMapping['disney-pixar'];
    const systemPrompt = 'You are a professional film director and screenwriter specializing in animated short films. Generate detailed scene breakdowns in the exact JSON format requested. Return ONLY valid JSON, no markdown code blocks or explanations.';

    // Calculate batches
    const totalBatches = Math.ceil(sceneCount / SCENES_PER_BATCH);
    let allScenes: Array<{
      number: number;
      title: string;
      cameraShot: string;
      textToImagePrompt: string;
      imageToVideoPrompt: string;
      dialogue: Array<{ characterName: string; text: string }>;
    }> = [];

    console.log(`[Inngest Scenes] Will generate ${sceneCount} scenes in ${totalBatches} batches`);

    // Generate scenes in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startScene = batchIndex * SCENES_PER_BATCH + 1;
      const endScene = Math.min((batchIndex + 1) * SCENES_PER_BATCH, sceneCount);
      const batchSize = endScene - startScene + 1;

      const batchScenes = await step.run(`generate-batch-${batchIndex + 1}`, async () => {
        console.log(`[Inngest Scenes] Generating batch ${batchIndex + 1}/${totalBatches}: scenes ${startScene}-${endScene}`);

        const prompt = `Generate scenes ${startScene} to ${endScene} (${batchSize} scenes) for a 3D animated short film.

STORY CONCEPT: "${story.concept}"
TITLE: "${story.title || 'Untitled'}"
GENRE: ${story.genre || 'adventure'}
TONE: ${story.tone || 'heartfelt'}
SETTING: ${story.setting || 'various locations'}
STYLE: ${styleDescription}
TOTAL FILM LENGTH: ${sceneCount} scenes

CHARACTER MASTER PROMPTS (CRITICAL - include these EXACT descriptions in EVERY scene's textToImagePrompt):
${characterDescriptions}

${batchIndex > 0 ? `CONTEXT: This is batch ${batchIndex + 1} of ${totalBatches}. Continue the story from scene ${startScene}. Maintain narrative continuity.` : ''}

CRITICAL CAMERA RULE: Prioritize Medium Shots (waist up) and Close-ups (face focus) so characters are large and fill the frame.

For each scene, provide EXACTLY this format (JSON array):

[
  {
    "number": ${startScene},
    "title": "Scene Title",
    "cameraShot": "medium" or "close-up",
    "textToImagePrompt": "CHARACTERS:\\n[CHARACTER_NAME]: [full master prompt]\\n\\nSCENE: Medium Shot of... [detailed description]. ${styleDescription}.",
    "imageToVideoPrompt": "[Movement and expression description]",
    "dialogue": [
      { "characterName": "CharacterName", "text": "Dialogue..." }
    ]
  }
]

Generate exactly ${batchSize} scenes (numbered ${startScene} to ${endScene}). Each scene should:
1. Include ALL character master prompts in textToImagePrompt
2. Feature ${characterNames} prominently
3. Include dialogue for at least one character
4. Progress the story naturally${batchIndex > 0 ? ' from where the previous batch ended' : ''}

Return ONLY the JSON array.`;

        let fullResponse = '';

        if (llmProvider === 'modal' && modalLlmEndpoint) {
          const response = await fetch(modalLlmEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              system_prompt: systemPrompt,
              max_tokens: 16384,
            }),
          });

          if (!response.ok) {
            throw new Error(`Modal LLM failed: ${await response.text()}`);
          }

          const data = await response.json();
          fullResponse = data.response || data.text || data.content || '';
        } else if (llmProvider === 'claude-sdk') {
          // Use Claude API directly via Anthropic SDK
          const Anthropic = (await import('@anthropic-ai/sdk')).default;
          const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16384,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
          });

          const textContent = message.content.find((c: { type: string }) => c.type === 'text');
          fullResponse = textContent && 'text' in textContent ? textContent.text : '';
        } else if (openRouterApiKey) {
          fullResponse = await callOpenRouter(
            openRouterApiKey,
            systemPrompt,
            prompt,
            openRouterModel,
            16384
          );
        } else {
          throw new Error('No LLM provider available');
        }

        // Parse JSON response
        let cleanResponse = fullResponse.trim();
        if (cleanResponse.startsWith('```json')) cleanResponse = cleanResponse.slice(7);
        if (cleanResponse.startsWith('```')) cleanResponse = cleanResponse.slice(3);
        if (cleanResponse.endsWith('```')) cleanResponse = cleanResponse.slice(0, -3);
        cleanResponse = cleanResponse.trim();

        let scenes;
        try {
          scenes = JSON.parse(cleanResponse);
        } catch (parseError) {
          console.error(`[Inngest Scenes] Batch ${batchIndex + 1} JSON parse failed:`, cleanResponse.slice(0, 500));
          throw new Error(`Failed to parse LLM response as JSON for batch ${batchIndex + 1}`);
        }

        // Validate we got the expected number of scenes
        if (!Array.isArray(scenes)) {
          throw new Error(`Batch ${batchIndex + 1} returned non-array response`);
        }

        if (scenes.length < batchSize) {
          console.warn(`[Inngest Scenes] Batch ${batchIndex + 1} returned ${scenes.length}/${batchSize} scenes - retrying`);
          throw new Error(`Batch ${batchIndex + 1} returned only ${scenes.length} of ${batchSize} expected scenes`);
        }

        console.log(`[Inngest Scenes] Batch ${batchIndex + 1} generated ${scenes.length} scenes`);
        return scenes;
      });

      allScenes = [...allScenes, ...batchScenes];

      // Update progress after each batch
      await step.run(`update-progress-${batchIndex + 1}`, async () => {
        const progress = Math.round(((batchIndex + 1) / totalBatches) * 80); // Reserve 20% for saving
        await prisma.sceneGenerationJob.update({
          where: { id: jobId },
          data: { progress, completedScenes: allScenes.length },
        });
      });
    }

    // Save scenes to database
    await step.run('save-scenes-to-db', async () => {
      console.log(`[Inngest Scenes] Saving ${allScenes.length} scenes to DB`);

      for (const scene of allScenes) {
        const dialogue = scene.dialogue?.map((line: { characterName: string; text: string }) => {
          const character = characters.find(
            (c: { name: string }) => c.name.toLowerCase() === line.characterName?.toLowerCase()
          );
          return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            characterId: character?.id || characters[0]?.id || '',
            characterName: line.characterName || 'Unknown',
            text: line.text || '',
          };
        }) || [];

        await prisma.scene.create({
          data: {
            projectId,
            number: scene.number,
            title: scene.title || `Scene ${scene.number}`,
            description: '',
            textToImagePrompt: scene.textToImagePrompt || '',
            imageToVideoPrompt: scene.imageToVideoPrompt || '',
            cameraShot: scene.cameraShot || 'medium',
            dialogue: dialogue,
            duration: 6,
          },
        });
      }
    });

    // Spend credits
    await step.run('spend-credits', async () => {
      const provider = llmProvider === 'modal' ? 'modal' : llmProvider === 'claude-sdk' ? 'claude-sdk' : 'openrouter';
      // Claude SDK uses ANTHROPIC_API_KEY which is free with Claude Code subscription
      const realCost = (llmProvider === 'modal' || llmProvider === 'claude-sdk') ? 0 : ACTION_COSTS.scene.claude * allScenes.length;
      await spendCredits(
        userId,
        COSTS.SCENE_GENERATION * allScenes.length,
        'scene',
        `${llmProvider} scene generation (${allScenes.length} scenes in ${totalBatches} batches)`,
        projectId,
        provider,
        undefined,
        realCost
      );
    });

    // Update job as completed
    await step.run('update-job-completed', async () => {
      await prisma.sceneGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedScenes: allScenes.length,
          progress: 100,
        },
      });
    });

    console.log(`[Inngest Scenes] Job ${jobId} completed with ${allScenes.length} scenes in ${totalBatches} batches`);

    return { success: true, sceneCount: allScenes.length, batches: totalBatches };
  }
);
