import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import { callOpenRouter, DEFAULT_OPENROUTER_MODEL } from '@/lib/services/openrouter';

// Generate scenes for a project using LLM - runs in background
export const generateScenesBatch = inngest.createFunction(
  {
    id: 'generate-scenes-batch',
    name: 'Generate Scenes',
    retries: 2,
    // Allow up to 5 minutes for scene generation
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

    // Build the prompt
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

    const prompt = `Generate a complete ${sceneCount}-scene breakdown for a 3D animated short film.

STORY CONCEPT: "${story.concept}"
TITLE: "${story.title || 'Untitled'}"
GENRE: ${story.genre || 'adventure'}
TONE: ${story.tone || 'heartfelt'}
SETTING: ${story.setting || 'various locations'}
STYLE: ${styleDescription}

CHARACTER MASTER PROMPTS (CRITICAL - include these EXACT descriptions in EVERY scene's textToImagePrompt for visual consistency):
${characterDescriptions}

CRITICAL CAMERA RULE: Do not generate wide landscape shots where characters are tiny. You must prioritize Medium Shots (waist up) and Close-ups (face focus) so the characters are large, detailed, and fill the frame.

For each scene, provide EXACTLY this format (use JSON array):

[
  {
    "number": 1,
    "title": "Scene Title",
    "cameraShot": "medium" or "close-up",
    "textToImagePrompt": "CHARACTERS (use exact descriptions):\\n[CHARACTER_NAME]: [paste their full master prompt here]\\n\\nSCENE: Medium Shot of... or Close-up of... [detailed visual description]. Characters are large and clearly visible in the foreground. ${styleDescription}.",
    "imageToVideoPrompt": "[Movement and facial expression description. Include subtle animations and emotional reactions.]",
    "dialogue": [
      { "characterName": "CharacterName", "text": "Dialogue line..." }
    ]
  }
]

IMPORTANT: In each textToImagePrompt, you MUST include the full character master prompts at the beginning, followed by the scene description. This ensures visual consistency across all scenes.

Generate exactly ${sceneCount} scenes. Each scene should:
1. Include ALL character master prompts at the beginning of textToImagePrompt
2. Start scene description with "Medium Shot of..." or "Close-up of..."
3. Feature ${characterNames} prominently in the foreground
4. Include dialogue for at least one character
5. Progress the story naturally

Return ONLY the JSON array, no other text.`;

    const systemPrompt = 'You are a professional film director and screenwriter specializing in animated short films. Generate detailed scene breakdowns in the exact JSON format requested. Return ONLY valid JSON, no markdown code blocks or explanations.';

    // Generate scenes using LLM
    const result = await step.run('generate-scenes-llm', async () => {
      console.log(`[Inngest Scenes] Calling LLM provider: ${llmProvider}`);

      let fullResponse = '';

      if (llmProvider === 'modal' && modalLlmEndpoint) {
        const response = await fetch(modalLlmEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            system_prompt: systemPrompt,
            max_tokens: 8192,
          }),
        });

        if (!response.ok) {
          throw new Error(`Modal LLM failed: ${await response.text()}`);
        }

        const data = await response.json();
        fullResponse = data.response || data.text || data.content || '';
      } else if (openRouterApiKey) {
        fullResponse = await callOpenRouter(
          openRouterApiKey,
          systemPrompt,
          prompt,
          openRouterModel,
          8192
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

      const scenes = JSON.parse(cleanResponse);
      return scenes;
    });

    // Save scenes to database
    await step.run('save-scenes-to-db', async () => {
      console.log(`[Inngest Scenes] Saving ${result.length} scenes to DB`);

      for (const scene of result) {
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
      const provider = llmProvider === 'modal' ? 'modal' : 'openrouter';
      const realCost = llmProvider === 'modal' ? 0 : ACTION_COSTS.scene.claude * sceneCount;
      await spendCredits(
        userId,
        COSTS.SCENE_GENERATION * sceneCount,
        'scene',
        `${llmProvider} scene generation (${sceneCount} scenes)`,
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
          completedScenes: result.length,
          progress: 100,
        },
      });
    });

    console.log(`[Inngest Scenes] Job ${jobId} completed with ${result.length} scenes`);

    return { success: true, sceneCount: result.length };
  }
);
