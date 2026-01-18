import { BaseVideoProvider } from './base-video-provider';
import {
  AsyncProvider,
  VideoGenerationRequest,
  VideoGenerationResponse,
  TaskStatus,
  ProviderError,
  ProviderValidationError,
  ProviderAuthError,
  ProviderRateLimitError
} from '../types';
import { RegisterProvider } from '../provider-factory';
import { pollTask, mapProviderState, extractResult } from '@/lib/api/generation';
import { downloadVideoAsBase64 } from '@/lib/api/generation';
import { prisma } from '@/lib/db/prisma';

const KIE_API_URL = 'https://api.kie.ai';

@RegisterProvider('video', 'kie', {
  description: 'KIE.ai video generation from images',
  features: [
    'Image-to-video generation',
    'Multiple motion modes',
    'High-quality output',
    'Async generation with polling',
    'Model selection support'
  ],
  costPerUnit: 0.5,
  isAsync: true,
})
export class KieVideoProvider extends BaseVideoProvider implements AsyncProvider<VideoGenerationRequest, VideoGenerationResponse> {
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

  async generateVideo(
    imageUrl: string,
    prompt: string,
    mode?: string,
    seed?: string | number
  ): Promise<{ base64?: string; externalUrl?: string; mimeType: string }> {
    // Validate image URL
    await this.validateImageUrl(imageUrl);

    // For KIE, we need to use the async workflow
    const request: VideoGenerationRequest = {
      imageUrl,
      prompt,
      mode,
      seed,
    };

    const taskResult = await this.createTask(request);
    this.taskId = taskResult.taskId;

    // Poll for completion
    const pollingResult = await pollTask({
      taskId: this.taskId,
      checkStatus: (id) => this.checkStatus(id),
      maxAttempts: 120, // Videos take longer
      initialDelay: 3000,
      maxDelay: 15000,
      timeout: 600000, // 10 minutes
    });

    if (!pollingResult.success) {
      throw new ProviderError(
        pollingResult.error || 'Video generation failed',
        'GENERATION_ERROR',
        this.name
      );
    }

    const finalResult = await this.getResult(this.taskId);

    if (!finalResult.base64 && !finalResult.externalUrl) {
      throw new ProviderError(
        'No video generated',
        'NO_RESULT',
        this.name
      );
    }

    // If we have an external URL but no base64, we can optionally download it
    // For videos, we usually keep external URLs to avoid large base64
    return {
      base64: finalResult.base64,
      externalUrl: finalResult.externalUrl || finalResult.videoUrl,
      mimeType: 'video/mp4',
    };
  }

  async createTask(request: VideoGenerationRequest): Promise<{ taskId: string }> {
    const {
      imageUrl,
      prompt,
      mode = 'default',
      seed,
    } = request;

    // Get model configuration if provided
    let apiModelId = this.config.model || 'grok-imagine/image-to-video';

    // Check if we need to map model ID
    if (this.config.model && !this.config.model.includes('/')) {
      try {
        const modelConfig = await prisma.kieVideoModel.findUnique({
          where: { modelId: this.config.model },
          select: { apiModelId: true },
        });
        if (modelConfig?.apiModelId) {
          apiModelId = modelConfig.apiModelId;
        }
      } catch (error) {
        console.error('Failed to lookup KIE video model:', error);
      }
    }

    const body: any = {
      image_url: imageUrl,
      prompt: enhancePromptForMotion(prompt || ''),
      model: apiModelId,
      mode: mode || 'default',
    };

    if (seed !== undefined) {
      body.seed = parseInt(seed.toString(), 10);
    }

    try {
      const response = await fetch(`${KIE_API_URL}/api/v1/generate/video`, {
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
          error.message || 'Failed to create video task',
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

      // Extract progress percentage
      let progress = 0;
      if (taskData.progress) {
        progress = parseFloat(taskData.progress);
      } else if (taskData.progressPercent) {
        progress = taskData.progressPercent;
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

  async getResult(taskId: string): Promise<VideoGenerationResponse> {
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

      // Extract video URL using the helper
      let videoUrl = extractResult<string>(taskData, 'kie', 'video');

      // Fallback to direct field access
      if (!videoUrl) {
        videoUrl = taskData.resultUrl || taskData.videoUrl || taskData.video_url;
      }

      if (!videoUrl) {
        throw new ProviderError(
          'No video URL found in result',
          'NO_RESULT',
          this.name,
          taskData
        );
      }

      return {
        status: 'complete',
        externalUrl: videoUrl,
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

/**
 * Enhance prompt with motion keywords for better video generation
 */
function enhancePromptForMotion(prompt: string): string {
  const motionKeywords = ['camera movement', 'smooth motion', 'dynamic'];
  const hasMotionKeyword = motionKeywords.some(keyword =>
    prompt.toLowerCase().includes(keyword)
  );

  if (!hasMotionKeyword) {
    return `${prompt}, smooth camera movement`;
  }
  return prompt;
}