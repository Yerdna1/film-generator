// Unified Image API Route - Routes to appropriate provider based on user settings
// Supports: Gemini, Modal (self-hosted)

import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, getImageCreditCost, checkBalance } from '@/lib/services/credits';
import { getImageCost, type ImageResolution } from '@/lib/services/real-costs';
import { uploadImageToS3, isS3Configured } from '@/lib/services/s3-upload';
import type { ImageProvider } from '@/types/project';

export const maxDuration = 300; // Allow up to 5 minutes for image generation (Modal cold start can take ~2-3 min)

interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: string;
  resolution?: ImageResolution;
  projectId?: string;
  referenceImages?: Array<{
    name: string;
    imageUrl: string;
  }>;
}

// Generate image using Gemini
async function generateWithGemini(
  prompt: string,
  aspectRatio: string,
  resolution: ImageResolution,
  projectId: string | undefined,
  referenceImages: Array<{ name: string; imageUrl: string }>,
  apiKey: string,
  userId: string | undefined
): Promise<{ imageUrl: string; cost: number; storage: string }> {
  const google = createGoogleGenerativeAI({ apiKey });

  // Build message content with optional reference images
  const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> = [];

  if (referenceImages && referenceImages.length > 0) {
    messageContent.push({
      type: 'text',
      text: `REFERENCE IMAGES FOR VISUAL CONSISTENCY - Use these exact character appearances in the generated scene:\n${referenceImages.map(r => `- ${r.name}`).join('\n')}\n\n`,
    });

    for (const ref of referenceImages) {
      if (ref.imageUrl) {
        try {
          let base64Data: string;
          let mimeType: string;

          if (ref.imageUrl.startsWith('data:')) {
            const matches = ref.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              [, mimeType, base64Data] = matches;
            } else {
              continue;
            }
          } else if (ref.imageUrl.startsWith('http')) {
            const imageResponse = await fetch(ref.imageUrl);
            if (!imageResponse.ok) continue;
            const arrayBuffer = await imageResponse.arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString('base64');
            mimeType = imageResponse.headers.get('content-type') || 'image/png';
          } else {
            continue;
          }

          messageContent.push({ type: 'image', image: base64Data, mimeType });
          messageContent.push({ type: 'text', text: `(Above: ${ref.name} - use this EXACT character appearance)` });
        } catch (error) {
          console.error(`[Reference] Error processing image for ${ref.name}:`, error);
        }
      }
    }
  }

  messageContent.push({ type: 'text', text: prompt });

  const result = await generateText({
    model: google('gemini-3-pro-image-preview'),
    messages: [{ role: 'user', content: messageContent }],
    providerOptions: {
      google: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
      },
    },
  });

  const generatedImage = result.files?.[0];
  if (!generatedImage?.base64) {
    throw new Error('No image was generated');
  }

  const mimeType = (generatedImage as any).mimeType || (generatedImage as any).mediaType || 'image/png';
  const base64DataUrl = `data:${mimeType};base64,${generatedImage.base64}`;

  const realCost = getImageCost(resolution);
  const creditCost = getImageCreditCost(resolution);

  if (userId) {
    await spendCredits(userId, creditCost, 'image', `Gemini image generation (${resolution.toUpperCase()})`, projectId, 'gemini', undefined, realCost);
  }

  let imageUrl = base64DataUrl;
  if (isS3Configured()) {
    const uploadResult = await uploadImageToS3(base64DataUrl, projectId);
    if (uploadResult.success && uploadResult.url) {
      imageUrl = uploadResult.url;
    }
  }

  return { imageUrl, cost: realCost, storage: isS3Configured() && !imageUrl.startsWith('data:') ? 's3' : 'base64' };
}

// Generate image using Modal (self-hosted)
async function generateWithModal(
  prompt: string,
  aspectRatio: string,
  resolution: ImageResolution,
  projectId: string | undefined,
  modalEndpoint: string,
  userId: string | undefined
): Promise<{ imageUrl: string; cost: number; storage: string }> {
  console.log('[Modal] Generating image with endpoint:', modalEndpoint);

  const response = await fetch(modalEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Modal image generation failed: ${errorText}`);
  }

  const data = await response.json();

  // Modal endpoint should return { image: base64 } or { imageUrl: url }
  let imageUrl: string;
  if (data.image) {
    // Base64 image returned
    imageUrl = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
  } else if (data.imageUrl) {
    imageUrl = data.imageUrl;
  } else {
    throw new Error('Modal endpoint did not return an image');
  }

  // Modal is self-hosted, so we track minimal cost (just credits for tracking)
  const realCost = 0; // Self-hosted = no API cost
  const creditCost = getImageCreditCost(resolution);

  if (userId) {
    await spendCredits(userId, creditCost, 'image', `Modal image generation (${resolution.toUpperCase()})`, projectId, 'modal', undefined, realCost);
  }

  // Upload to S3 if configured and we got base64
  if (isS3Configured() && imageUrl.startsWith('data:')) {
    const uploadResult = await uploadImageToS3(imageUrl, projectId);
    if (uploadResult.success && uploadResult.url) {
      imageUrl = uploadResult.url;
    }
  }

  return { imageUrl, cost: realCost, storage: imageUrl.startsWith('data:') ? 'base64' : 's3' };
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio = '1:1', resolution = '2k', projectId, referenceImages = [] }: ImageGenerationRequest = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const session = await auth();
    let imageProvider: ImageProvider = 'gemini';
    let geminiApiKey = process.env.GEMINI_API_KEY;
    let modalImageEndpoint: string | null = null;

    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });

      if (userApiKeys) {
        // Get user's preferred provider
        imageProvider = (userApiKeys.imageProvider as ImageProvider) || 'gemini';

        // Get provider-specific settings
        if (userApiKeys.geminiApiKey) {
          geminiApiKey = userApiKeys.geminiApiKey;
        }
        modalImageEndpoint = userApiKeys.modalImageEndpoint;
      }

      // Pre-check credit balance
      const creditCost = getImageCreditCost(resolution);
      const balanceCheck = await checkBalance(session.user.id, creditCost);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json({
          error: 'Insufficient credits',
          required: balanceCheck.required,
          balance: balanceCheck.balance,
          needsPurchase: true,
        }, { status: 402 });
      }
    }

    console.log(`[Image] Using provider: ${imageProvider}`);

    // Route to appropriate provider
    if (imageProvider === 'modal') {
      if (!modalImageEndpoint) {
        return NextResponse.json(
          { error: 'Modal image endpoint not configured. Please add your endpoint URL in Settings.' },
          { status: 400 }
        );
      }

      const result = await generateWithModal(prompt, aspectRatio, resolution, projectId, modalImageEndpoint, session?.user?.id);
      return NextResponse.json(result);
    }

    // Default to Gemini
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add your API key in Settings.' },
        { status: 500 }
      );
    }

    const result = await generateWithGemini(prompt, aspectRatio, resolution, projectId, referenceImages, geminiApiKey, session?.user?.id);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Image generation error:', error);

    let errorMessage = 'Unknown error occurred during image generation';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('SAFETY')) {
        errorMessage = 'Image generation blocked by safety filters. Try modifying your prompt.';
      } else if (error.message.includes('rate') || error.message.includes('quota')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('timeout') || error.message.includes('DEADLINE')) {
        errorMessage = 'Request timed out. Try simplifying your prompt.';
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
