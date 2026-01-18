import { BaseTTSProvider } from './base-tts-provider';
import { ProviderAuthError, ProviderValidationError, ProviderError, ProviderRateLimitError, TTSGenerationRequest } from '../types';
import { RegisterProvider } from '../provider-factory';

const GEMINI_TTS_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-tts:synthesizeAudio';

@RegisterProvider('tts', 'gemini-tts', {
  description: 'Google Gemini Text-to-Speech with natural voices',
  features: [
    'High-quality natural voices',
    'Multiple languages support',
    'Fast synthesis',
    'PCM16 output format',
    'Low cost'
  ],
  costPerUnit: 0.000016, // Per character
  isAsync: false,
})
export class GeminiTTSProvider extends BaseTTSProvider {
  name = 'gemini-tts';

  async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new ProviderValidationError('Gemini API key is required', this.name);
    }

    // Test API key validity with a minimal request
    try {
      const response = await fetch(`${GEMINI_TTS_URL}?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'test',
          audioConfig: {
            audioEncoding: 'LINEAR16',
            sampleRateHertz: 16000,
          },
        }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new ProviderAuthError('Invalid Gemini API key', this.name);
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
    // Gemini voices mapping
    const voiceMap: Record<string, { name: string; languageCode: string }> = {
      'en-US-Polyglot-1': { name: 'en-US-Polyglot-1', languageCode: 'en-US' },
      'sk': { name: 'sk-SK-Standard-A', languageCode: 'sk-SK' },
      'sk-SK-Standard-A': { name: 'sk-SK-Standard-A', languageCode: 'sk-SK' },
      'en': { name: 'en-US-Polyglot-1', languageCode: 'en-US' },
      'en-US': { name: 'en-US-Polyglot-1', languageCode: 'en-US' },
    };

    const selectedVoice = voice ? voiceMap[voice] || voiceMap['en-US-Polyglot-1'] : voiceMap['en-US-Polyglot-1'];
    const actualLanguageCode = selectedVoice.languageCode;

    try {
      const response = await fetch(`${GEMINI_TTS_URL}?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: {
            languageCode: actualLanguageCode,
            name: selectedVoice.name,
          },
          audioConfig: {
            audioEncoding: 'LINEAR16', // Gemini returns PCM16
            sampleRateHertz: 16000,
            speakingRate: voiceSettings?.speed || 1.0,
            pitch: voiceSettings?.pitch || 0,
            volumeGainDb: voiceSettings?.volume ? (voiceSettings.volume - 1) * 10 : 0,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        if (response.status === 429) {
          throw new ProviderRateLimitError(
            'Gemini TTS rate limit exceeded',
            this.name,
            60000
          );
        }
        throw new ProviderError(
          error.error?.message || 'TTS generation failed',
          'GENERATION_ERROR',
          this.name,
          { status: response.status, error }
        );
      }

      const result = await response.json();

      if (!result.audioContent) {
        throw new ProviderError(
          'No audio generated',
          'NO_RESULT',
          this.name
        );
      }

      // Decode base64 audio
      const audioBuffer = Buffer.from(result.audioContent, 'base64');

      // Gemini returns raw PCM16, we need to add WAV headers for compatibility
      const wavBuffer = this.addWavHeaders(audioBuffer, 16000, 1, 16);

      return {
        audio: wavBuffer,
        format: 'wav', // We convert PCM to WAV
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `Gemini TTS request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_ERROR',
        this.name
      );
    }
  }
}