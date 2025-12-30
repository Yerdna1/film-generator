// ElevenLabs API Service
// High-quality English text-to-speech

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
}

export interface ElevenLabsResponse {
  audioUrl?: string;
  voices?: ElevenLabsVoice[];
  error?: string;
}

export interface ElevenLabsConfig {
  apiKey: string;
}

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Popular voices for film characters
export const recommendedVoices = {
  male: [
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, warm male voice' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Young, energetic male' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp, authoritative male' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Friendly, conversational male' },
  ],
  female: [
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, gentle female voice' },
    { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Emily', description: 'Young, expressive female' },
    { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', description: 'Warm, mature female' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong, confident female' },
  ],
  child: [
    { id: 'jsCqWAovK2LkecY7zXl4', name: 'Charlie', description: 'Young boy voice' },
  ],
  monster: [
    { id: 'ODq5zmih8GrVes37Dizd', name: 'Patrick', description: 'Deep, growly voice' },
  ],
};

export async function getVoices(config: ElevenLabsConfig): Promise<ElevenLabsResponse> {
  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail?.message || 'Failed to fetch voices' };
    }

    const data = await response.json();
    return { voices: data.voices };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateSpeech(
  text: string,
  voiceId: string,
  config: ElevenLabsConfig,
  options?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  }
): Promise<ElevenLabsResponse> {
  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: options?.stability ?? 0.5,
            similarity_boost: options?.similarityBoost ?? 0.75,
            style: options?.style ?? 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail?.message || 'Failed to generate speech' };
    }

    // Convert audio blob to base64
    const audioBlob = await response.blob();
    const audioBuffer = await audioBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(audioBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    return { audioUrl: `data:audio/mpeg;base64,${base64}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateSpeechStream(
  text: string,
  voiceId: string,
  config: ElevenLabsConfig
): Promise<ReadableStream | { error: string }> {
  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail?.message || 'Failed to stream speech' };
    }

    return response.body!;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
