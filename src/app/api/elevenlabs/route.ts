// ElevenLabs API Route - Text-to-Speech for English
// Server-side API calls for secure API key handling

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { ACTION_COSTS, calculateVoiceCost } from '@/lib/services/real-costs';
import { uploadAudioToS3, isS3Configured } from '@/lib/services/s3-upload';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Popular voices for film characters
export const elevenLabsVoices = {
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

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, projectId, stability = 0.5, similarityBoost = 0.75, style = 0.5 } = await request.json();

    // Get API key from user's database settings or fallback to env
    const session = await auth();
    let apiKey = process.env.ELEVENLABS_API_KEY;

    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      if (userApiKeys?.elevenLabsApiKey) {
        apiKey = userApiKeys.elevenLabsApiKey;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Text and voice ID are required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: stability,
            similarity_boost: similarityBoost,
            style: style,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('ElevenLabs API error:', error);
      return NextResponse.json(
        { error: error.detail?.message || 'Failed to generate speech' },
        { status: response.status }
      );
    }

    // Convert audio blob to base64
    const audioBlob = await response.blob();
    const audioBuffer = await audioBlob.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const base64AudioUrl = `data:audio/mpeg;base64,${base64}`;

    // Calculate real cost based on character count
    const realCost = calculateVoiceCost(text.length, 'elevenlabs');

    // Track cost if user is authenticated
    if (session?.user?.id) {
      await spendCredits(
        session.user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        `ElevenLabs TTS (${text.length} chars)`,
        projectId,
        'elevenlabs',
        { characterCount: text.length }
      );
    }

    // Upload to S3 if configured, otherwise return base64
    let audioUrl = base64AudioUrl;
    if (isS3Configured()) {
      console.log('[S3] Uploading ElevenLabs audio to S3...');
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
  } catch (error) {
    console.error('ElevenLabs route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      // Return default voices if no API key
      return NextResponse.json({ voices: elevenLabsVoices });
    }

    // Try to fetch voices from ElevenLabs
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      // Return default voices on error
      return NextResponse.json({ voices: elevenLabsVoices });
    }

    const data = await response.json();

    // Format voices into categories
    const formattedVoices = {
      all: data.voices || [],
      recommended: elevenLabsVoices,
    };

    return NextResponse.json({ voices: formattedVoices });
  } catch (error) {
    console.error('ElevenLabs voices error:', error);
    return NextResponse.json({ voices: elevenLabsVoices });
  }
}
