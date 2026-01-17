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
    const storyModel = projectSettings?.storyModel || 'claude-sonnet-4.5';

    console.log(`[Inngest Scenes] Using storyModel from project settings: ${storyModel}`);

    // Get user's API keys for LLM provider
    const userSettings = await step.run('get-user-settings', async () => {
      return prisma.apiKeys.findUnique({
        where: { userId },
      });
    });

    const openRouterApiKey = userSettings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;
    const modalLlmEndpoint = userSettings?.modalLlmEndpoint;
    const userSelectedOpenRouterModel = userSettings?.openRouterModel; // User's selected model from modal

    // Map storyModel to actual LLM provider and model
    // When user provides own OpenRouter key, use OpenRouter-compatible models
    const storyModelMapping: Record<string, { provider: 'openrouter' | 'gemini' | 'claude-sdk' | 'modal'; model: string; endpoint?: string }> = {
      'gpt-4': { provider: 'openrouter', model: 'openai/gpt-4o' },
      'claude-sonnet-4.5': { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
      'gemini-3-pro': openRouterApiKey
        ? { provider: 'openrouter', model: 'google/gemini-pro-1.5' }  // OpenRouter-compatible when user has key
        : { provider: 'gemini', model: 'gemini-3-pro' },         // Google API (app credits)
    };

    let llmConfig = storyModelMapping[storyModel] || storyModelMapping['claude-sonnet-4.5'];
    let llmProvider = llmConfig.provider;
    let llmModel = llmConfig.model;

    // If user has their own OpenRouter key and selected a specific model, use it
    if (openRouterApiKey && userSelectedOpenRouterModel) {
      // Validate that the user's selected model is one of the supported models
      const supportedModels = [
        'anthropic/claude-3-haiku',
        'google/gemini-pro-1.5',
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o',
        'anthropic/claude-3-opus',
      ];

      if (supportedModels.includes(userSelectedOpenRouterModel)) {
        llmProvider = 'openrouter';
        llmModel = userSelectedOpenRouterModel;
        console.log(`[Inngest Scenes] Using user-selected OpenRouter model: ${llmModel}`);
      } else {
        console.warn(`[Inngest Scenes] Unknown user-selected model: ${userSelectedOpenRouterModel}, falling back to default`);
      }
    }

    console.log(`[Inngest Scenes] LLM config: provider=${llmProvider}, model=${llmModel}, storyModel=${storyModel}, hasUserOpenRouterKey=${!!openRouterApiKey}, userSelectedModel=${userSelectedOpenRouterModel || 'none'}`);

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
    let totalSavedScenes = 0;

    console.log(`[Inngest Scenes] Will generate ${sceneCount} scenes in ${totalBatches} batches`);

    // Check how many scenes already exist (for resume after partial failure)
    const existingSceneCount = await step.run('check-existing-scenes', async () => {
      return prisma.scene.count({ where: { projectId } });
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
          // Use Claude CLI with --print mode (uses OAuth subscription, not API credits)
          const { spawnSync } = await import('child_process');
          const fs = await import('fs');
          const os = await import('os');
          const path = await import('path');

          const fullPrompt = `${systemPrompt}\n\n${prompt}`;

          // Write prompt to temp file to avoid stdin issues
          const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
          fs.writeFileSync(tmpFile, fullPrompt, 'utf-8');

          // Full path to claude CLI (nvm installation)
          const claudePath = '/Users/andrejpt/.nvm/versions/node/v22.21.1/bin/claude';

          try {
            // Build env without ANTHROPIC_API_KEY so CLI uses OAuth instead
            const cleanEnv = { ...process.env };
            delete cleanEnv.ANTHROPIC_API_KEY; // Remove so CLI uses OAuth session

            // Call claude CLI with --print for non-interactive output
            const result = spawnSync(claudePath, ['-p', '--output-format', 'text'], {
              input: fullPrompt,
              encoding: 'utf-8',
              maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large responses
              timeout: 300000, // 5 minute timeout
              env: {
                ...cleanEnv,
                PATH: process.env.PATH + ':/Users/andrejpt/.nvm/versions/node/v22.21.1/bin',
                HOME: '/Users/andrejpt',
                USER: 'andrejpt',
              },
              cwd: '/Volumes/DATA/Python/film-generator',
            });

            if (result.error) {
              throw result.error;
            }

            if (result.status !== 0) {
              console.error('[Claude CLI] stderr:', result.stderr);
              console.error('[Claude CLI] stdout:', result.stdout?.slice(0, 500));
              console.error('[Claude CLI] signal:', result.signal);
              throw new Error(`Claude CLI exited with code ${result.status}. stderr: ${result.stderr}. stdout: ${result.stdout?.slice(0, 200)}`);
            }

            fullResponse = result.stdout;
          } finally {
            // Clean up temp file
            try { fs.unlinkSync(tmpFile); } catch { }
          }
        } else if (openRouterApiKey) {
          fullResponse = await callOpenRouter(
            openRouterApiKey,
            systemPrompt,
            prompt,
            llmModel,
            16384
          );
        } else {
          throw new Error('No LLM provider available');
        }

        // Parse JSON response with multiple fallback strategies
        let cleanResponse = fullResponse.trim();

        // Strategy 1: Remove markdown code blocks
        if (cleanResponse.startsWith('```json')) cleanResponse = cleanResponse.slice(7);
        if (cleanResponse.startsWith('```')) cleanResponse = cleanResponse.slice(3);
        if (cleanResponse.endsWith('```')) cleanResponse = cleanResponse.slice(0, -3);
        cleanResponse = cleanResponse.trim();

        let scenes;
        try {
          scenes = JSON.parse(cleanResponse);
        } catch (parseError1) {
          // Strategy 2: Find JSON array in response
          const jsonArrayMatch = fullResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonArrayMatch) {
            try {
              scenes = JSON.parse(jsonArrayMatch[0]);
            } catch (parseError2) {
              // Strategy 3: Try to fix common JSON issues
              let fixedJson = jsonArrayMatch[0]
                .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
                .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
                .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters

              try {
                scenes = JSON.parse(fixedJson);
              } catch (parseError3) {
                console.error(`[Inngest Scenes] Batch ${batchIndex + 1} JSON parse failed after 3 attempts`);
                console.error(`[Inngest Scenes] Response start:`, fullResponse.slice(0, 300));
                console.error(`[Inngest Scenes] Response end:`, fullResponse.slice(-300));
                throw new Error(`Failed to parse LLM response as JSON for batch ${batchIndex + 1}`);
              }
            }
          } else {
            console.error(`[Inngest Scenes] Batch ${batchIndex + 1} no JSON array found in response`);
            console.error(`[Inngest Scenes] Response:`, fullResponse.slice(0, 500));
            throw new Error(`No JSON array found in LLM response for batch ${batchIndex + 1}`);
          }
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

      // Save this batch to DB immediately (so we don't lose progress if later batch fails)
      await step.run(`save-batch-${batchIndex + 1}`, async () => {
        console.log(`[Inngest Scenes] Saving batch ${batchIndex + 1} (${batchScenes.length} scenes) to DB`);

        for (const scene of batchScenes) {
          // Check if scene already exists (in case of retry)
          const existingScene = await prisma.scene.findFirst({
            where: { projectId, number: scene.number },
          });

          if (existingScene) {
            console.log(`[Inngest Scenes] Scene ${scene.number} already exists, skipping`);
            continue;
          }

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

        return batchScenes.length;
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

    // Spend credits
    await step.run('spend-credits', async () => {
      // Map llmProvider to credit provider name
      const creditProvider = llmProvider === 'gemini' ? 'gemini' :
        llmProvider === 'modal' ? 'modal' :
          llmProvider === 'claude-sdk' ? 'claude-sdk' :
            storyModel; // Use storyModel name for OpenRouter (gpt-4, claude-sonnet-4.5, etc.)

      // Calculate real cost based on provider (track all costs for accurate statistics)
      let realCost: number;
      if (llmProvider === 'modal') {
        realCost = ACTION_COSTS.scene.modal * finalSceneCount; // ~$0.002 per scene
      } else if (llmProvider === 'claude-sdk') {
        realCost = ACTION_COSTS.scene.claude * finalSceneCount; // Same as Claude API (~$0.01 per scene)
      } else if (storyModel === 'gpt-4') {
        // GPT-4 Turbo via OpenRouter has similar pricing to Claude
        realCost = ACTION_COSTS.scene.claude * finalSceneCount;
      } else {
        realCost = ACTION_COSTS.scene.claude * finalSceneCount; // Default for Claude Sonnet 4.5
      }
      await spendCredits(
        userId,
        COSTS.SCENE_GENERATION * finalSceneCount,
        'scene',
        `${storyModel} scene generation (${finalSceneCount} scenes in ${totalBatches} batches)`,
        projectId,
        creditProvider,
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
          completedScenes: finalSceneCount,
          progress: 100,
        },
      });
    });

    console.log(`[Inngest Scenes] Job ${jobId} completed with ${finalSceneCount} scenes in ${totalBatches} batches`);

    return { success: true, sceneCount: finalSceneCount, batches: totalBatches };
  }
);
