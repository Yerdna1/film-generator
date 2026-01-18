import { BaseImageProvider } from './base-image-provider';
import { ProviderError, ProviderValidationError, ProviderRateLimitError } from '../types';
import { RegisterProvider } from '../provider-factory';

@RegisterProvider('image', 'modal', {
  description: 'Modal.com self-hosted Qwen-Image for fast image generation',
  features: [
    'Self-hosted infrastructure',
    'Fast generation with warm containers',
    'Custom model support',
    'No rate limits (depends on your Modal setup)',
    'Cost-effective for high volume'
  ],
  costPerUnit: 0.01,
  isAsync: false,
})
export class ModalImageProvider extends BaseImageProvider {
  name = 'modal';

  async validateConfig(): Promise<void> {
    if (!this.config.endpoint) {
      throw new ProviderValidationError(
        'Modal endpoint URL is required',
        this.name
      );
    }

    // Validate endpoint format
    try {
      new URL(this.config.endpoint);
    } catch {
      throw new ProviderValidationError(
        'Invalid Modal endpoint URL',
        this.name
      );
    }

    // Test endpoint availability
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 404) {
        throw new ProviderValidationError(
          'Modal endpoint not found. Make sure your Modal app is deployed.',
          this.name
        );
      }
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
        throw new ProviderValidationError(
          'Cannot connect to Modal endpoint',
          this.name
        );
      }
    }
  }

  async generateImage(
    prompt: string,
    aspectRatio: string,
    resolution: string,
    referenceImages?: Array<{ name: string; imageUrl: string }>
  ): Promise<{ base64: string; mimeType: string }> {
    // Map aspect ratios to dimensions
    const aspectRatioMap: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1920, height: 1080 },
      '21:9': { width: 2560, height: 1080 },
      '4:3': { width: 1440, height: 1080 },
      '1:1': { width: 1080, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '3:4': { width: 1080, height: 1440 },
    };

    const dimensions = aspectRatioMap[aspectRatio] || aspectRatioMap['16:9'];

    // Scale dimensions based on resolution
    let scale = 1;
    if (resolution === '4k') {
      scale = 2;
    } else if (resolution === 'hd') {
      scale = 0.5;
    }

    const width = Math.round(dimensions.width * scale);
    const height = Math.round(dimensions.height * scale);

    try {
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy',
          width,
          height,
          num_inference_steps: 25,
          guidance_scale: 7.5,
          num_images_per_prompt: 1,
        }),
        signal: AbortSignal.timeout(300000), // 5 minute timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 503) {
          throw new ProviderError(
            'Modal endpoint is starting up. Please try again in a moment.',
            'SERVICE_UNAVAILABLE',
            this.name,
            { status: response.status }
          );
        }
        throw new ProviderError(
          `Modal generation failed: ${errorText}`,
          'GENERATION_ERROR',
          this.name,
          { status: response.status, error: errorText }
        );
      }

      const result = await response.json();

      if (!result.images?.[0]) {
        throw new ProviderError(
          'No image generated',
          'NO_RESULT',
          this.name
        );
      }

      // Modal returns base64 directly
      return {
        base64: result.images[0],
        mimeType: 'image/png',
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error?.cause?.code === 'ECONNRESET' || error?.cause?.code === 'ETIMEDOUT') {
        throw new ProviderError(
          'Modal endpoint timeout - container may be cold starting',
          'TIMEOUT',
          this.name
        );
      }

      throw new ProviderError(
        `Modal request failed: ${error.message}`,
        'REQUEST_ERROR',
        this.name,
        { error: error.message }
      );
    }
  }
}

// Modal-Edit variant for character consistency
@RegisterProvider('image', 'modal-edit', {
  description: 'Modal.com self-hosted Qwen-Image-Edit for character consistency',
  features: [
    'Character consistency across images',
    'Reference-based generation',
    'Style transfer capabilities',
    'Edit existing images',
    'Self-hosted infrastructure'
  ],
  limitations: [
    'Requires reference images',
    'Slower than standard generation'
  ],
  costPerUnit: 0.02,
  isAsync: false,
})
export class ModalEditImageProvider extends ModalImageProvider {
  name = 'modal-edit';

  async generateImage(
    prompt: string,
    aspectRatio: string,
    resolution: string,
    referenceImages?: Array<{ name: string; imageUrl: string }>
  ): Promise<{ base64: string; mimeType: string }> {
    if (!referenceImages || referenceImages.length === 0) {
      throw new ProviderValidationError(
        'Reference images are required for Modal-Edit provider',
        this.name
      );
    }

    // Process reference images
    const processedImages = await this.processReferenceImages(referenceImages);
    if (processedImages.length === 0) {
      throw new ProviderValidationError(
        'Failed to process reference images',
        this.name
      );
    }

    // Use the first reference image as the base
    const referenceImage = processedImages[0];

    // Map aspect ratios to dimensions (same as parent)
    const aspectRatioMap: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1920, height: 1080 },
      '21:9': { width: 2560, height: 1080 },
      '4:3': { width: 1440, height: 1080 },
      '1:1': { width: 1080, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '3:4': { width: 1080, height: 1440 },
    };

    const dimensions = aspectRatioMap[aspectRatio] || aspectRatioMap['16:9'];

    // Scale dimensions based on resolution
    let scale = 1;
    if (resolution === '4k') {
      scale = 2;
    } else if (resolution === 'hd') {
      scale = 0.5;
    }

    const width = Math.round(dimensions.width * scale);
    const height = Math.round(dimensions.height * scale);

    try {
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image: referenceImage.base64Data,
          negative_prompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy',
          width,
          height,
          strength: 0.7, // How much to modify the reference image
          guidance_scale: 7.5,
          num_inference_steps: 30,
        }),
        signal: AbortSignal.timeout(300000), // 5 minute timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 503) {
          throw new ProviderError(
            'Modal-Edit endpoint is starting up. Please try again in a moment.',
            'SERVICE_UNAVAILABLE',
            this.name,
            { status: response.status }
          );
        }
        throw new ProviderError(
          `Modal-Edit generation failed: ${errorText}`,
          'GENERATION_ERROR',
          this.name,
          { status: response.status, error: errorText }
        );
      }

      const result = await response.json();

      if (!result.images?.[0]) {
        throw new ProviderError(
          'No image generated',
          'NO_RESULT',
          this.name
        );
      }

      return {
        base64: result.images[0],
        mimeType: 'image/png',
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error?.cause?.code === 'ECONNRESET' || error?.cause?.code === 'ETIMEDOUT') {
        throw new ProviderError(
          'Modal-Edit endpoint timeout - container may be cold starting',
          'TIMEOUT',
          this.name
        );
      }

      throw new ProviderError(
        `Modal-Edit request failed: ${error.message}`,
        'REQUEST_ERROR',
        this.name,
        { error: error.message }
      );
    }
  }
}