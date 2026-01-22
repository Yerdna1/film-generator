import { inngest } from '../client';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { cache, cacheKeys } from '@/lib/cache';
import { callExternalApi, pollKieTask } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { Provider } from '@/lib/services/real-costs';

// Number of audio lines to generate in parallel
const PARALLEL_AUDIO = 5;

// KIE TTS model mapping: UI names to API model names
const KIE_TTS_MODEL_MAPPING: Record<string, string> = {
  'elevenlabs-turbo-2-5': 'elevenlabs/text-to-speech-turbo-2-5',
  'elevenlabs-turbo': 'elevenlabs/text-to-speech-turbo-2-5',
  'elevenlabs-v2': 'elevenlabs/text-to-speech-multilingual-v2',
  'elevenlabs-multilingual-v2': 'elevenlabs/text-to-speech-multilingual-v2',
  'elevenlabs-dialogue-v3': 'elevenlabs/text-to-dialogue-v3',
};

// Generate a single audio line using the API wrapper
async function generateSingleAudio(
  audioLine: {
    lineId: string;
    sceneId: string;
    sceneNumber: number;
    text: string;
    characterId: string;
    voiceId: string;
  },
  userId: string,
  projectId: string,
  language: string,
  userHasOwnApiKey: boolean = false
): Promise<{ lineId: string; sceneId: string; audioUrl: string; success: boolean; error?: string }> {
  // Declare variables outside try block for error handler access
  let provider: string | undefined;
  let apiKey: string | undefined;
  let model: string | undefined;

  try {
    // Get provider configuration - single source of truth
    const config = await getProviderConfig({
      userId,
      projectId,
      type: 'tts',
    });

    // Assign values from config
    provider = config.provider;
    apiKey = config.apiKey;
    model = config.model;

    console.log(`[Inngest] TTS Provider config loaded:`, {
      provider,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      model,
      voiceId: audioLine.voiceId,
      textLength: audioLine.text.length,
    });

    let audioUrl: string | undefined;

    if (provider === 'gemini-tts' || provider === 'gemini') {
      // Special handling for Gemini - uses AI SDK
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }

      const google = createGoogleGenerativeAI({ apiKey });

      // Format text for language
      const formattedText = language === 'sk'
        ? `Hovor po slovensky s prirodzeným prízvukom: "${audioLine.text}"`
        : audioLine.text;

      const result = await generateText({
        model: google('gemini-2.0-flash-exp'),
        messages: [
          { role: 'user', content: formattedText }
        ],
        providerOptions: {
          google: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: audioLine.voiceId || 'Coral' } },
            },
          },
        },
      });

      const generatedAudio = result.files?.[0];
      if (!generatedAudio?.base64) {
        throw new Error('No audio generated');
      }

      const mimeType = (generatedAudio as any).mimeType || 'audio/mp3';
      audioUrl = `data:${mimeType};base64,${generatedAudio.base64}`;

    } else {
      // Use API wrapper for other providers
      let requestBody: any;

      // Map model name for KIE
      let kieModel = model;
      if (provider === 'kie') {
        kieModel = KIE_TTS_MODEL_MAPPING[model || ''] || model;
      }

      switch (provider) {
        case 'elevenlabs':
          requestBody = {
            text: audioLine.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true,
            },
          };
          break;

        case 'openai-tts':
        case 'openai':
          requestBody = {
            model: 'gpt-4o-mini-tts',
            input: audioLine.text,
            voice: audioLine.voiceId || 'alloy',
            response_format: 'mp3',
          };
          break;

        case 'kie':
          requestBody = {
            model: kieModel,
            input: {
              text: audioLine.text,
              voice_id: audioLine.voiceId,
              ...(language && { language_code: language }),
            },
          };
          break;

        default:
          throw new Error(`Unsupported TTS provider: ${provider}`);
      }

      console.log(`[Inngest] Calling TTS API:`, {
        provider,
        model: kieModel || model,
        hasRequestBody: !!requestBody,
      });

      const response = await callExternalApi({
        userId,
        projectId,
        type: 'tts',
        body: requestBody,
        showLoadingMessage: false,
      });

      console.log(`[Inngest] TTS API response:`, {
        status: response.status,
        hasData: !!response.data,
        error: response.error,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Handle KIE response
      if (provider === 'kie') {
        const responseData = response.data;
        const taskId = responseData?.data?.taskId;

        if (!taskId) {
          console.error('[Inngest] KIE response structure issue:', {
            hasResponseData: !!responseData,
            responseDataType: typeof responseData,
            responseDataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
            fullResponse: JSON.stringify(responseData, null, 2),
          });
          throw new Error('KIE AI did not return a task ID');
        }

        console.log(`[Inngest] KIE task created: ${taskId}, polling for completion...`);

        // Poll for task completion
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

          if (statusData.code !== 200) {
            throw new Error(statusData.msg || 'Failed to check task status');
          }

          const taskData = statusData.data;
          const state = taskData?.state;

          console.log(`[Inngest] KIE status: ${state}, attempt ${attempts + 1}/${maxAttempts}`);

          if (state === 'success') {
            // Extract audio URL from resultJson
            if (taskData.resultJson) {
              try {
                const result = typeof taskData.resultJson === 'string'
                  ? JSON.parse(taskData.resultJson)
                  : taskData.resultJson;

                console.log('[Inngest] KIE result structure:', {
                  hasResultUrls: !!result.resultUrls,
                  resultUrlsArray: Array.isArray(result.resultUrls) ? result.resultUrls.length : 'not array',
                  firstResultUrl: Array.isArray(result.resultUrls) ? result.resultUrls[0] : null,
                });

                // Check for resultUrls array (KIE TTS uses this)
                if (result.resultUrls && Array.isArray(result.resultUrls) && result.resultUrls.length > 0) {
                  audioUrl = result.resultUrls[0];
                }
                // Check for base64 audio data
                else if (result.audio || result.audioData || result.audio_base64) {
                  const audioBase64 = result.audio || result.audioData || result.audio_base64;
                  audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
                }
                // Check for direct audio URL
                else if (result.audioUrl || result.audio_url) {
                  audioUrl = result.audioUrl || result.audio_url;
                }

                console.log('[Inngest] Extracted audio URL:', audioUrl ? audioUrl.substring(0, 100) + '...' : 'none');
              } catch (e) {
                console.error('[Inngest] Failed to parse KIE resultJson:', e);
              }
            }

            // Fallback to direct URL fields
            if (!audioUrl) {
              audioUrl = taskData.imageUrl || taskData.image_url || taskData.resultUrl;
            }

            if (!audioUrl) {
              throw new Error('KIE completed but no audio URL in result');
            }
            break;
          }

          if (state === 'fail') {
            const failReason = taskData.fail_reason || taskData.resultJson?.error || 'Unknown error';
            throw new Error(`KIE task failed: ${failReason}`);
          }

          attempts++;
        }

        if (!audioUrl) {
          throw new Error('KIE task timed out');
        }

      } else {
        // ElevenLabs and OpenAI return binary audio data
        if (response.data instanceof ArrayBuffer || response.data instanceof Buffer) {
          const base64 = Buffer.from(response.data as any).toString('base64');
          audioUrl = `data:audio/mpeg;base64,${base64}`;
        } else if (response.data.audio) {
          audioUrl = response.data.audio.startsWith('data:')
            ? response.data.audio
            : `data:audio/mpeg;base64,${response.data.audio}`;
        } else if (response.data.audioUrl) {
          audioUrl = response.data.audioUrl;
        }
      }
    }

    if (!audioUrl) {
      throw new Error('Audio generation failed: No audio URL generated');
    }

    // Update scene with audio URL
    const scene = await prisma.scene.findUnique({
      where: { id: audioLine.sceneId },
    });

    if (scene) {
      const dialogue = scene.dialogue as any[];
      const updatedDialogue = dialogue.map((line: any) => {
        if (line.id === audioLine.lineId) {
          return { ...line, audioUrl };
        }
        return line;
      });

      await prisma.scene.update({
        where: { id: audioLine.sceneId },
        data: { dialogue: updatedDialogue },
      });
    }

    // Invalidate cache
    cache.invalidate(cacheKeys.userProjects(userId));

    // Only spend credits if user doesn't have their own API key
    if (!userHasOwnApiKey) {
      await spendCredits(
        userId,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        `Voice generation (scene ${audioLine.sceneNumber}, line ${audioLine.lineId})`,
        projectId,
        provider as Provider,
        { characterId: audioLine.characterId, lineId: audioLine.lineId },
        0.03 // Average cost for TTS
      );
      console.log(`[Inngest] Charged credits for line ${audioLine.lineId}`);
    } else {
      console.log(`[Inngest] Skipped credit charges for line ${audioLine.lineId} - user has own API key`);
    }

    console.log(`[Inngest] Audio line ${audioLine.lineId} completed`);
    return { lineId: audioLine.lineId, sceneId: audioLine.sceneId, audioUrl, success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : (error ? String(error) : 'No message available');
    console.error(`[Inngest] Audio line ${audioLine.lineId} failed:`, error);
    console.error(`[Inngest] Error details:`, {
      lineId: audioLine.lineId,
      sceneNumber: audioLine.sceneNumber,
      provider,
      model,
      errorMessage,
      errorType: error?.constructor?.name,
    });
    return { lineId: audioLine.lineId, sceneId: audioLine.sceneId, audioUrl: '', success: false, error: errorMessage };
  }
}

