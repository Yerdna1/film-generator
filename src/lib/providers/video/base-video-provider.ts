import {
  Provider,
  ProviderConfig,
  VideoGenerationRequest,
  VideoGenerationResponse,
  ProviderError,
  ProviderValidationError
} from '../types';
import { uploadMediaToS3 } from '@/lib/api';
import { getActionCost } from '@/lib/services/real-costs';

export abstract class BaseVideoProvider implements Provider<VideoGenerationRequest, VideoGenerationResponse> {
  abstract name: string;
  type: 'video' = 'video' as const;

  constructor(protected config: ProviderConfig) {}

  abstract validateConfig(): Promise<void>;

  abstract generateVideo(
    imageUrl: string,
    prompt: string,
    mode?: string,
    seed?: string | number
  ): Promise<{ base64?: string; externalUrl?: string; mimeType: string }>;

  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const {
      imageUrl,
      prompt = '',
      mode = 'default',
      seed,
      projectId,
    } = request;

    if (!imageUrl) {
      throw new ProviderValidationError('Image URL is required', this.name);
    }

    if (!prompt) {
      throw new ProviderValidationError('Prompt is required', this.name);
    }

    try {
      // Generate the video
      const { base64, externalUrl, mimeType } = await this.generateVideo(
        imageUrl,
        prompt,
        mode,
        seed
      );

      if (!base64 && !externalUrl) {
        throw new ProviderError(
          'No video generated',
          'NO_RESULT',
          this.name
        );
      }

      // Upload to S3 if we have base64 and projectId
      let videoUrl = externalUrl;
      let storageType: 'base64' | 's3' | 'external' = 'external';

      if (base64) {
        const base64DataUrl = `data:${mimeType};base64,${base64}`;

        if (projectId) {
          videoUrl = await uploadMediaToS3(base64DataUrl, 'video', projectId);
          if (!videoUrl.startsWith('data:')) {
            storageType = 's3';
          } else {
            storageType = 'base64';
          }
        } else {
          videoUrl = base64DataUrl;
          storageType = 'base64';
        }
      }

      // Calculate costs (fixed for now, could be based on duration later)
      const realCost = getActionCost('video', this.config.provider as any);

      return {
        status: 'complete',
        videoUrl,
        externalUrl,
        base64,
        url: videoUrl,
        realCost,
        metadata: {
          storage: storageType,
          mimeType,
          mode,
          seed: seed?.toString(),
          provider: this.name,
        }
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_ERROR',
        this.name,
        { imageUrl, prompt, mode }
      );
    }
  }

  estimateCost(): number {
    return getActionCost('video', this.config.provider as any);
  }

  /**
   * Helper to validate and process input image URL
   */
  protected async validateImageUrl(imageUrl: string): Promise<void> {
    try {
      if (imageUrl.startsWith('data:')) {
        // Data URL is valid
        return;
      }

      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // Test if URL is accessible
        const response = await fetch(imageUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          throw new ProviderValidationError(
            `Image URL is not accessible: ${response.status}`,
            this.name
          );
        }
        return;
      }

      throw new ProviderValidationError(
        'Invalid image URL format',
        this.name
      );
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderValidationError(
        'Failed to validate image URL',
        this.name
      );
    }
  }
}