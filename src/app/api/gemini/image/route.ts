// Gemini Image API Route - Image Generation with Gemini 3 Pro Image Preview
// Uses the same approach as Nano Banana Pro skill
// Supports reference images for character consistency

import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, getImageCreditCost } from '@/lib/services/credits';
import { getImageCost, type ImageResolution } from '@/lib/services/real-costs';
import { uploadImageToS3, isS3Configured } from '@/lib/services/s3-upload';

export const maxDuration = 60; // Allow up to 60 seconds for image generation

interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: string;
  resolution?: ImageResolution; // '1k' | '2k' | '4k' - affects pricing
  projectId?: string;
  referenceImages?: Array<{
    name: string;
    imageUrl: string; // base64 data URL
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio = '1:1', resolution = '2k', projectId, referenceImages = [] }: ImageGenerationRequest = await request.json();

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
        text: `REFERENCE IMAGES FOR VISUAL CONSISTENCY - Use these exact character appearances in the generated scene:\n${referenceImages.map(r => `- ${r.name}`).join('\n')}\n\n`,
      });

      // Add each reference image
      for (const ref of referenceImages) {
        if (ref.imageUrl) {
          try {
            let base64Data: string;
            let mimeType: string;

            if (ref.imageUrl.startsWith('data:')) {
              // Already base64 data URL
              const matches = ref.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                [, mimeType, base64Data] = matches;
              } else {
                continue;
              }
            } else if (ref.imageUrl.startsWith('http')) {
              // Fetch from URL (S3 or other remote storage)
              console.log(`[Reference] Fetching image for ${ref.name} from URL...`);
              const imageResponse = await fetch(ref.imageUrl);
              if (!imageResponse.ok) {
                console.warn(`[Reference] Failed to fetch image for ${ref.name}`);
                continue;
              }
              const arrayBuffer = await imageResponse.arrayBuffer();
              base64Data = Buffer.from(arrayBuffer).toString('base64');
              mimeType = imageResponse.headers.get('content-type') || 'image/png';
              console.log(`[Reference] Successfully fetched image for ${ref.name}`);
            } else {
              continue;
            }

            messageContent.push({
              type: 'image',
              image: base64Data,
              mimeType: mimeType,
            });
            messageContent.push({
              type: 'text',
              text: `(Above: ${ref.name} - use this EXACT character appearance in the scene)`,
            });
          } catch (error) {
            console.error(`[Reference] Error processing image for ${ref.name}:`, error);
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
      const base64DataUrl = `data:${mimeType};base64,${generatedImage.base64}`;

      // Track cost if user is authenticated - use resolution-based pricing
      const realCost = getImageCost(resolution);
      const creditCost = getImageCreditCost(resolution);
      if (session?.user?.id) {
        await spendCredits(
          session.user.id,
          creditCost,  // Resolution-specific credits (1K/2K: 27, 4K: 48)
          'image',
          `Gemini image generation (${resolution.toUpperCase()})`,
          projectId,
          'gemini',
          undefined,  // metadata
          realCost    // pass the correct resolution-based cost
        );
      }

      // Upload to S3 if configured, otherwise return base64
      let imageUrl = base64DataUrl;
      if (isS3Configured()) {
        console.log('[S3] Uploading generated image to S3...');
        const uploadResult = await uploadImageToS3(base64DataUrl, projectId);
        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url;
          console.log('[S3] Image uploaded successfully:', uploadResult.url);
        } else {
          console.warn('[S3] Upload failed, falling back to base64:', uploadResult.error);
        }
      }

      return NextResponse.json({
        imageUrl,
        cost: realCost,
        storage: isS3Configured() && !imageUrl.startsWith('data:') ? 's3' : 'base64',
      });
    }

    return NextResponse.json(
      { error: 'No image was generated' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Image generation error:', error);

    // Extract meaningful error message from various error types
    let errorMessage = 'Unknown error occurred during image generation';

    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for common Gemini API errors
      if (error.message.includes('SAFETY')) {
        errorMessage = 'Image generation blocked by safety filters. Try modifying your prompt.';
      } else if (error.message.includes('rate') || error.message.includes('quota')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('timeout') || error.message.includes('DEADLINE')) {
        errorMessage = 'Request timed out. The image may be too complex - try simplifying your prompt.';
      }
    } else if (typeof error === 'object' && error !== null) {
      // Handle non-Error objects that might have useful info
      const errorObj = error as Record<string, unknown>;
      errorMessage = String(errorObj.message || errorObj.error || JSON.stringify(error));
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
