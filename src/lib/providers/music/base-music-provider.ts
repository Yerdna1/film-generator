import {
  Provider,
  ProviderConfig,
  MusicGenerationRequest,
  MusicGenerationResponse,
  ProviderError,
  ProviderValidationError
} from '../types';
import { uploadMediaToS3 } from '@/lib/api';
import { getActionCost } from '@/lib/services/real-costs';

export abstract class BaseMusicProvider implements Provider<MusicGenerationRequest, MusicGenerationResponse> {
  abstract name: string;
  type: 'music' = 'music' as const;

  constructor(protected config: ProviderConfig) {}

  abstract validateConfig(): Promise<void>;

  abstract generateMusic(
    prompt: string,
    description?: string,
    duration?: number,
    style?: string,
    instruments?: string[]
  ): Promise<{ audio: Buffer | string; format: string; tags?: string[]; externalUrl?: string }>;

  async generate(request: MusicGenerationRequest): Promise<MusicGenerationResponse> {
    const {
      prompt = '',
      description,
      duration = 30,
      style,
      instruments,
      projectId,
    } = request;

    const musicPrompt = prompt || description || '';

    if (!musicPrompt) {
      throw new ProviderValidationError('Prompt or description is required', this.name);
    }

    try {
      // Generate the music
      const { audio, format, tags, externalUrl } = await this.generateMusic(
        musicPrompt,
        description,
        duration,
        style,
        instruments
      );

      // Convert to base64 if it's a Buffer
      let base64Audio: string | undefined;
      if (Buffer.isBuffer(audio)) {
        base64Audio = audio.toString('base64');
      } else if (typeof audio === 'string') {
        base64Audio = audio;
      }

      let musicUrl = externalUrl;
      let storageType: 'base64' | 's3' | 'external' = 'external';

      // If we have base64 audio
      if (base64Audio) {
        // Create data URL
        const mimeType = this.getAudioMimeType(format);
        const base64DataUrl = `data:${mimeType};base64,${base64Audio}`;

        // Upload to S3 if projectId is provided
        if (projectId) {
          musicUrl = await uploadMediaToS3(base64DataUrl, 'audio', projectId);
          if (!musicUrl.startsWith('data:')) {
            storageType = 's3';
          } else {
            storageType = 'base64';
          }
        } else {
          musicUrl = base64DataUrl;
          storageType = 'base64';
        }
      }

      // Calculate costs
      const realCost = getActionCost('music', this.config.provider as any);

      return {
        status: 'complete',
        musicUrl,
        externalUrl,
        base64: base64Audio,
        url: musicUrl,
        duration,
        tags,
        realCost,
        metadata: {
          storage: storageType,
          format,
          duration,
          style,
          instruments,
          tags,
          provider: this.name,
        }
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `Music generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_ERROR',
        this.name,
        { prompt: musicPrompt, duration, style }
      );
    }
  }

  estimateCost(): number {
    return getActionCost('music', this.config.provider as any);
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
}