import { BaseTTSProvider } from './base-tts-provider';
import { ProviderError, ProviderValidationError, TTSGenerationRequest } from '../types';
import { RegisterProvider } from '../provider-factory';

@RegisterProvider('tts', 'modal', {
  description: 'Modal.com self-hosted TTS with custom models',
  features: [
    'Self-hosted infrastructure',
    'Custom voice models',
    'No rate limits (depends on your Modal setup)',
    'Cost-effective for high volume',
    'Low latency with warm containers'
  ],
  costPerUnit: 0.00002, // Per character
  isAsync: false,
})
export class ModalTTSProvider extends BaseTTSProvider {
  name = 'modal';

  async validateConfig(): Promise<void> {
    if (!this.config.endpoint) {
      throw new ProviderValidationError(
        'Modal TTS endpoint URL is required',
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
          'Modal TTS endpoint not found. Make sure your Modal app is deployed.',
          this.name
        );
      }
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
        throw new ProviderValidationError(
          'Cannot connect to Modal TTS endpoint',
          this.name
        );
      }
    }
  }

  async generateSpeech(
    text: string,
    voice?: string,
    voiceSettings?: TTSGenerationRequest['voiceSettings'],
    format?: string,
    languageCode?: string
  ): Promise<{ audio: Buffer; format: string }> {
    const body: any = {
      text,
      voice: voice || 'default',
      language: languageCode || 'en-US',
      output_format: format || 'mp3',
    };

    // Add voice settings if provided
    if (voiceSettings) {
      body.voice_settings = {
        speaking_rate: voiceSettings.speed || 1.0,
        pitch: voiceSettings.pitch || 0,
        volume_gain_db: voiceSettings.volume ? (voiceSettings.volume - 1) * 10 : 0,
        stability: voiceSettings.stability || 0.5,
        similarity_boost: voiceSettings.similarityBoost || 0.75,
      };
    }

    try {
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 503) {
          throw new ProviderError(
            'Modal TTS endpoint is starting up. Please try again in a moment.',
            'SERVICE_UNAVAILABLE',
            this.name,
            { status: response.status }
          );
        }
        throw new ProviderError(
          `Modal TTS generation failed: ${errorText}`,
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
        const audioResponse = await fetch(result.audio_url);
        if (!audioResponse.ok) {
          throw new ProviderError(
            'Failed to download audio from Modal',
            'DOWNLOAD_ERROR',
            this.name
          );
        }
        audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      } else {
        throw new ProviderError(
          'No audio generated',
          'NO_RESULT',
          this.name
        );
      }

      return {
        audio: audioBuffer,
        format: result.format || format || 'mp3',
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error?.cause?.code === 'ECONNRESET' || error?.cause?.code === 'ETIMEDOUT') {
        throw new ProviderError(
          'Modal TTS endpoint timeout - container may be cold starting',
          'TIMEOUT',
          this.name
        );
      }

      throw new ProviderError(
        `Modal TTS request failed: ${error.message}`,
        'REQUEST_ERROR',
        this.name,
        { error: error.message }
      );
    }
  }
}