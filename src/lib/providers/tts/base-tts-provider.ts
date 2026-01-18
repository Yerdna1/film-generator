import {
  Provider,
  ProviderConfig,
  TTSGenerationRequest,
  TTSGenerationResponse,
  ProviderError,
  ProviderValidationError
} from '../types';
import { uploadMediaToS3 } from '@/lib/api';
import { calculateVoiceCost } from '@/lib/services/real-costs';

export abstract class BaseTTSProvider implements Provider<TTSGenerationRequest, TTSGenerationResponse> {
  abstract name: string;
  type: 'tts' = 'tts' as const;

  constructor(protected config: ProviderConfig) {}

  abstract validateConfig(): Promise<void>;

  abstract generateSpeech(
    text: string,
    voice?: string,
    voiceSettings?: TTSGenerationRequest['voiceSettings'],
    format?: string,
    languageCode?: string
  ): Promise<{ audio: Buffer | string; format: string }>;

  async generate(request: TTSGenerationRequest): Promise<TTSGenerationResponse> {
    const {
      text,
      prompt, // Fallback for text
      voice,
      voiceSettings,
      format = 'mp3',
      languageCode = 'en-US',
      projectId,
    } = request;

    const textToSpeak = text || prompt || '';

    if (!textToSpeak) {
      throw new ProviderValidationError('Text is required', this.name);
    }

    try {
      // Generate the speech
      const { audio, format: actualFormat } = await this.generateSpeech(
        textToSpeak,
        voice,
        voiceSettings,
        format,
        languageCode
      );

      // Convert to base64 if it's a Buffer
      let base64Audio: string;
      if (Buffer.isBuffer(audio)) {
        base64Audio = audio.toString('base64');
      } else {
        base64Audio = audio;
      }

      // Create data URL
      const mimeType = this.getAudioMimeType(actualFormat);
      const base64DataUrl = `data:${mimeType};base64,${base64Audio}`;

      // Upload to S3 if projectId is provided
      let audioUrl = base64DataUrl;
      let storageType: 'base64' | 's3' = 'base64';

      if (projectId) {
        audioUrl = await uploadMediaToS3(base64DataUrl, 'audio', projectId);
        if (!audioUrl.startsWith('data:')) {
          storageType = 's3';
        }
      }

      // Calculate costs based on character count
      const charCount = textToSpeak.length;
      const realCost = this.calculateProviderCost(charCount);

      return {
        status: 'complete',
        audioUrl,
        base64: base64Audio,
        url: audioUrl,
        format: actualFormat,
        duration: this.estimateDuration(charCount),
        realCost,
        metadata: {
          storage: storageType,
          format: actualFormat,
          voice,
          languageCode,
          characterCount: charCount,
          provider: this.name,
        }
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_ERROR',
        this.name,
        { text: textToSpeak.substring(0, 100), voice, format }
      );
    }
  }

  estimateCost(request: TTSGenerationRequest): number {
    const text = request.text || request.prompt || '';
    return this.calculateProviderCost(text.length);
  }

  /**
   * Calculate cost based on provider
   */
  protected calculateProviderCost(charCount: number): number {
    // Map provider names to cost function providers
    const providerMap: Record<string, 'elevenlabs' | 'geminiTts' | 'openaiTts' | 'kie'> = {
      'gemini-tts': 'geminiTts',
      'elevenlabs': 'elevenlabs',
      'openai-tts': 'openaiTts',
      'kie': 'kie',
      'modal': 'kie', // Use KIE pricing for Modal
    };

    const costProvider = providerMap[this.name] || 'geminiTts';
    return calculateVoiceCost(charCount, costProvider);
  }

  /**
   * Helper to get MIME type from format
   */
  protected getAudioMimeType(format: string): string {
    switch (format.toLowerCase()) {
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'opus':
        return 'audio/opus';
      case 'ogg':
        return 'audio/ogg';
      case 'aac':
        return 'audio/aac';
      case 'm4a':
        return 'audio/mp4';
      default:
        return 'audio/mpeg';
    }
  }

  /**
   * Estimate audio duration based on character count
   * Rough estimate: 150 words per minute, 5 characters per word
   */
  protected estimateDuration(charCount: number): number {
    const wordsPerMinute = 150;
    const charsPerWord = 5;
    const words = charCount / charsPerWord;
    const minutes = words / wordsPerMinute;
    return Math.ceil(minutes * 60); // Return seconds
  }

  /**
   * Helper to add WAV headers to PCM data
   */
  protected addWavHeaders(pcmData: Buffer, sampleRate: number = 16000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize; // 36 = header size - 8

    const header = Buffer.allocUnsafe(44);

    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);

    // Format chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Format chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // Data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
  }
}