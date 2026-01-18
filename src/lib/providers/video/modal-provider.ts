import { BaseVideoProvider } from './base-video-provider';
import { ProviderError, ProviderValidationError } from '../types';
import { RegisterProvider } from '../provider-factory';
import { downloadVideoAsBase64 } from '@/lib/api/generation';

@RegisterProvider('video', 'modal', {
  description: 'Modal.com self-hosted video generation',
  features: [
    'Fast video generation',
    'Self-hosted infrastructure',
    'Custom model support',
    'No rate limits (depends on your Modal setup)',
    'Cost-effective for high volume'
  ],
  costPerUnit: 0.25,
  isAsync: false,
})
export class ModalVideoProvider extends BaseVideoProvider {
  name = 'modal';

  async validateConfig(): Promise<void> {
    if (!this.config.endpoint) {
      throw new ProviderValidationError(
        'Modal video endpoint URL is required',
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
          'Modal video endpoint not found. Make sure your Modal app is deployed.',
          this.name
        );
      }
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
        throw new ProviderValidationError(
          'Cannot connect to Modal video endpoint',
          this.name
        );
      }
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

    // Convert image URL to base64 if needed
    let imageData = imageUrl;
    if (imageUrl.startsWith('http')) {
      try {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        imageData = `data:image/png;base64,${base64}`;
      } catch (error) {
        throw new ProviderError(
          'Failed to download input image',
          'DOWNLOAD_ERROR',
          this.name,
          { imageUrl }
        );
      }
    }

    const body: any = {
      image: imageData,
      prompt,
      motion_strength: mode === 'high' ? 1.0 : mode === 'low' ? 0.3 : 0.6,
      fps: 24,
      duration: 4, // 4 seconds
      guidance_scale: 7.5,
    };

    if (seed !== undefined) {
      body.seed = parseInt(seed.toString(), 10);
    }

    try {
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(600000), // 10 minute timeout for video
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 503) {
          throw new ProviderError(
            'Modal video endpoint is starting up. Please try again in a moment.',
            'SERVICE_UNAVAILABLE',
            this.name,
            { status: response.status }
          );
        }
        throw new ProviderError(
          `Modal video generation failed: ${errorText}`,
          'GENERATION_ERROR',
          this.name,
          { status: response.status, error: errorText }
        );
      }

      const result = await response.json();

      // Modal can return either base64 or a URL
      if (result.video_base64) {
        return {
          base64: result.video_base64,
          mimeType: 'video/mp4',
        };
      } else if (result.video_url) {
        // If Modal returns a URL, we might want to download it
        const base64 = await downloadVideoAsBase64(result.video_url);
        if (base64) {
          return {
            base64,
            mimeType: 'video/mp4',
          };
        }
        // Fallback to external URL
        return {
          externalUrl: result.video_url,
          mimeType: 'video/mp4',
        };
      } else {
        throw new ProviderError(
          'No video generated',
          'NO_RESULT',
          this.name,
          result
        );
      }
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error?.cause?.code === 'ECONNRESET' || error?.cause?.code === 'ETIMEDOUT') {
        throw new ProviderError(
          'Modal video endpoint timeout - container may be cold starting or processing',
          'TIMEOUT',
          this.name
        );
      }

      throw new ProviderError(
        `Modal video request failed: ${error.message}`,
        'REQUEST_ERROR',
        this.name,
        { error: error.message }
      );
    }
  }
}