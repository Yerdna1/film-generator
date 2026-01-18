import { BaseTTSProvider } from './base-tts-provider';
import { ProviderAuthError, ProviderValidationError, ProviderError, ProviderRateLimitError, TTSGenerationRequest } from '../types';
import { RegisterProvider } from '../provider-factory';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

@RegisterProvider('tts', 'elevenlabs', {
  description: 'ElevenLabs premium text-to-speech with AI voices',
  features: [
    'Ultra-realistic AI voices',
    'Voice cloning capability',
    'Emotion control',
    'Multiple languages',
    'High-quality audio output',
    'Streaming support'
  ],
  limitations: [
    'Higher cost than other providers',
    'Character limits per request'
  ],
  costPerUnit: 0.00018, // Per character
  isAsync: false,
})
export class ElevenLabsTTSProvider extends BaseTTSProvider {
  name = 'elevenlabs';

  async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new ProviderValidationError('ElevenLabs API key is required', this.name);
    }

    // Test API key validity
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (response.status === 401) {
        throw new ProviderAuthError('Invalid ElevenLabs API key', this.name);
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
    // Default voice IDs
    const voiceMap: Record<string, string> = {
      'adam': '5RcrFqLWD6NTXElFBPUN',
      'antoni': 'LYJJa8vQH3Q8xdMVMQY5',
      'arnold': 'VdpqaBPYTYZ7LnFHF0gF',
      'callum': 'N2lVS1w8EtoT4dr8fANm',
      'charlie': 'IKne3meq0aSn3XLyUiPi',
      'charlotte': 'XB0fR8J4v7WuhDX95jJa',
      'clyde': '1mGOzNBYTnsPUAaJZi3c',
      'daniel': 'VdDKzLsqpJbRAK63k1o3',
      'dave': 'CwhBQp6bCt5qPqTKUDRU',
      'domi': '7M1djA4qNx9ErqHMOXLz',
      'dorothy': 'XxJD5eEu1kYdXSsBU01S',
      'elli': 'EgYcAWvZOk5Ib1I8uKtz',
      'emily': 'LcAsdWXvsM7Y39EAdHqP',
      'ethan': 'r0C7quMRT51sJgFQhNUG',
      'fin': 'D38B5RcWu3voky8StFKG',
      'freya': 'uOqsg4Gyk5xZktfSmPHX',
      'gigi': 'q8vSCdpIv0JLMM2OqITZ',
      'giovanni': 'AohdJnMSXDcKoIrBpj8u',
      'glinda': 'QjPnmqGDvjEAsA7hUdE2',
      'grace': 'oUMJJONqMKUxrNF8OlQU',
      'harry': '2fGMTcJnxyTFwg4Y3tAQ',
      'james': 'HjOSCFk1vkAHYBOJIGUV',
      'jeremy': 'UzvHMm1nOBh27LBhWNap',
      'jessie': 't0C3S7U5kcWwmRI5hbsW',
      'joseph': 'NXq5iK0nIKJLa61b2uyO',
      'josh': 'TxGEqvSekZXr7fWIdXIl',
      'liam': 'TX6Blre4lTaPiRaHI4sr',
      'matilda': '9BWoTLCKVnZkqTQJEbQy',
      'matthew': 'Yko6MCMPlKDLdEmmNP4F',
      'michael': 'Y7PKATezOzoFKsq6Nmm8',
      'mimi': 'MJ77vYleFBGLxq7uSbHs',
      'nicole': 'OLKYjcuWO3T1aD1lvVT5',
      'patrick': 'hJFbgk07RkbJk5RCYjps',
      'rachel': '21R7nMgj3iJQC2TmlXPq',
      'ryan': 'f3kQfHXyYRhhZWKJO45x',
      'sam': 'AchMLF6ShUrIlPQykqzl',
      'serena': 'wG6JWCJUzoKOJLPCBCeR',
      'thomas': 'aQVqh09CQ39VBJLmFvYP',
    };

    const selectedVoice = voice && voiceMap[voice.toLowerCase()] ? voiceMap[voice.toLowerCase()] : voiceMap['adam'];

    // Model selection based on language
    const model = languageCode?.startsWith('en') ? 'eleven_turbo_v2' : 'eleven_multilingual_v2';

    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${selectedVoice}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability: voiceSettings?.stability || 0.5,
            similarity_boost: voiceSettings?.similarityBoost || 0.75,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: { message: response.statusText } }));
        if (response.status === 429) {
          throw new ProviderRateLimitError(
            'ElevenLabs rate limit exceeded',
            this.name,
            60000
          );
        }
        if (response.status === 422) {
          throw new ProviderValidationError(
            error.detail?.message || 'Invalid request parameters',
            this.name
          );
        }
        throw new ProviderError(
          error.detail?.message || 'TTS generation failed',
          'GENERATION_ERROR',
          this.name,
          { status: response.status, error }
        );
      }

      // Get audio data
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      return {
        audio: audioBuffer,
        format: 'mp3',
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `ElevenLabs TTS request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_ERROR',
        this.name
      );
    }
  }
}