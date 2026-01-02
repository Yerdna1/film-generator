// Unified Image API Route - Routes to appropriate provider based on user settings
// Supports: Gemini, Modal (Qwen-Image), Modal-Edit (Qwen-Image-Edit for character consistency)

import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, getImageCreditCost, checkBalance, trackRealCostOnly } from '@/lib/services/credits';
import { getImageCost, type ImageResolution } from '@/lib/services/real-costs';
import { uploadImageToS3, isS3Configured } from '@/lib/services/s3-upload';
import { rateLimit } from '@/lib/services/rate-limit';
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
  isRegeneration?: boolean; // Track if this is regenerating an existing image
  sceneId?: string; // Optional scene ID for tracking
  skipCreditCheck?: boolean; // Skip credit check (used when admin prepaid for collaborator regeneration)
  ownerId?: string; // Use owner's settings instead of session user (for collaborator regeneration)
}

// Generate image using Gemini
async function generateWithGemini(
  prompt: string,
  aspectRatio: string,
  resolution: ImageResolution,
  projectId: string | undefined,
  referenceImages: Array<{ name: string; imageUrl: string }>,
  apiKey: string,
  creditUserId: string | undefined, // For credit deduction (undefined to skip)
  realCostUserId: string | undefined, // For real cost tracking (track even if no credit deduction)
  isRegeneration: boolean = false,
  sceneId?: string
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
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (creditUserId) {
    // Normal case: deduct credits and track real cost
    await spendCredits(
      creditUserId,
      creditCost,
      'image',
      `Gemini image ${actionType} (${resolution.toUpperCase()})`,
      projectId,
      'gemini',
      { isRegeneration, sceneId },
      realCost
    );
  } else if (realCostUserId) {
    // Collaborator regeneration: only track real cost (credits already prepaid by admin)
    await trackRealCostOnly(
      realCostUserId,
      realCost,
      'image',
      `Gemini image ${actionType} (${resolution.toUpperCase()}) - prepaid`,
      projectId,
      'gemini',
      { isRegeneration, sceneId, prepaidRegeneration: true }
    );
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
  creditUserId: string | undefined,
  realCostUserId: string | undefined,
  isRegeneration: boolean = false,
  sceneId?: string
): Promise<{ imageUrl: string; cost: number; storage: string }> {
  console.log('[Modal] Generating image with endpoint:', modalEndpoint);

  // Generate random seed for variety in outputs
  const randomSeed = Math.floor(Math.random() * 2147483647);
  console.log('[Modal] Using seed:', randomSeed);

  const response = await fetch(modalEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
      seed: randomSeed,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Modal] Response not OK:', response.status, errorText);
    throw new Error(`Modal image generation failed: ${errorText}`);
  }

  console.log('[Modal] Response OK, parsing JSON...');
  let data;
  try {
    data = await response.json();
    console.log('[Modal] Response keys:', Object.keys(data));
  } catch (parseError) {
    console.error('[Modal] JSON parse error:', parseError);
    throw new Error(`Failed to parse Modal response: ${parseError}`);
  }

  // Modal endpoint should return { image: base64 } or { imageUrl: url }
  let imageUrl: string;
  if (data.image) {
    // Base64 image returned
    console.log('[Modal] Got image field, length:', data.image.length);
    imageUrl = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
  } else if (data.imageUrl) {
    imageUrl = data.imageUrl;
  } else {
    console.error('[Modal] No image field in response:', data);
    throw new Error('Modal endpoint did not return an image');
  }

  // Modal self-hosted - track GPU costs (~$0.09 per image on H100)
  const realCost = 0.09; // Modal GPU cost per image
  const creditCost = getImageCreditCost(resolution);
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (creditUserId) {
    // Normal case: deduct credits and track real cost
    console.log('[Modal] Spending credits:', creditCost);
    try {
      await spendCredits(
        creditUserId,
        creditCost,
        'image',
        `Modal image ${actionType} (${resolution.toUpperCase()})`,
        projectId,
        'modal',
        { isRegeneration, sceneId },
        realCost
      );
      console.log('[Modal] Credits spent successfully');
    } catch (creditError) {
      console.error('[Modal] Credit spending error:', creditError);
      throw creditError;
    }
  } else if (realCostUserId) {
    // Collaborator regeneration: only track real cost (credits already prepaid by admin)
    console.log('[Modal] Tracking real cost only (prepaid):', realCost);
    await trackRealCostOnly(
      realCostUserId,
      realCost,
      'image',
      `Modal image ${actionType} (${resolution.toUpperCase()}) - prepaid`,
      projectId,
      'modal',
      { isRegeneration, sceneId, prepaidRegeneration: true }
    );
  }

  // Upload to S3 if configured and we got base64
  if (isS3Configured() && imageUrl.startsWith('data:')) {
    console.log('[Modal] Uploading to S3...');
    try {
      const uploadResult = await uploadImageToS3(imageUrl, projectId);
      console.log('[Modal] S3 upload result:', uploadResult.success, uploadResult.url?.slice(0, 50));
      if (uploadResult.success && uploadResult.url) {
        imageUrl = uploadResult.url;
      }
    } catch (s3Error) {
      console.error('[Modal] S3 upload error:', s3Error);
      // Continue with base64 if S3 fails
    }
  }

  console.log('[Modal] Returning imageUrl length:', imageUrl.length);
  return { imageUrl, cost: realCost, storage: imageUrl.startsWith('data:') ? 'base64' : 's3' };
}

