import {
  Provider,
  ProviderConfig,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderError,
  ProviderValidationError
} from '../types';
import { uploadMediaToS3 } from '@/lib/api';
import { getImageCost } from '@/lib/services/real-costs';

export abstract class BaseImageProvider implements Provider<ImageGenerationRequest, ImageGenerationResponse> {
  abstract name: string;
  type: 'image' = 'image' as const;

  constructor(protected config: ProviderConfig) {}

  abstract validateConfig(): Promise<void>;

  abstract generateImage(
    prompt: string,
    aspectRatio: string,
    resolution: string,
    referenceImages?: Array<{ name: string; imageUrl: string }>
  ): Promise<{ base64: string; mimeType: string }>;

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const {
      prompt = '',
      aspectRatio = '16:9',
      resolution = '2k',
      referenceImages = [],
      projectId,
    } = request;

    if (!prompt) {
      throw new ProviderValidationError('Prompt is required', this.name);
    }

    try {
      // Generate the image
      const { base64, mimeType } = await this.generateImage(
        prompt,
        aspectRatio,
        resolution,
        referenceImages
      );

      // Create data URL
      const base64DataUrl = `data:${mimeType};base64,${base64}`;

      // Upload to S3 if projectId is provided
      let imageUrl = base64DataUrl;
      let storageType: 'base64' | 's3' = 'base64';

      if (projectId) {
        imageUrl = await uploadMediaToS3(base64DataUrl, 'image', projectId);
        if (!imageUrl.startsWith('data:')) {
          storageType = 's3';
        }
      }

      // Calculate costs
      const realCost = getImageCost(resolution as any);

      return {
        status: 'complete',
        imageUrl,
        base64,
        url: imageUrl,
        realCost,
        metadata: {
          storage: storageType,
          mimeType,
          aspectRatio,
          resolution,
          provider: this.name,
        }
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_ERROR',
        this.name,
        { prompt, aspectRatio, resolution }
      );
    }
  }

  estimateCost(request: ImageGenerationRequest): number {
    return getImageCost(request.resolution as any || '2k');
  }

  /**
   * Helper method to process reference images
   */
  protected async processReferenceImages(
    referenceImages: Array<{ name: string; imageUrl: string }>
  ): Promise<Array<{ name: string; base64Data: string; mimeType: string }>> {
    const imagePromises = referenceImages.map(async (ref) => {
      try {
        let base64Data: string;
        let mimeType: string;

        if (ref.imageUrl.startsWith('data:')) {
          const matches = ref.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            [, mimeType, base64Data] = matches;
            return { name: ref.name, base64Data, mimeType };
          }
          return null;
        } else if (ref.imageUrl.startsWith('http')) {
          const imageResponse = await fetch(ref.imageUrl);
          if (!imageResponse.ok) return null;
          const arrayBuffer = await imageResponse.arrayBuffer();
          base64Data = Buffer.from(arrayBuffer).toString('base64');
          mimeType = imageResponse.headers.get('content-type') || 'image/png';
          return { name: ref.name, base64Data, mimeType };
        }
        return null;
      } catch (error) {
        console.error(`[${this.name}] Error processing reference image for ${ref.name}:`, error);
        return null;
      }
    });

    const processedImages = (await Promise.all(imagePromises)).filter(Boolean);
    return processedImages as Array<{ name: string; base64Data: string; mimeType: string }>;
  }
}