// Generate voiceovers for a batch of dialogue lines - processes them in parallel batches
export const generateVoiceoversBatch = inngest.createFunction(
  {
    id: 'generate-voiceovers-batch',
    name: 'Generate Voiceovers Batch',
    retries: 3,
    cancelOn: [
      {
        event: 'voiceover/batch.cancel',
        match: 'data.batchId',
      },
    ],
  },
  { event: 'voiceover/generate.batch' },
  async ({ event, step }) => {
    const { projectId, userId, batchId, audioLines, language, userHasOwnApiKey = false } = event.data;

    console.log(`[Inngest] Starting voiceover batch ${batchId} with ${audioLines.length} lines (parallel: ${PARALLEL_AUDIO})`);
    console.log(`[Inngest] User has own API key: ${userHasOwnApiKey} - ${userHasOwnApiKey ? 'skipping credit charges' : 'charging credits'}`);

    // Get provider configuration
    const providerConfig = await step.run('get-provider-config', async () => {
      return await getProviderConfig({
        userId,
        projectId,
        type: 'tts',
      });
    });

    console.log(`[Inngest] Using provider: ${providerConfig.provider}, model: ${providerConfig.model}`);

    // Update batch status to processing
    await step.run('update-batch-status-processing', async () => {
      await prisma.voiceoverGenerationJob.update({
        where: { id: batchId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          audioProvider: providerConfig.provider,
          audioModel: providerConfig.model || 'default',
        },
      });
    });

    const allResults: Array<{ lineId: string; sceneId: string; audioUrl: string; success: boolean; error?: string }> = [];

    // Process audio lines in parallel batches
    const totalBatches = Math.ceil(audioLines.length / PARALLEL_AUDIO);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * PARALLEL_AUDIO;
      const endIdx = Math.min(startIdx + PARALLEL_AUDIO, audioLines.length);
      const batchLines = audioLines.slice(startIdx, endIdx);

      // Generate this batch of audio in parallel
      const batchResults = await step.run(`generate-parallel-batch-${batchIndex + 1}`, async () => {
        console.log(`[Inngest] Parallel batch ${batchIndex + 1}/${totalBatches}: lines ${startIdx + 1}-${endIdx}`);

        const promises = batchLines.map((line: any) =>
          generateSingleAudio(line, userId, projectId, language, userHasOwnApiKey)
        );

        return Promise.all(promises);
      });

      allResults.push(...batchResults);

      // Update progress after each parallel batch
      await step.run(`update-progress-batch-${batchIndex + 1}`, async () => {
        const completed = allResults.filter(r => r.success).length;
        const failed = allResults.filter(r => !r.success).length;

        await prisma.voiceoverGenerationJob.update({
          where: { id: batchId },
          data: {
            completedAudioLines: completed,
            failedAudioLines: failed,
            progress: Math.round((allResults.length / audioLines.length) * 100),
          },
        });
      });
    }

    // Final update
    await step.run('update-batch-status-complete', async () => {
      const completed = allResults.filter(r => r.success).length;
      const failed = allResults.filter(r => !r.success).length;

      await prisma.voiceoverGenerationJob.update({
        where: { id: batchId },
        data: {
          status: failed > 0 ? 'completed_with_errors' : 'completed',
          completedAt: new Date(),
          completedAudioLines: completed,
          failedAudioLines: failed,
          progress: 100,
          errorDetails: failed > 0
            ? JSON.stringify(allResults.filter(r => !r.success))
            : null,
        },
      });
    });

    console.log(`[Inngest] Batch ${batchId} completed: ${allResults.filter(r => r.success).length}/${audioLines.length} successful`);

    return { batchId, results: allResults };
  }
);
