import { BaseMusicProvider } from './base-music-provider';
import { ProviderError, ProviderValidationError, MusicGenerationRequest } from '../types';
import { RegisterProvider } from '../provider-factory';
import { downloadAudioAsBase64 } from '@/lib/api/generation';

@RegisterProvider('music', 'modal', {
  description: 'Modal.com self-hosted music generation',
  features: [
    'Self-hosted infrastructure',
    'Custom music models',
    'No rate limits (depends on your Modal setup)',
    'Cost-effective for high volume',
    'Low latency with warm containers',
    'ACE-Step music model support'
  ],
  costPerUnit: 0.1,
  isAsync: false,
})
export class ModalMusicProvider extends BaseMusicProvider {
  name = 'modal';

  async validateConfig(): Promise<void> {
    if (!this.config.endpoint) {
      throw new ProviderValidationError(
        'Modal music endpoint URL is required',
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
          'Modal music endpoint not found. Make sure your Modal app is deployed.',
          this.name
        );
      }
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
        throw new ProviderValidationError(
          'Cannot connect to Modal music endpoint',
          this.name
        );
      }
    }
  }

  async generateMusic(
    prompt: string,
    description?: string,
    duration: number = 30,
    style?: string,
    instruments?: string[]
  ): Promise<{ audio: Buffer; format: string; tags?: string[] }> {
    // Enhance prompt with style and instruments
    let enhancedPrompt = prompt || description || '';
    if (style) {
      enhancedPrompt = `${style} style: ${enhancedPrompt}`;
    }
    if (instruments && instruments.length > 0) {
      enhancedPrompt += ` featuring ${instruments.join(', ')}`;
    }

    const body: any = {
      prompt: enhancedPrompt,
      duration,
      temperature: 1.0,
      top_k: 250,
      top_p: 0.95,
      cfg_coef: 3.0,
    };

    try {
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300000), // 5 minute timeout for music
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 503) {
          throw new ProviderError(
            'Modal music endpoint is starting up. Please try again in a moment.',
            'SERVICE_UNAVAILABLE',
            this.name,
            { status: response.status }
          );
        }
        throw new ProviderError(
          `Modal music generation failed: ${errorText}`,
          'GENERATION_ERROR',
          this.name,
          { status: response.status, error: errorText }
        );
      }

      const result = await response.json();

      // Modal can return base64 audio or a URL
      let audioBuffer: Buffer;

      if (result.audio_base64) {
        audioBuffer = Buffer.from(result.audio_base64, 'base64');
      } else if (result.audio_url) {
        // Download from URL
        const base64 = await downloadAudioAsBase64(result.audio_url);
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
          'No music generated',
          'NO_RESULT',
          this.name
        );
      }

      return {
        audio: audioBuffer,
        format: result.format || 'mp3',
        tags: result.tags || [style].filter(Boolean),
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error?.cause?.code === 'ECONNRESET' || error?.cause?.code === 'ETIMEDOUT') {
        throw new ProviderError(
          'Modal music endpoint timeout - container may be cold starting or processing',
          'TIMEOUT',
          this.name
        );
      }

      throw new ProviderError(
        `Modal music request failed: ${error.message}`,
        'REQUEST_ERROR',
        this.name,
        { error: error.message }
      );
    }
  }
}