import { BaseImageProvider } from './base-image-provider';
import {
  AsyncProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  TaskStatus,
  ProviderError,
  ProviderValidationError,
  ProviderAuthError,
  ProviderRateLimitError
} from '../types';
import { RegisterProvider } from '../provider-factory';
import { pollTask, mapProviderState, extractResult } from '@/lib/api/generation';
import { downloadImageAsBase64 } from '@/lib/api/generation';

const KIE_API_URL = 'https://api.kie.ai';

@RegisterProvider('image', 'kie', {
  description: 'KIE.ai image generation with multiple models',
  features: [
    'Multiple model options',
    'High-quality generation',
    'Character consistency support',
    'Async generation with polling',
    'Competitive pricing'
  ],
  costPerUnit: 0.015,
  isAsync: true,
})
export class KieImageProvider extends BaseImageProvider implements AsyncProvider<ImageGenerationRequest, ImageGenerationResponse> {
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

  async generateImage(
    prompt: string,
    aspectRatio: string,
    resolution: string,
    referenceImages?: Array<{ name: string; imageUrl: string }>
  ): Promise<{ base64: string; mimeType: string }> {
    // For KIE, we need to use the async workflow
    const request: ImageGenerationRequest = {
      prompt,
      aspectRatio,
      resolution: resolution as any,
      referenceImages: referenceImages || [],
    };

    const taskResult = await this.createTask(request);
    this.taskId = taskResult.taskId;

    // Poll for completion
    const pollingResult = await pollTask({
      taskId: this.taskId,
      checkStatus: (id) => this.checkStatus(id),
      maxAttempts: 60,
      initialDelay: 2000,
      maxDelay: 10000,
    });

    if (!pollingResult.success) {
      throw new ProviderError(
        pollingResult.error || 'Image generation failed',
        'GENERATION_ERROR',
        this.name
      );
    }

    const finalResult = await this.getResult(this.taskId);

    if (!finalResult.base64 && !finalResult.externalUrl) {
      throw new ProviderError(
        'No image generated',
        'NO_RESULT',
        this.name
      );
    }

    // If we have an external URL but no base64, download it
    if (!finalResult.base64 && finalResult.externalUrl) {
      const base64 = await downloadImageAsBase64(finalResult.externalUrl);
      if (!base64) {
        throw new ProviderError(
          'Failed to download generated image',
          'DOWNLOAD_ERROR',
          this.name
        );
      }
      return {
        base64,
        mimeType: 'image/png',
      };
    }

    return {
      base64: finalResult.base64!,
      mimeType: 'image/png',
    };
  }

  async createTask(request: ImageGenerationRequest): Promise<{ taskId: string }> {
    const {
      prompt,
      aspectRatio = '16:9',
      resolution = '2k',
      referenceImages = [],
    } = request;

    // Map resolution to KIE format
    const resolutionMap: Record<string, string> = {
      'hd': '1024',
      '2k': '1536',
      '4k': '2048',
    };
    const kieResolution = resolutionMap[resolution] || '1536';

    // Build the request body
    const body: any = {
      text: prompt,
      model: this.config.model || 'seedream/4-5-text-to-image',
      resolution: kieResolution,
      aspect_ratio: aspectRatio,
    };

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      const processedImages = await this.processReferenceImages(referenceImages);
      if (processedImages.length > 0) {
        body.reference_images = processedImages.map(img => ({
          name: img.name,
          data: img.base64Data,
        }));
      }
    }

    try {
      const response = await fetch(`${KIE_API_URL}/api/v1/generate/image`, {
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
          error.message || 'Failed to create image task',
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

  async getResult(taskId: string): Promise<ImageGenerationResponse> {
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

      // Extract image URL
      const imageUrl = extractResult<string>(taskData, 'kie', 'image');

      if (!imageUrl) {
        // Try direct field access
        if (taskData.resultUrl) {
          return {
            status: 'complete',
            externalUrl: taskData.resultUrl,
          };
        }
        throw new ProviderError(
          'No image URL found in result',
          'NO_RESULT',
          this.name,
          taskData
        );
      }

      return {
        status: 'complete',
        externalUrl: imageUrl,
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