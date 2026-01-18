import { BaseTTSProvider } from './base-tts-provider';
import {
  AsyncProvider,
  TTSGenerationRequest,
  TTSGenerationResponse,
  TaskStatus,
  ProviderError,
  ProviderValidationError,
  ProviderAuthError,
  ProviderRateLimitError
} from '../types';
import { RegisterProvider } from '../provider-factory';
import { pollTask, mapProviderState, extractResult } from '@/lib/api/generation';
import { downloadAudioAsBase64 } from '@/lib/api/generation';

const KIE_API_URL = 'https://api.kie.ai';

@RegisterProvider('tts', 'kie', {
  description: 'KIE.ai text-to-speech with multiple voice models',
  features: [
    'Multiple voice models',
    'High-quality synthesis',
    'Async generation with polling',
    'Multiple languages',
    'Voice cloning support'
  ],
  costPerUnit: 0.00005, // Per character
  isAsync: true,
})
export class KieTTSProvider extends BaseTTSProvider implements AsyncProvider<TTSGenerationRequest, TTSGenerationResponse> {
  name = 'kie';
  private taskId?: string;

  async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new ProviderValidationError('KIE API key is required', this.name);
    }

    // Test API key validity
    try {
      const response = await fetch(`${KIE_API_URL}/api/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (response.status === 401) {
        throw new ProviderAuthError('Invalid KIE API key', this.name);
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      // Network errors are okay during validation
    }
  }

  async generateSpeech(
    text: string,
    voice?: string,
    voiceSettings?: TTSGenerationRequest['voiceSettings'],
    format?: 'mp3' | 'wav' | 'opus' | 'aac',
    languageCode?: string
  ): Promise<{ audio: Buffer; format: string }> {
    // For KIE, we need to use the async workflow
    const request: TTSGenerationRequest = {
      text,
      voice,
      voiceSettings,
      format,
      languageCode,
    };

    const taskResult = await this.createTask(request);
    this.taskId = taskResult.taskId;

    // Poll for completion
    const pollingResult = await pollTask({
      taskId: this.taskId,
      checkStatus: (id) => this.checkStatus(id),
      maxAttempts: 60,
      initialDelay: 1000,
      maxDelay: 5000,
    });

    if (!pollingResult.success) {
      throw new ProviderError(
        pollingResult.error || 'TTS generation failed',
        'GENERATION_ERROR',
        this.name
      );
    }

    const finalResult = await this.getResult(this.taskId);

    if (!finalResult.base64 && !finalResult.externalUrl) {
      throw new ProviderError(
        'No audio generated',
        'NO_RESULT',
        this.name
      );
    }

    // If we have an external URL but no base64, download it
    if (!finalResult.base64 && finalResult.externalUrl) {
      const base64 = await downloadAudioAsBase64(finalResult.externalUrl, finalResult.format as any);
      if (!base64) {
        throw new ProviderError(
          'Failed to download generated audio',
          'DOWNLOAD_ERROR',
          this.name
        );
      }
      return {
        audio: Buffer.from(base64, 'base64'),
        format: finalResult.format || 'mp3',
      };
    }

    return {
      audio: Buffer.from(finalResult.base64!, 'base64'),
      format: finalResult.format || 'mp3',
    };
  }

  async createTask(request: TTSGenerationRequest): Promise<{ taskId: string }> {
    const {
      text,
      voice,
      voiceSettings,
      format = 'mp3',
      languageCode = 'en-US',
    } = request;

    // Build the request body
    const body: any = {
      text,
      model: this.config.model || 'elevenlabs/text-to-dialogue-v3',
      voice: voice || 'adam',
      language: languageCode,
      output_format: format,
    };

    // Add voice settings if provided
    if (voiceSettings) {
      body.voice_settings = {
        stability: voiceSettings.stability || 0.5,
        similarity_boost: voiceSettings.similarityBoost || 0.75,
        speaking_rate: voiceSettings.speed || 1.0,
        pitch: voiceSettings.pitch || 0,
      };
    }

    try {
      const response = await fetch(`${KIE_API_URL}/api/v1/generate/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        if (response.status === 401) {
          throw new ProviderAuthError('Invalid KIE API key', this.name);
        }
        if (response.status === 429) {
          throw new ProviderRateLimitError(
            'KIE rate limit exceeded',
            this.name,
            60000
          );
        }
        throw new ProviderError(
          error.message || 'Failed to create TTS task',
          'API_ERROR',
          this.name,
          { status: response.status, error }
        );
      }

      const result = await response.json();
      if (!result.data?.taskId) {
        throw new ProviderError(
          'No task ID returned',
          'INVALID_RESPONSE',
          this.name,
          result
        );
      }

      return { taskId: result.data.taskId };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to create KIE task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_ERROR',
        this.name
      );
    }
  }

  async checkStatus(taskId: string): Promise<TaskStatus> {
    try {
      const response = await fetch(
        `${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
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

      const result = await response.json();
      const taskData = result.data;

      if (!taskData) {
        throw new ProviderError(
          'Invalid status response',
          'INVALID_RESPONSE',
          this.name
        );
      }

      // Map KIE status to our standard status
      const status = mapProviderState(taskData.state, 'kie');

      return {
        status,
        progress: taskData.progress || 0,
        message: taskData.message,
        error: taskData.error,
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

  async getResult(taskId: string): Promise<TTSGenerationResponse> {
    try {
      const response = await fetch(
        `${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
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

      const result = await response.json();
      const taskData = result.data;

      if (!taskData) {
        throw new ProviderError(
          'Invalid result response',
          'INVALID_RESPONSE',
          this.name
        );
      }

      // Extract audio URL
      const audioUrl = extractResult<string>(taskData, 'kie', 'audio');

      if (!audioUrl && taskData.resultUrl) {
        return {
          status: 'complete',
          externalUrl: taskData.resultUrl,
          format: taskData.format || 'mp3',
        };
      }

      if (!audioUrl) {
        throw new ProviderError(
          'No audio URL found in result',
          'NO_RESULT',
          this.name,
          taskData
        );
      }

      return {
        status: 'complete',
        externalUrl: audioUrl,
        format: taskData.format || 'mp3',
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