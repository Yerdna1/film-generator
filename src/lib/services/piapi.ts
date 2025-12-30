/**
 * PiAPI Music Generation Service
 *
 * PiAPI provides access to multiple music generation models through a unified API:
 * - music-u: Suno-like music generation
 * - Udio: Alternative music generation
 * - DiffRhythm: Text-to-music with lyrics
 *
 * Documentation: https://piapi.ai/docs/music-api/create-task
 */

const PIAPI_BASE_URL = 'https://api.piapi.ai/api/v1';

export type PiapiLyricsType = 'generate' | 'user' | 'instrumental';

export interface PiapiMusicRequest {
  prompt: string;
  title?: string;
  lyrics?: string;
  lyricsType?: PiapiLyricsType;
  negativeTags?: string;
  seed?: number;
}

export interface PiapiTaskResponse {
  task_id: string;
  status: string;
  model: string;
  task_type: string;
  created_at?: string;
  output?: {
    audio_url?: string;
    duration?: number;
    title?: string;
    [key: string]: unknown;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export type PiapiTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Create a music generation task with PiAPI
 */
export async function createMusicTask(
  apiKey: string,
  request: PiapiMusicRequest
): Promise<{ taskId: string }> {
  const response = await fetch(`${PIAPI_BASE_URL}/task`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'music-u',
      task_type: 'generate_music',
      input: {
        gpt_description_prompt: request.prompt,
        lyrics_type: request.lyricsType || 'instrumental',
        title: request.title || 'Generated Music',
        ...(request.lyrics && { lyrics: request.lyrics }),
        ...(request.negativeTags && { negative_tags: request.negativeTags }),
        seed: request.seed ?? -1, // -1 for random
      },
      config: {
        service_mode: 'public', // or 'private' for dedicated resources
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `PiAPI error: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.task_id) {
    throw new Error('PiAPI did not return a task ID');
  }

  return { taskId: data.task_id };
}

/**
 * Get the status and result of a music generation task
 */
export async function getMusicTaskStatus(
  apiKey: string,
  taskId: string
): Promise<{
  status: PiapiTaskStatus;
  audioUrl?: string;
  duration?: number;
  title?: string;
  error?: string;
}> {
  const response = await fetch(`${PIAPI_BASE_URL}/task/${taskId}`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `PiAPI error: ${errorData.error?.message || response.statusText}`
    );
  }

  const data: PiapiTaskResponse = await response.json();

  // Map PiAPI status to our internal status
  const statusMapping: Record<string, PiapiTaskStatus> = {
    'pending': 'pending',
    'queued': 'pending',
    'processing': 'processing',
    'running': 'processing',
    'completed': 'completed',
    'success': 'completed',
    'failed': 'failed',
    'error': 'failed',
  };

  const status = statusMapping[data.status?.toLowerCase()] || 'processing';

  return {
    status,
    audioUrl: data.output?.audio_url,
    duration: data.output?.duration,
    title: data.output?.title,
    error: data.error?.message,
  };
}

/**
 * Validate a PiAPI API key by making a simple request
 */
export async function validatePiapiKey(apiKey: string): Promise<boolean> {
  try {
    // Try to get account info or a simple endpoint
    const response = await fetch(`${PIAPI_BASE_URL}/account`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Cost per generation (based on PiAPI pricing)
export const PIAPI_MUSIC_COST = 0.05; // $0.05 per generation