// Generate image using Modal-Edit (Qwen-Image-Edit-2511) with reference images for character consistency
async function generateWithModalEdit(
  prompt: string,
  aspectRatio: string,
  resolution: ImageResolution,
  projectId: string | undefined,
  modalEndpoint: string,
  referenceImages: Array<{ name: string; imageUrl: string }>,
  creditUserId: string | undefined, // For credit deduction (undefined to skip)
  realCostUserId: string | undefined, // For real cost tracking (track even if no credit deduction)
  isRegeneration: boolean = false,
  sceneId?: string
): Promise<{ imageUrl: string; cost: number; storage: string }> {
  console.log('[Modal-Edit] Generating image with endpoint:', modalEndpoint);
  console.log('[Modal-Edit] Reference images:', referenceImages.length);

  // Prepare reference images as base64 for the Modal endpoint
  const refImageUrls: string[] = [];
  for (const ref of referenceImages) {
    if (ref.imageUrl) {
      refImageUrls.push(ref.imageUrl);
    }
  }

  // Generate random seed for variety in outputs
  const randomSeed = Math.floor(Math.random() * 2147483647);
  console.log('[Modal-Edit] Using seed:', randomSeed);

  const response = await fetch(modalEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      reference_images: refImageUrls,
      seed: randomSeed,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Modal-Edit] Response not OK:', response.status, errorText);
    throw new Error(`Modal-Edit image generation failed: ${errorText}`);
  }

  console.log('[Modal-Edit] Response OK, parsing JSON...');
  let data;
  try {
    data = await response.json();
    console.log('[Modal-Edit] Response keys:', Object.keys(data));
  } catch (parseError) {
    console.error('[Modal-Edit] JSON parse error:', parseError);
    throw new Error(`Failed to parse Modal-Edit response: ${parseError}`);
  }

  // Modal endpoint should return { image: base64 } or { imageUrl: url }
  let imageUrl: string;
  if (data.image) {
    console.log('[Modal-Edit] Got image field, length:', data.image.length);
    imageUrl = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
  } else if (data.imageUrl) {
    imageUrl = data.imageUrl;
  } else {
    console.error('[Modal-Edit] No image field in response:', data);
    throw new Error('Modal-Edit endpoint did not return an image');
  }

  // Modal self-hosted - track GPU costs (~$0.09 per image on H100)
  const realCost = 0.09; // Modal GPU cost per image
  const creditCost = getImageCreditCost(resolution);
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (creditUserId) {
    // Normal case: deduct credits and track real cost
    console.log('[Modal-Edit] Spending credits:', creditCost);
    try {
      await spendCredits(
        creditUserId,
        creditCost,
        'image',
        `Modal-Edit image ${actionType} (${resolution.toUpperCase()})`,
        projectId,
        'modal-edit',
        { isRegeneration, sceneId },
        realCost
      );
      console.log('[Modal-Edit] Credits spent successfully');
    } catch (creditError) {
      console.error('[Modal-Edit] Credit spending error:', creditError);
      throw creditError;
    }
  } else if (realCostUserId) {
    // Collaborator regeneration: only track real cost (credits already prepaid by admin)
    console.log('[Modal-Edit] Tracking real cost only (prepaid):', realCost);
    await trackRealCostOnly(
      realCostUserId,
      realCost,
      'image',
      `Modal-Edit image ${actionType} (${resolution.toUpperCase()}) - prepaid`,
      projectId,
      'modal-edit',
      { isRegeneration, sceneId, prepaidRegeneration: true }
    );
  }

  // Upload to S3 if configured and we got base64
  if (isS3Configured() && imageUrl.startsWith('data:')) {
    console.log('[Modal-Edit] Uploading to S3...');
    try {
      const uploadResult = await uploadImageToS3(imageUrl, projectId);
      console.log('[Modal-Edit] S3 upload result:', uploadResult.success, uploadResult.url?.slice(0, 50));
      if (uploadResult.success && uploadResult.url) {
        imageUrl = uploadResult.url;
      }
    } catch (s3Error) {
      console.error('[Modal-Edit] S3 upload error:', s3Error);
      // Continue with base64 if S3 fails
    }
  }

  console.log('[Modal-Edit] Returning imageUrl length:', imageUrl.length);
  return { imageUrl, cost: realCost, storage: imageUrl.startsWith('data:') ? 'base64' : 's3' };
}

