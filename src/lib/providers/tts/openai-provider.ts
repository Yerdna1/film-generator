import { BaseTTSProvider } from './base-tts-provider';
import { ProviderAuthError, ProviderValidationError, ProviderError, ProviderRateLimitError, TTSGenerationRequest } from '../types';
import { RegisterProvider } from '../provider-factory';
import { withLLMToast } from '@/lib/llm/wrapper';

const OPENAI_API_URL = 'https://api.openai.com/v1';

@RegisterProvider('tts', 'openai-tts', {
  description: 'OpenAI text-to-speech with natural voices',
  features: [
    'High-quality voices',
    'Multiple voice options',
    'Fast generation',
    'Multiple output formats',
    'Good language support'
  ],
  costPerUnit: 0.00003, // Per character
  isAsync: false,
})
export class OpenAITTSProvider extends BaseTTSProvider {
  name = 'openai-tts';

  async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new ProviderValidationError('OpenAI API key is required', this.name);
    }

    // Test API key validity
    try {
      const response = await fetch(`${OPENAI_API_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (response.status === 401) {
        throw new ProviderAuthError('Invalid OpenAI API key', this.name);
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
    format?: string,
    languageCode?: string
  ): Promise<{ audio: Buffer; format: string }> {
    // OpenAI voices
    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const selectedVoice = voice && voices.includes(voice) ? voice : 'alloy';

    // Model selection - tts-1 is faster and cheaper, tts-1-hd is higher quality
    const model = 'tts-1'; // Could be made configurable

    // Format selection
    const responseFormat = format || 'mp3';
    const supportedFormats = ['mp3', 'opus', 'aac', 'flac'];
    const actualFormat = supportedFormats.includes(responseFormat) ? responseFormat : 'mp3';

    try {
      const audioData = await withLLMToast(
        {
          provider: 'openai-tts',
          model,
          action: 'Speech Generation',
        },
        async () => {
          const response = await fetch(`${OPENAI_API_URL}/audio/speech`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              input: text,
              voice: selectedVoice,
              response_format: actualFormat,
              speed: voiceSettings?.speed || 1.0,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
            if (response.status === 429) {
              throw new ProviderRateLimitError(
                'OpenAI rate limit exceeded',
                this.name,
                60000
              );
            }
            if (response.status === 400) {
              throw new ProviderValidationError(
                error.error?.message || 'Invalid request parameters',
                this.name
              );
            }
            throw new ProviderError(
              error.error?.message || 'TTS generation failed',
              'GENERATION_ERROR',
              this.name,
              { status: response.status, error }
            );
          }

          // Get audio data
          return Buffer.from(await response.arrayBuffer());
        }
      );

      return {
        audio: audioData,
        format: actualFormat,
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `OpenAI TTS request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_ERROR',
        this.name
      );
    }
  }
}