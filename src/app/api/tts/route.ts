// Unified TTS API Route using centralized API wrapper
// All provider configurations come from Settings (single source of truth)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { optionalAuth, requireCredits, uploadMediaToS3 } from '@/lib/api';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { calculateVoiceCost } from '@/lib/services/real-costs';
import { rateLimit } from '@/lib/services/rate-limit';
import { callExternalApi, pollKieTask } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import type { TTSProvider } from '@/types/project';

export const maxDuration = 60;

interface TTSRequest {
  text: string;
  voiceId?: string;
  voiceName?: string;
  language?: string;
  projectId?: string;
  skipCreditCheck?: boolean;
  model?: string;
  // Voice customization settings
  voiceInstructions?: string;      // OpenAI: speaking style instructions
  voiceStability?: number;         // ElevenLabs: 0-1
  voiceSimilarityBoost?: number;   // ElevenLabs: 0-1
  voiceStyle?: number;             // ElevenLabs: 0-1
}

// Add WAV headers to raw PCM audio data
function addWavHeaders(pcmData: Buffer, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize - 8;

  const header = Buffer.alloc(headerSize);
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// Generate audio using centralized API wrapper
async function generateWithWrapper(
  userId: string | undefined,
  projectId: string | undefined,
  provider: string,
  text: string,
  voiceId: string | undefined,
  voiceName: string | undefined,
  language: string,
  skipCreditCheck: boolean,
  endpoint?: string,
  voiceSettings?: {
    instructions?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
  }
): Promise<{ audioUrl: string; cost: number; storage: string }> {
  console.log(`[${provider}] Generating TTS with wrapper`);

  // Build request body based on provider
  let requestBody: any;

  switch (provider) {
    case 'gemini-tts':
    case 'gemini':
      const formattedText = language === 'sk'
        ? `Hovor po slovensky s prirodzeným prízvukom: "${text}"`
        : text;

      requestBody = {
        contents: [{ parts: [{ text: formattedText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Coral' } },
          },
        },
      };
      break;

    case 'elevenlabs':
      requestBody = {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: voiceSettings?.stability || 0.75,
          similarity_boost: voiceSettings?.similarityBoost || 0.75,
          style: voiceSettings?.style || 0.5,
          use_speaker_boost: true,
        },
      };
      break;

    case 'openai':
    case 'openai-tts':
      // Combine language instructions with user-provided voice instructions
      const languageInstruction = language === 'sk'
        ? 'Speak in Slovak with natural pronunciation and intonation.'
        : '';

      const instructions = [languageInstruction, voiceSettings?.instructions].filter(Boolean).join(' ') || undefined;

      requestBody = {
        model: 'gpt-4o-mini-tts',
        input: text,
        voice: voiceId || 'alloy',
        response_format: 'mp3',
        ...(instructions && { instructions }),
      };
      break;

    case 'modal':
      requestBody = {
        text,
        voice_id: voiceId,
        language,
      };
      break;

    case 'kie':
      // Get model from config
      const config = await getProviderConfig({
        userId: userId || 'system',
        projectId,
        type: 'tts'
      });

      // Map UI model names to KIE API model names
      const KIE_TTS_MODEL_MAPPING: Record<string, string> = {
        'elevenlabs-turbo-2-5': 'elevenlabs/text-to-speech-turbo-2-5',
        'elevenlabs-turbo': 'elevenlabs/text-to-speech-turbo-2-5',
        'elevenlabs-v2': 'elevenlabs/text-to-speech-multilingual-v2',
        'elevenlabs-multilingual-v2': 'elevenlabs/text-to-speech-multilingual-v2',
        'elevenlabs-dialogue-v3': 'elevenlabs/text-to-dialogue-v3',
      };

      const rawModel = config.model || 'elevenlabs/text-to-speech-turbo-2-5';
      const kieModel = KIE_TTS_MODEL_MAPPING[rawModel] || rawModel;

      console.log('[TTS] KIE model configuration:', {
        configModel: config.model,
        rawModel,
        kieModel,
        voiceId,
        language,
      });

      requestBody = {
        model: kieModel,
        input: {
          text,
          voice_id: voiceId,
          ...(language && { language_code: language }),
        },
      };
      console.log('[TTS] KIE request body:', JSON.stringify(requestBody, null, 2));
      break;

    default:
      throw new Error(`Unsupported TTS provider: ${provider}`);
  }

  // Make the API call using wrapper
  const response = await callExternalApi({
    userId: userId || 'system',
    projectId,
    type: 'tts',
    body: requestBody,
    endpoint,
    showLoadingMessage: true,
    loadingMessage: `Generating speech using ${provider}...`,
  });

  console.log(`[TTS] ${provider} response:`, {
    status: response.status,
    hasData: !!response.data,
    dataType: typeof response.data,
    error: response.error,
    dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : null,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  let audioUrl: string | undefined;
  let realCost: number;

  // Handle response based on provider
  switch (provider) {
    case 'gemini-tts':
    case 'gemini':
      const audioData = response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!audioData) {
        throw new Error('No audio generated by Gemini');
      }

      let base64AudioUrl: string;
      const mimeType = audioData.mimeType?.toLowerCase() || '';

      if (mimeType.includes('l16') || mimeType.includes('pcm')) {
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
        const pcmBuffer = Buffer.from(audioData.data, 'base64');
        const wavBuffer = addWavHeaders(pcmBuffer, sampleRate, 1, 16);
        base64AudioUrl = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
      } else {
        base64AudioUrl = `data:${audioData.mimeType};base64,${audioData.data}`;
      }

      audioUrl = base64AudioUrl;
      realCost = calculateVoiceCost(text.length, 'geminiTts');
      break;

    case 'elevenlabs':
      // ElevenLabs returns binary audio data
      if (response.data instanceof ArrayBuffer || response.data instanceof Buffer) {
        const base64 = Buffer.from(response.data as any).toString('base64');
        audioUrl = `data:audio/mpeg;base64,${base64}`;
      } else {
        throw new Error('ElevenLabs did not return audio data');
      }
      realCost = calculateVoiceCost(text.length, 'elevenlabs');
      break;

    case 'openai':
    case 'openai-tts':
      // OpenAI returns binary audio data
      if (response.data instanceof ArrayBuffer || response.data instanceof Buffer) {
        const base64 = Buffer.from(response.data as any).toString('base64');
        audioUrl = `data:audio/mpeg;base64,${base64}`;
      } else {
        throw new Error('OpenAI did not return audio data');
      }
      realCost = calculateVoiceCost(text.length, 'openaiTts');
      break;

    case 'modal':
      if (response.data.audio) {
        audioUrl = response.data.audio.startsWith('data:')
          ? response.data.audio
          : `data:audio/mpeg;base64,${response.data.audio}`;
      } else if (response.data.audioUrl) {
        audioUrl = response.data.audioUrl;
      }
      if (!audioUrl) {
        throw new Error('Modal did not return audio');
      }
      realCost = 0.01; // Modal self-hosted cost estimate
      break;

    case 'kie':
      // Get task ID and poll for completion
      const responseData = response.data;
      const taskId = responseData?.data?.taskId;

      if (!taskId) {
        console.error('[TTS] KIE response structure issue:', {
          hasResponseData: !!responseData,
          responseDataType: typeof responseData,
          responseDataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
          hasNestedData: !!responseData?.data,
          nestedDataType: typeof responseData?.data,
          nestedDataKeys: responseData?.data && typeof responseData.data === 'object' ? Object.keys(responseData.data) : null,
          fullResponse: JSON.stringify(responseData, null, 2),
        });
        throw new Error('KIE AI did not return a task ID');
      }

      console.log(`[KIE] Task created: ${taskId}, polling for completion...`);

      // Get API key from config for polling
      const kieConfig = await getProviderConfig({
        userId: userId || 'system',
        projectId,
        type: 'tts'
      });

      const taskData = await pollKieTask(taskId, kieConfig.apiKey!);

      // Extract audio URL from result
      if (taskData.resultJson) {
        try {
          const result = typeof taskData.resultJson === 'string'
            ? JSON.parse(taskData.resultJson)
            : taskData.resultJson;

          console.log('[TTS] KIE result structure:', {
            hasAudio: !!result.audio,
            hasAudioData: !!result.audioData,
            hasAudioBase64: !!result.audio_base64,
            hasAudioUrl: !!result.audioUrl,
            hasAudioUrlUnderscore: !!result.audio_url,
            hasResultUrls: !!result.resultUrls,
            resultUrlsArray: Array.isArray(result.resultUrls) ? result.resultUrls.length : 'not array',
            firstResultUrl: Array.isArray(result.resultUrls) ? result.resultUrls[0] : null,
          });

          // Check for resultUrls array (KIE TTS uses this)
          if (result.resultUrls && Array.isArray(result.resultUrls) && result.resultUrls.length > 0) {
            audioUrl = result.resultUrls[0];
          }
          // Check for base64 audio data
          else if (result.audio || result.audioData || result.audio_base64) {
            const audioBase64 = result.audio || result.audioData || result.audio_base64;
            audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
          }
          // Check for direct audio URL
          else if (result.audioUrl || result.audio_url) {
            audioUrl = result.audioUrl || result.audio_url;
          }

          console.log('[TTS] Extracted audio URL:', audioUrl ? audioUrl.substring(0, 100) + '...' : 'none');
        } catch (e) {
          console.error('[TTS] Failed to parse KIE resultJson:', e);
        }
      }

      if (!audioUrl) {
        console.error('[TTS] No audio URL found in KIE result:', {
          hasResultJson: !!taskData.resultJson,
          resultJsonType: typeof taskData.resultJson,
          resultJsonPreview: typeof taskData.resultJson === 'string' ? taskData.resultJson.substring(0, 200) : JSON.stringify(taskData.resultJson).substring(0, 200),
        });
        throw new Error('KIE AI completed but did not return audio');
      }

      realCost = calculateVoiceCost(text.length, 'kie');
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  // Upload to S3
  audioUrl = await uploadMediaToS3(audioUrl, 'audio', projectId);

  // Track costs if not skipping credit check
  if (userId && !skipCreditCheck) {
    await spendCredits(
      userId,
      COSTS.VOICEOVER_LINE,
      'voiceover',
      `${provider} TTS (${text.length} chars)`,
      projectId,
      provider as any,
      { characterCount: text.length },
      realCost
    );
  }

  return {
    audioUrl,
    cost: realCost,
    storage: !audioUrl.startsWith('data:') ? 's3' : 'base64'
  };
}

export async function POST(request: NextRequest) {
  // SECURITY: Rate limit to prevent abuse (30 requests/min for TTS)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const {
      text,
      voiceId,
      voiceName,
      language = 'en',
      projectId,
      skipCreditCheck = false,
      model: requestModel,
      voiceInstructions,
      voiceStability,
      voiceSimilarityBoost,
      voiceStyle,
    }: TTSRequest = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const authCtx = await optionalAuth();
    const userId = authCtx?.userId;

    // Get provider configuration - single source of truth
    const config = await getProviderConfig({
      userId: userId || 'system',
      projectId,
      type: 'tts',
    });

    const ttsProvider = config.provider;
    const userHasOwnApiKey = config.userHasOwnApiKey;

    // Check credits if needed
    if (userId && !skipCreditCheck && !userHasOwnApiKey) {
      const insufficientCredits = await requireCredits(userId, COSTS.VOICEOVER_LINE);
      if (insufficientCredits) return insufficientCredits;
    }

    console.log(`[TTS] Using provider: ${ttsProvider}, model: ${config.model}, has API key: ${!!config.apiKey}`);

    // Handle provider-specific voice ID requirements
    let effectiveVoiceId = voiceId;

    // For OpenAI TTS, ensure we have a valid voice ID
    if (ttsProvider === 'openai-tts' && !effectiveVoiceId) {
      effectiveVoiceId = 'alloy'; // Default OpenAI voice
    }

    // For ElevenLabs, we need a voice ID
    if (ttsProvider === 'elevenlabs' && !effectiveVoiceId) {
      return NextResponse.json(
        { error: 'Voice ID is required for ElevenLabs' },
        { status: 400 }
      );
    }

    const result = await generateWithWrapper(
      userId,
      projectId,
      ttsProvider,
      text,
      effectiveVoiceId,
      voiceName,
      language,
      skipCreditCheck === true || !!userHasOwnApiKey,
      config.endpoint, // For modal endpoints
      {
        instructions: voiceInstructions,
        stability: voiceStability,
        similarityBoost: voiceSimilarityBoost,
        style: voiceStyle,
      }
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('TTS generation error:', error);

    let errorMessage = 'Unknown error occurred during speech generation';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('rate') || error.message.includes('quota')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Try with shorter text.';
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}