export async function POST(request: NextRequest) {
  // SECURITY: Rate limit generation to prevent abuse (20 requests/min)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const { prompt, aspectRatio = '1:1', resolution = '2k', projectId, referenceImages = [], isRegeneration = false, sceneId, skipCreditCheck = false, ownerId }: ImageGenerationRequest = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const session = await auth();
    let imageProvider: ImageProvider = 'gemini';
    let geminiApiKey = process.env.GEMINI_API_KEY;
    let modalImageEndpoint: string | null = null;
    let modalImageEditEndpoint: string | null = null;

    // When ownerId is provided (collaborator regeneration), use owner's settings
    // Otherwise use session user's settings
    const settingsUserId = ownerId || session?.user?.id;
    const costTrackingUserId = ownerId || session?.user?.id; // Track costs to owner for regenerations

    if (settingsUserId) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: settingsUserId },
      });

      if (userApiKeys) {
        // Get user's preferred provider
        imageProvider = (userApiKeys.imageProvider as ImageProvider) || 'gemini';

        // Get provider-specific settings
        if (userApiKeys.geminiApiKey) {
          geminiApiKey = userApiKeys.geminiApiKey;
        }
        modalImageEndpoint = userApiKeys.modalImageEndpoint;
        modalImageEditEndpoint = userApiKeys.modalImageEditEndpoint;
      }

      // Pre-check credit balance (skip if credits were prepaid by admin for collaborator regeneration)
      if (!skipCreditCheck && session?.user?.id) {
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
    }

    console.log(`[Image] Using provider: ${imageProvider}, reference images: ${referenceImages.length}, skipCreditCheck: ${skipCreditCheck}, ownerId: ${ownerId || 'none'}`);

    // For cost tracking:
    // - When skipCreditCheck is true (collaborator regeneration): credits already prepaid by admin,
    //   but we still want to track real API costs to the owner
    // - When skipCreditCheck is false (normal generation): track to session user
    const effectiveUserId = skipCreditCheck ? undefined : session?.user?.id; // For credit deduction
    const realCostUserId = ownerId || session?.user?.id; // For real cost tracking (always track to owner)

    // Route to appropriate provider
    if (imageProvider === 'modal-edit') {
      // Modal-Edit (Qwen-Image-Edit) REQUIRES reference images
      // Fall back to Gemini for character generation (no references)
      if (referenceImages.length === 0) {
        console.log('[Image] No reference images - falling back to Gemini for character generation');
        if (!geminiApiKey) {
          return NextResponse.json(
            { error: 'Gemini API key required for character generation. Modal-Edit only works with reference images.' },
            { status: 400 }
          );
        }
        const result = await generateWithGemini(prompt, aspectRatio, resolution, projectId, referenceImages, geminiApiKey, effectiveUserId, realCostUserId, isRegeneration, sceneId);
        return NextResponse.json(result);
      }

      if (!modalImageEditEndpoint) {
        return NextResponse.json(
          { error: 'Modal Image-Edit endpoint not configured. Please add your endpoint URL in Settings.' },
          { status: 400 }
        );
      }

      const result = await generateWithModalEdit(prompt, aspectRatio, resolution, projectId, modalImageEditEndpoint, referenceImages, effectiveUserId, realCostUserId, isRegeneration, sceneId);
      return NextResponse.json(result);
    }

    if (imageProvider === 'modal') {
      if (!modalImageEndpoint) {
        return NextResponse.json(
          { error: 'Modal image endpoint not configured. Please add your endpoint URL in Settings.' },
          { status: 400 }
        );
      }

      const result = await generateWithModal(prompt, aspectRatio, resolution, projectId, modalImageEndpoint, effectiveUserId, realCostUserId, isRegeneration, sceneId);
      return NextResponse.json(result);
    }

    // Default to Gemini
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add your API key in Settings.' },
        { status: 500 }
      );
    }

    const result = await generateWithGemini(prompt, aspectRatio, resolution, projectId, referenceImages, geminiApiKey, effectiveUserId, realCostUserId, isRegeneration, sceneId);
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
