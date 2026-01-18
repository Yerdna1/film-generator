import { BaseMusicProvider } from './base-music-provider';
import {
  AsyncProvider,
  MusicGenerationRequest,
  MusicGenerationResponse,
  TaskStatus,
  ProviderError,
  ProviderValidationError,
  ProviderAuthError,
  ProviderRateLimitError
} from '../types';
import { RegisterProvider } from '../provider-factory';
import { pollTask, mapProviderState } from '@/lib/api/generation';
import { downloadAudioAsBase64 } from '@/lib/api/generation';

const PIAPI_API_URL = 'https://api.piapi.ai';

@RegisterProvider('music', 'piapi', {
  description: 'PiAPI music generation (Suno/Udio via API)',
  features: [
    'Access to Suno and Udio models',
    'High-quality music generation',
    'Various music styles',
    'Lyrics support',
    'Async generation'
  ],
  costPerUnit: 0.12,
  isAsync: true,
})
export class PiapiMusicProvider extends BaseMusicProvider implements AsyncProvider<MusicGenerationRequest, MusicGenerationResponse> {
  name = 'piapi';
  private taskId?: string;

  async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new ProviderValidationError('PiAPI key is required', this.name);
    }

    // Test API key validity
    try {
      const response = await fetch(`${PIAPI_API_URL}/api/v1/meme`, {
        method: 'GET',
        headers: {
          'x-api-key': this.config.apiKey,
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new ProviderAuthError('Invalid PiAPI key', this.name);
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      // Network errors are okay during validation
    }
  }

  async generateMusic(
    prompt: string,
    description?: string,
    duration: number = 30,
    style?: string,
    instruments?: string[]
  ): Promise<{ audio: Buffer; format: string; tags?: string[]; externalUrl?: string }> {
    // For PiAPI, we need to use the async workflow
    const request: MusicGenerationRequest = {
      prompt,
      description: description || prompt,
      duration,
      style,
      instruments,
    };

    const taskResult = await this.createTask(request);
    this.taskId = taskResult.taskId;

    // Poll for completion
    const pollingResult = await pollTask({
      taskId: this.taskId,
      checkStatus: (id) => this.checkStatus(id),
      maxAttempts: 120, // Music takes longer
      initialDelay: 5000,
      maxDelay: 15000,
      timeout: 600000, // 10 minutes
    });

    if (!pollingResult.success) {
      throw new ProviderError(
        pollingResult.error || 'Music generation failed',
        'GENERATION_ERROR',
        this.name
      );
    }

    const finalResult = await this.getResult(this.taskId);

    if (!finalResult.externalUrl && !finalResult.musicUrl && !finalResult.base64) {
      throw new ProviderError(
        'No music generated',
        'NO_RESULT',
        this.name
      );
    }

    // Download the audio
    const audioUrl = finalResult.externalUrl || finalResult.musicUrl || '';
    let audioBuffer: Buffer;

    if (finalResult.base64) {
      audioBuffer = Buffer.from(finalResult.base64, 'base64');
    } else {
      const base64 = await downloadAudioAsBase64(audioUrl);
      if (!base64) {
        throw new ProviderError(
          'Failed to download generated music',
          'DOWNLOAD_ERROR',
          this.name
        );
      }
      audioBuffer = Buffer.from(base64, 'base64');
    }

    return {
      audio: audioBuffer,
      format: 'mp3',
      tags: finalResult.tags || (style ? [style] : []),
      externalUrl: audioUrl,
    };
  }

  async createTask(request: MusicGenerationRequest): Promise<{ taskId: string }> {
    const {
      prompt,
      description,
      duration = 30,
      style,
    } = request;

    // Build prompt with style
    let fullPrompt = description || prompt;
    if (style) {
      fullPrompt = `${style} style: ${fullPrompt}`;
    }

    // PiAPI uses a specific endpoint for Suno
    const body: any = {
      prompt: fullPrompt,
      make_instrumental: false,
      wait_audio: false, // We'll poll for results
    };

    try {
      const response = await fetch(`${PIAPI_API_URL}/api/suno/v1/music`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        if (response.status === 401 || response.status === 403) {
          throw new ProviderAuthError('Invalid PiAPI key', this.name);
        }
        if (response.status === 429) {
          throw new ProviderRateLimitError(
            'PiAPI rate limit exceeded',
            this.name,
            60000
          );
        }
        throw new ProviderError(
          error.message || error.detail?.message || 'Failed to create music task',
          'API_ERROR',
          this.name,
          { status: response.status, error }
        );
      }

      const result = await response.json();

      // PiAPI returns task info directly
      if (!result.data?.task_id && !result.task_id) {
        throw new ProviderError(
          'No task ID returned',
          'INVALID_RESPONSE',
          this.name,
          result
        );
      }

      return { taskId: result.data?.task_id || result.task_id };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to create PiAPI task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_ERROR',
        this.name
      );
    }
  }

  async checkStatus(taskId: string): Promise<TaskStatus> {
    try {
      const response = await fetch(
        `${PIAPI_API_URL}/api/suno/v1/music/${taskId}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new ProviderError(
          'Failed to check task status',
          'API_ERROR',
          this.name,
          { status: response.status }
        );
      }

      const result = await response.json();
      const taskData = result.data || result;

      if (!taskData) {
        throw new ProviderError(
          'Invalid status response',
          'INVALID_RESPONSE',
          this.name
        );
      }

      // Map PiAPI status to our standard status
      const status = mapProviderState(taskData.status, 'piapi');

      return {
        status,
        progress: taskData.progress || 0,
        message: taskData.message,
        error: taskData.error_message,
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to check status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_ERROR',
        this.name
      );
    }
  }

  async getResult(taskId: string): Promise<MusicGenerationResponse> {
    try {
      const response = await fetch(
        `${PIAPI_API_URL}/api/suno/v1/music/${taskId}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new ProviderError(
          'Failed to get result',
          'API_ERROR',
          this.name,
          { status: response.status }
        );
      }

      const result = await response.json();
      const taskData = result.data || result;

      if (!taskData) {
        throw new ProviderError(
          'Invalid result response',
          'INVALID_RESPONSE',
          this.name
        );
      }

      // PiAPI returns clips array
      const clips = taskData.clips || taskData.music_data || [];
      if (clips.length === 0) {
        throw new ProviderError(
          'No music clips found in result',
          'NO_RESULT',
          this.name,
          taskData
        );
      }

      // Get the first clip
      const clip = clips[0];
      const audioUrl = clip.audio_url || clip.url;

      if (!audioUrl) {
        throw new ProviderError(
          'No audio URL found in result',
          'NO_RESULT',
          this.name,
          clip
        );
      }

      return {
        status: 'complete',
        musicUrl: audioUrl,
        externalUrl: audioUrl,
        duration: clip.duration,
        tags: [clip.style, clip.tags].flat().filter(Boolean) as string[],
        metadata: {
          title: clip.title,
          style: clip.style,
          id: clip.id,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to get result: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_ERROR',
        this.name
      );
    }
  }
}