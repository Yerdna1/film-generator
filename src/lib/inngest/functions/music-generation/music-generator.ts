// Music generation utilities
import { spendCredits, COSTS } from '@/lib/services/credits';
import { callExternalApi } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import { uploadMediaToS3 } from '@/lib/api';
import type { Provider } from '@/lib/services/real-costs';
import type { MusicGenerationRequest, MusicGenerationResult, MusicGenerationOptions } from './types';
import { KIE_MUSIC_MODEL_MAPPING, KIE_POLL_CONFIG, PROVIDER_COSTS } from './constants';

// Helper function to download audio and convert to base64
export async function downloadAudioAsBase64(audioUrl: string): Promise<string | null> {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'audio/mpeg';

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('[Inngest] Error downloading audio:', error);
    return null;
  }
}

// Poll KIE task for completion
async function pollKieTask(
  taskId: string,
  apiKey: string
): Promise<{ audioUrl: string; title?: string }> {
  let attempts = 0;
  let state: string;

  while (attempts < KIE_POLL_CONFIG.MAX_ATTEMPTS) {
    await new Promise(resolve => setTimeout(resolve, KIE_POLL_CONFIG.INTERVAL_MS));

    const statusResponse = await fetch(
      `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
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
    state = taskData?.status;

    console.log(`[Inngest] KIE music status: ${state}, attempt ${attempts + 1}/${KIE_POLL_CONFIG.MAX_ATTEMPTS}`);

    if (state === 'SUCCESS' || state === 'COMPLETED') {
      let audioUrl: string | undefined;
      let title: string | undefined;

      if (taskData.response?.sunoData && Array.isArray(taskData.response.sunoData)) {
        const tracks = taskData.response.sunoData;
        if (tracks.length > 0) {
          audioUrl = tracks[0].audioUrl || tracks[0].audio_url;
          title = tracks[0].title;
        }
      }

      if (!audioUrl) {
        throw new Error('KIE completed but no audio URL in result');
      }

      return { audioUrl, title };
    }

    if (state === 'FAILED' || state?.includes('FAILED')) {
      throw new Error(taskData.errorMessage || 'KIE music generation failed');
    }

    attempts++;
  }

  throw new Error('KIE task timed out');
}

// Generate music using a specific provider
async function generateWithProvider(
  provider: string,
  apiKey: string | undefined,
  model: string,
  endpoint: string | undefined,
  request: MusicGenerationRequest,
  userId: string,
  projectId: string | undefined
): Promise<{ audioUrl: string; title?: string; taskId?: string; realCost: number }> {
  let requestBody: any;

  // Map model name for KIE
  let kieModel = model;
  if (provider === 'kie') {
    kieModel = KIE_MUSIC_MODEL_MAPPING[model || ''] || model;
  }

  switch (provider) {
    case 'modal':
      requestBody = {
        prompt: request.prompt,
        instrumental: request.instrumental ?? true,
        title: request.title || 'Generated Music',
      };
      break;

    case 'kie':
      requestBody = {
        prompt: request.prompt,
        customMode: false,
        instrumental: request.instrumental ?? true,
        model: kieModel,
        callBackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/music/callback`,
      };
      break;

    case 'suno':
      requestBody = {
        prompt: request.prompt,
        mv: 'chirp-v3-5',
        instrumental: request.instrumental ?? true,
        title: request.title || 'Generated Music',
      };
      break;

    default:
      throw new Error(`Unsupported music provider: ${provider}`);
  }

  console.log(`[Inngest] Calling music API:`, {
    provider,
    model: kieModel || model,
    hasRequestBody: !!requestBody,
  });

  const response = await callExternalApi({
    userId,
    projectId,
    type: 'music',
    body: requestBody,
    endpoint,
    showLoadingMessage: false,
  });

  console.log(`[Inngest] Music API response:`, {
    status: response.status,
    hasData: !!response.data,
    error: response.error,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  let audioUrl: string;
  let title = request.title;
  let taskId: string | undefined;
  let realCost: number;

  // Handle response based on provider
  switch (provider) {
    case 'modal':
      if (response.data.audio) {
        audioUrl = response.data.audio.startsWith('data:')
          ? response.data.audio
          : `data:audio/wav;base64,${response.data.audio}`;
      } else if (response.data.audioUrl) {
        audioUrl = response.data.audioUrl;
      } else {
        throw new Error('Modal did not return audio');
      }

      realCost = PROVIDER_COSTS.modal;
      break;

    case 'kie':
      taskId = response.data?.data?.taskId;
      if (!taskId) {
        throw new Error('KIE AI did not return a task ID');
      }

      console.log(`[Inngest] KIE music task created: ${taskId}, polling for completion...`);

      // Poll for task completion
      const kieResult = await pollKieTask(taskId, apiKey!);
      audioUrl = kieResult.audioUrl;
      title = kieResult.title || title;
      realCost = PROVIDER_COSTS.kie;
      break;

    case 'suno':
      if (response.data.clips && response.data.clips.length > 0) {
        const clip = response.data.clips[0];
        audioUrl = clip.audio_url;
        title = clip.title || title;
      } else {
        throw new Error('Suno did not return audio');
      }

      realCost = PROVIDER_COSTS.suno;
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  return { audioUrl, title, taskId, realCost };
}

// Main music generation function
export async function generateMusic(
  request: MusicGenerationRequest,
  options: MusicGenerationOptions
): Promise<MusicGenerationResult> {
  const { userId, projectId, userHasOwnApiKey = false } = options;
  let provider: string | undefined;
  let apiKey: string | undefined;
  let model: string | undefined;
  let endpoint: string | undefined;

  try {
    // Get provider configuration
    const config = await getProviderConfig({
      userId,
      projectId,
      type: 'music',
    });

    provider = config.provider;
    apiKey = config.apiKey;
    model = config.model;
    endpoint = config.endpoint;

    console.log(`[Inngest] Music Provider config loaded:`, {
      provider,
      hasApiKey: !!apiKey,
      model,
      promptLength: request.prompt.length,
    });

    // Generate music with provider
    const { audioUrl, title, taskId, realCost } = await generateWithProvider(
      provider,
      apiKey,
      model || '',
      endpoint,
      request,
      userId,
      projectId
    );

    // Download and convert to base64 if it's a URL
    let finalAudioUrl = audioUrl;
    if (audioUrl.startsWith('http')) {
      const base64Audio = await downloadAudioAsBase64(audioUrl);
      if (base64Audio) {
        finalAudioUrl = base64Audio;
      }
    }

    // Upload to S3 if configured
    finalAudioUrl = await uploadMediaToS3(finalAudioUrl, 'audio', projectId);

    // Only spend credits if user doesn't have their own API key
    if (!userHasOwnApiKey) {
      await spendCredits(
        userId,
        COSTS.MUSIC_GENERATION || 10,
        'music',
        `Music generation (${provider})`,
        projectId,
        provider as Provider,
        undefined,
        realCost
      );
      console.log(`[Inngest] Charged credits for music generation`);
    } else {
      console.log(`[Inngest] Skipped credit charges - user has own API key`);
    }

    console.log(`[Inngest] Music generation completed`);
    return { audioUrl: finalAudioUrl, title, success: true, taskId };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : (error ? String(error) : 'No message available');
    console.error(`[Inngest] Music generation failed:`, error);
    console.error(`[Inngest] Error details:`, {
      provider,
      model,
      errorMessage,
      errorType: error?.constructor?.name,
    });
    return { audioUrl: undefined, title: undefined, success: false, error: errorMessage };
  }
}
