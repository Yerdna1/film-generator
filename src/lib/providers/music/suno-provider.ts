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

const SUNO_API_URL = 'https://api.suno.ai/v1';

@RegisterProvider('music', 'suno', {
  description: 'Suno AI music generation',
  features: [
    'High-quality AI music',
    'Lyrics generation',
    'Various music styles',
    'Instrumental and vocal tracks',
    'Custom style prompts'
  ],
  limitations: [
    'Requires Suno API access',
    'Generation can take several minutes'
  ],
  costPerUnit: 0.15,
  isAsync: true,
})
export class SunoMusicProvider extends BaseMusicProvider implements AsyncProvider<MusicGenerationRequest, MusicGenerationResponse> {
  name = 'suno';
  private taskId?: string;

  async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new ProviderValidationError('Suno API key is required', this.name);
    }

    // Test API key validity
    try {
      const response = await fetch(`${SUNO_API_URL}/account`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (response.status === 401) {
        throw new ProviderAuthError('Invalid Suno API key', this.name);
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
    // For Suno, we need to use the async workflow
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
      tags: finalResult.tags || [],
      externalUrl: audioUrl,
    };
  }

  async createTask(request: MusicGenerationRequest): Promise<{ taskId: string }> {
    const {
      prompt,
      description,
      style,
      instruments,
    } = request;

    // Build Suno prompt
    let fullPrompt = description || prompt;

    // Add style to prompt
    if (style) {
      fullPrompt = `[${style}] ${fullPrompt}`;
    }

    // Add instruments if specified
    if (instruments && instruments.length > 0) {
      fullPrompt += ` [${instruments.join(', ')}]`;
    }

    const body: any = {
      prompt: fullPrompt,
      make_instrumental: false, // Could be made configurable
      model: 'chirp-v3-5', // Latest Suno model
      wait_audio: false, // We'll poll for results
    };

    try {
      const response = await fetch(`${SUNO_API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        if (response.status === 401) {
          throw new ProviderAuthError('Invalid Suno API key', this.name);
        }
        if (response.status === 429) {
          throw new ProviderRateLimitError(
            'Suno rate limit exceeded',
            this.name,
            60000
          );
        }
        throw new ProviderError(
          error.error || error.message || 'Failed to create music task',
          'API_ERROR',
          this.name,
          { status: response.status, error }
        );
      }

      const result = await response.json();

      // Suno returns clips array with IDs
      if (!result.clips || result.clips.length === 0) {
        throw new ProviderError(
          'No clips returned',
          'INVALID_RESPONSE',
          this.name,
          result
        );
      }

      // Use the first clip's ID as task ID
      return { taskId: result.clips[0].id };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to create Suno task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_ERROR',
        this.name
      );
    }
  }

  async checkStatus(taskId: string): Promise<TaskStatus> {
    try {
      const response = await fetch(
        `${SUNO_API_URL}/clips/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
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

      const clipData = await response.json();

      if (!clipData) {
        throw new ProviderError(
          'Invalid status response',
          'INVALID_RESPONSE',
          this.name
        );
      }

      // Map Suno status to our standard status
      const status = mapProviderState(clipData.status, 'suno');

      // Calculate progress based on status
      let progress = 0;
      if (clipData.status === 'streaming') {
        progress = 50;
      } else if (clipData.status === 'complete') {
        progress = 100;
      } else if (clipData.status === 'queued') {
        progress = 10;
      } else if (clipData.status === 'submitted') {
        progress = 5;
      }

      return {
        status,
        progress,
        message: clipData.status,
        error: clipData.error_message,
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
        `${SUNO_API_URL}/clips/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
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

      const clipData = await response.json();

      if (!clipData) {
        throw new ProviderError(
          'Invalid result response',
          'INVALID_RESPONSE',
          this.name
        );
      }

      const audioUrl = clipData.audio_url;

      if (!audioUrl) {
        throw new ProviderError(
          'No audio URL found in result',
          'NO_RESULT',
          this.name,
          clipData
        );
      }

      return {
        status: 'complete',
        musicUrl: audioUrl,
        externalUrl: audioUrl,
        duration: clipData.duration || 30,
        tags: [
          clipData.style,
          clipData.genre_tags,
          clipData.mood_tags,
        ].flat().filter(Boolean) as string[],
        metadata: {
          title: clipData.title,
          lyrics: clipData.lyrics,
          id: clipData.id,
          is_instrumental: clipData.is_instrumental,
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