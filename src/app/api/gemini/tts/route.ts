// Gemini TTS API Route - Text-to-Speech for Slovak
// Server-side API calls for secure API key handling

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { calculateVoiceCost } from '@/lib/services/real-costs';
import { uploadAudioToS3, isS3Configured } from '@/lib/services/s3-upload';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

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

    // Get API key from user's database settings or fallback to env
    const session = await auth();
    let apiKey = process.env.GEMINI_API_KEY;

    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      if (userApiKeys?.geminiApiKey) {
        apiKey = userApiKeys.geminiApiKey;
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

    const response = await fetch(
      `${GEMINI_API_URL}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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
      const base64AudioUrl = `data:${audioData.mimeType};base64,${audioData.data}`;

      // Track cost if user is authenticated
      if (session?.user?.id) {
        await spendCredits(
          session.user.id,
          COSTS.VOICEOVER_LINE,
          'voiceover',
          `Gemini TTS (${text.length} chars)`,
          projectId,
          'gemini',
          { characterCount: text.length }
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
