// Gemini TTS API Route - Text-to-Speech for Slovak
// Server-side API calls for secure API key handling

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS, checkBalance } from '@/lib/services/credits';
import { calculateVoiceCost } from '@/lib/services/real-costs';
import { uploadAudioToS3, isS3Configured } from '@/lib/services/s3-upload';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Add WAV headers to raw PCM audio data
 * @param pcmData - Raw PCM audio buffer
 * @param sampleRate - Sample rate (e.g., 24000)
 * @param numChannels - Number of channels (1 for mono, 2 for stereo)
 * @param bitsPerSample - Bits per sample (typically 16)
 * @returns Buffer with WAV headers prepended
 */
function addWavHeaders(
  pcmData: Buffer,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize - 8;

  const header = Buffer.alloc(headerSize);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// Available voices for Gemini TTS
export const geminiVoices = [
  { id: 'Aoede', name: 'Aoede', description: 'Natural female voice' },
  { id: 'Charon', name: 'Charon', description: 'Deep male voice' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Young male voice' },
  { id: 'Kore', name: 'Kore', description: 'Soft female voice' },
  { id: 'Puck', name: 'Puck', description: 'Playful voice' },
];

export async function POST(request: NextRequest) {
  try {
    const { text, voiceName = 'Aoede', language = 'sk', projectId } = await request.json();

    // Get API key from user's database settings only
    const session = await auth();
    let apiKey: string | undefined;

    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      apiKey = userApiKeys?.geminiApiKey || undefined;

      // Pre-check credit balance before starting generation
      const balanceCheck = await checkBalance(session.user.id, COSTS.VOICEOVER_LINE);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json({
          error: 'Insufficient credits',
          required: balanceCheck.required,
          balance: balanceCheck.balance,
          needsPurchase: true,
        }, { status: 402 });
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Format text with language instruction for better Slovak pronunciation
    const formattedText =
      language === 'sk'
        ? `Hovor po slovensky s prirodzeným prízvukom: "${text}"`
        : text;

    // Use gemini-2.5-flash-preview-tts for TTS - this model supports audio output
    const response = await fetch(
      `${GEMINI_API_URL}/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: formattedText,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName,
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini TTS error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to generate speech' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (audioData) {
      // Calculate real cost based on character count
      const realCost = calculateVoiceCost(text.length, 'geminiTts');

      // Gemini returns raw PCM audio (audio/L16) - we need to convert to WAV
      let base64AudioUrl: string;
      const mimeType = audioData.mimeType?.toLowerCase() || '';

      if (mimeType.includes('l16') || mimeType.includes('pcm')) {
        // Extract sample rate from mime type (e.g., "audio/L16;rate=24000")
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

        // Convert raw PCM to WAV by adding headers
        const pcmBuffer = Buffer.from(audioData.data, 'base64');
        const wavBuffer = addWavHeaders(pcmBuffer, sampleRate, 1, 16);
        const wavBase64 = wavBuffer.toString('base64');
        base64AudioUrl = `data:audio/wav;base64,${wavBase64}`;
      } else {
        // Other audio formats - use as-is
        base64AudioUrl = `data:${audioData.mimeType};base64,${audioData.data}`;
      }

      // Track cost if user is authenticated
      if (session?.user?.id) {
        await spendCredits(
          session.user.id,
          COSTS.VOICEOVER_LINE,
          'voiceover',
          `Gemini TTS (${text.length} chars)`,
          projectId,
          'gemini-tts',
          { characterCount: text.length },
          realCost  // Pass the calculated real cost
        );
      }

      // Upload to S3 if configured, otherwise return base64
      let audioUrl = base64AudioUrl;
      if (isS3Configured()) {
        console.log('[S3] Uploading TTS audio to S3...');
        const uploadResult = await uploadAudioToS3(base64AudioUrl, projectId);
        if (uploadResult.success && uploadResult.url) {
          audioUrl = uploadResult.url;
          console.log('[S3] Audio uploaded successfully:', uploadResult.url);
        } else {
          console.warn('[S3] Upload failed, falling back to base64:', uploadResult.error);
        }
      }

      return NextResponse.json({
        audioUrl,
        cost: realCost,
        storage: isS3Configured() && !audioUrl.startsWith('data:') ? 's3' : 'base64',
      });
    }

    return NextResponse.json(
      { error: 'No audio generated' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Gemini TTS error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  return NextResponse.json({ voices: geminiVoices });
}
