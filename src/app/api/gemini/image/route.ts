// Gemini Image API Route - Image Generation with Gemini 3 Pro Image Preview
// Uses the same approach as Nano Banana Pro skill
// Supports reference images for character consistency

import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export const maxDuration = 60; // Allow up to 60 seconds for image generation

interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: string;
  referenceImages?: Array<{
    name: string;
    imageUrl: string; // base64 data URL
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio = '1:1', referenceImages = [] }: ImageGenerationRequest = await request.json();

    // Get API key from user's database settings or fallback to env
    let apiKey = process.env.GEMINI_API_KEY;

    const session = await auth();
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
        { error: 'Gemini API key not configured. Please add your API key in Settings.' },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Use the same approach as Nano Banana Pro skill
    const google = createGoogleGenerativeAI({ apiKey });

    // Build message content with optional reference images for consistency
    const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> = [];

    // Add reference images first (if any) so the AI can use them for visual consistency
    if (referenceImages && referenceImages.length > 0) {
      // Add instruction about using reference images
      messageContent.push({
        type: 'text',
        text: `REFERENCE IMAGES FOR VISUAL CONSISTENCY - Use these exact character appearances:\n${referenceImages.map(r => `- ${r.name}`).join('\n')}\n\n`,
      });

      // Add each reference image
      for (const ref of referenceImages) {
        if (ref.imageUrl && ref.imageUrl.startsWith('data:')) {
          // Extract base64 data from data URL
          const matches = ref.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const [, mimeType, base64Data] = matches;
            messageContent.push({
              type: 'image',
              image: base64Data,
              mimeType: mimeType,
            });
            messageContent.push({
              type: 'text',
              text: `(Above: ${ref.name} - use this EXACT appearance)`,
            });
          }
        }
      }
    }

    // Add the main prompt
    messageContent.push({
      type: 'text',
      text: prompt,
    });

    const result = await generateText({
      model: google('gemini-3-pro-image-preview'),
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
      providerOptions: {
        google: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      },
    });

    const generatedImage = result.files?.[0];
    if (generatedImage?.base64) {
      // The mimeType might be stored as 'mediaType' in some versions
      const mimeType = (generatedImage as any).mimeType || (generatedImage as any).mediaType || 'image/png';
      return NextResponse.json({
        imageUrl: `data:${mimeType};base64,${generatedImage.base64}`,
        cost: 0.04, // ~$0.04 per image
      });
    }

    return NextResponse.json(
      { error: 'No image was generated' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
