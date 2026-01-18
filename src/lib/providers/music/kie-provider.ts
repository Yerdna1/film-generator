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
import { pollTask, mapProviderState, extractResult } from '@/lib/api/generation';
import { downloadAudioAsBase64 } from '@/lib/api/generation';
import { prisma } from '@/lib/db/prisma';

const KIE_API_URL = 'https://api.kie.ai';

@RegisterProvider('music', 'kie', {
  description: 'KIE.ai music generation with multiple models',
  features: [
    'Multiple music models',
    'High-quality generation',
    'Async generation with polling',
    'Various music styles',
    'Custom duration support'
  ],
  costPerUnit: 0.15,
  isAsync: true,
})
export class KieMusicProvider extends BaseMusicProvider implements AsyncProvider<MusicGenerationRequest, MusicGenerationResponse> {
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

  async generateMusic(
    prompt: string,
    description?: string,
    duration: number = 30,
    style?: string,
    instruments?: string[]
  ): Promise<{ audio: Buffer; format: string; tags?: string[]; externalUrl?: string }> {
    // For KIE, we need to use the async workflow
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
      initialDelay: 3000,
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

    if (!finalResult.externalUrl && !finalResult.base64) {
      throw new ProviderError(
        'No music generated',
        'NO_RESULT',
        this.name
      );
    }

    // Download if we only have external URL
    let audioBuffer: Buffer;
    if (finalResult.base64) {
      audioBuffer = Buffer.from(finalResult.base64, 'base64');
    } else if (finalResult.externalUrl || finalResult.musicUrl) {
      const url = finalResult.externalUrl || finalResult.musicUrl!;
      const base64 = await downloadAudioAsBase64(url);
      if (!base64) {
        throw new ProviderError(
          'Failed to download generated music',
          'DOWNLOAD_ERROR',
          this.name
        );
      }
      audioBuffer = Buffer.from(base64, 'base64');
    } else {
      throw new ProviderError(
        'No music data available',
        'NO_RESULT',
        this.name
      );
    }

    return {
      audio: audioBuffer,
      format: 'mp3', // KIE always returns MP3
      tags: finalResult.tags || [],
      externalUrl: finalResult.externalUrl || finalResult.musicUrl,
    };
  }

  async createTask(request: MusicGenerationRequest): Promise<{ taskId: string }> {
    const {
      prompt,
      description,
      duration = 30,
      style,
    } = request;

    // Get model configuration if provided
    let apiModelId = this.config.model || 'suno/v3-5-music';

    // Check if we need to map model ID
    if (this.config.model && !this.config.model.includes('/')) {
      try {
        const modelConfig = await prisma.kieMusicModel.findUnique({
          where: { modelId: this.config.model },
          select: { apiModelId: true },
        });
        if (modelConfig?.apiModelId) {
          apiModelId = modelConfig.apiModelId;
        }
      } catch (error) {
        console.error('Failed to lookup KIE music model:', error);
      }
    }

    // Build the request body
    const body: any = {
      prompt: description || prompt,
      model: apiModelId,
      duration,
    };

    // Add style to prompt if provided
    if (style) {
      body.prompt = `${style} style: ${body.prompt}`;
    }

    try {
      const response = await fetch(`${KIE_API_URL}/api/v1/generate/music`, {
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
          error.message || 'Failed to create music task',
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

      // Extract progress
      let progress = 0;
      if (taskData.progress) {
        progress = parseFloat(taskData.progress);
      } else if (status === 'complete') {
        progress = 100;
      }

      return {
        status,
        progress,
        message: taskData.message || taskData.state,
        error: taskData.error || taskData.failReason,
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

      // Extract music URL using the helper
      const musicUrl = extractResult<string>(taskData, 'kie', 'music');

      if (!musicUrl && taskData.resultUrl) {
        return {
          status: 'complete',
          externalUrl: taskData.resultUrl,
          tags: taskData.tags || [],
        };
      }

      if (!musicUrl) {
        throw new ProviderError(
          'No music URL found in result',
          'NO_RESULT',
          this.name,
          taskData
        );
      }

      return {
        status: 'complete',
        externalUrl: musicUrl,
        tags: taskData.tags || [],
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