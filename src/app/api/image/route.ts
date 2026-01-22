// Unified Image API Route using centralized API wrapper
// All provider configurations come from Settings (single source of truth)

import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { prisma } from '@/lib/db/prisma';
import { optionalAuth, requireCredits, uploadMediaToS3 } from '@/lib/api';
import { spendCredits, getImageCreditCost, trackRealCostOnly } from '@/lib/services/credits';
import { getImageCost, type ImageResolution } from '@/lib/services/real-costs';
import { rateLimit } from '@/lib/services/rate-limit';
import { getUserPermissions, shouldUseOwnApiKeys, checkRequiredApiKeys, getMissingRequirementError } from '@/lib/services/user-permissions';
import { callExternalApi, pollKieTask } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import type { ImageProvider } from '@/types/project';

export const maxDuration = 300; // Allow up to 5 minutes for image generation (Modal cold start can take ~2-3 min)

// KIE model mapping: UI names to API model names
const KIE_MODEL_MAPPING: Record<string, string> = {
  'nano-banana-pro': 'google/gemini-3-pro-image-preview',
  'google-nano-banana-pro': 'google/gemini-3-pro-image-preview',
  'google-nano-banana-pro-4k': 'google/gemini-3-pro-image-preview',
  'seedream-4-5': 'seedream/4-5-text-to-image',
  'seedream/4-5-text-to-image': 'seedream/4-5-text-to-image',
  'grok-imagine': 'grok-imagine/text-to-image',
  'flux-pro': 'flux-2/pro-1.1-text-to-image',
};

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
  model?: string; // Model ID from project model config (for free users)
}

// Generate image using Gemini (special case - uses AI SDK)
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

    // Process reference images in parallel for better performance
    const imagePromises = referenceImages
      .filter(ref => ref.imageUrl)
      .map(async (ref) => {
        try {
          let base64Data: string;
          let mimeType: string;

          if (ref.imageUrl.startsWith('data:')) {
            const matches = ref.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              [, mimeType, base64Data] = matches;
              return { name: ref.name, base64Data, mimeType };
            }
            return null;
          } else if (ref.imageUrl.startsWith('http')) {
            const imageResponse = await fetch(ref.imageUrl);
            if (!imageResponse.ok) return null;
            const arrayBuffer = await imageResponse.arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString('base64');
            mimeType = imageResponse.headers.get('content-type') || 'image/png';
            return { name: ref.name, base64Data, mimeType };
          }
          return null;
        } catch (error) {
          console.error(`[Reference] Error processing image for ${ref.name}:`, error);
          return null;
        }
      });

    const processedImages = (await Promise.all(imagePromises)).filter(Boolean);

    for (const img of processedImages) {
      if (img) {
        messageContent.push({ type: 'image', image: img.base64Data, mimeType: img.mimeType });
        messageContent.push({ type: 'text', text: `(Above: ${img.name} - use this EXACT character appearance)` });
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

  const imageUrl = await uploadMediaToS3(base64DataUrl, 'image', projectId);

  return { imageUrl, cost: realCost, storage: !imageUrl.startsWith('data:') ? 's3' : 'base64' };
}

// Generate image using centralized API wrapper
async function generateWithWrapper(
  userId: string | undefined,
  projectId: string | undefined,
  provider: string,
  prompt: string,
  aspectRatio: string,
  resolution: ImageResolution,
  referenceImages: Array<{ name: string; imageUrl: string }>,
  creditUserId: string | undefined,
  realCostUserId: string | undefined,
  isRegeneration: boolean = false,
  sceneId?: string,
  endpoint?: string,
  requestModel?: string
): Promise<{ imageUrl: string; cost: number; storage: string }> {
  console.log(`[${provider}] Generating image with wrapper`);

  // Build request body based on provider
  let requestBody: any;
  let kieModelId: string | undefined; // Track KIE model for cost calculation
  const randomSeed = Math.floor(Math.random() * 2147483647);

  switch (provider) {
    case 'modal':
      requestBody = {
        prompt,
        aspect_ratio: aspectRatio,
        resolution,
        seed: randomSeed,
      };
      break;

    case 'modal-edit':
      if (referenceImages.length === 0) {
        throw new Error('Modal-Edit requires reference images');
      }
      requestBody = {
        prompt,
        aspect_ratio: aspectRatio,
        reference_images: referenceImages.map(ref => ref.imageUrl),
        seed: randomSeed,
      };
      break;

    case 'kie':
      // Get model from config
      const config = await getProviderConfig({
        userId: userId || 'system',
        type: 'image'
      });

      // Use request model if provided, otherwise use config model
      const rawModelId = requestModel || config.model || 'seedream/4-5-text-to-image';

      // Map model name from UI to API format
      const modelToUse = KIE_MODEL_MAPPING[rawModelId] || rawModelId;

      // Store for cost calculation later
      kieModelId = rawModelId;

      requestBody = {
        text: prompt,
        model: modelToUse,
        aspect_ratio: aspectRatio,
        // Map resolution to KIE format (they expect numeric string like '1024', '2048')
        resolution: resolution === '2k' ? '2048' : resolution === '4k' ? '4096' : '1024',
        seed: randomSeed,
      };
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  // Make the API call using wrapper
  const response = await callExternalApi({
    userId: userId || 'system',
    projectId,
    type: 'image',
    body: requestBody,
    endpoint,
    showLoadingMessage: true,
    loadingMessage: `Generating image using ${provider}...`,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  let imageUrl: string | undefined;

  // Handle KIE response
  if (provider === 'kie') {
    // KIE /api/v1/generate/image returns task ID in response.data.taskId
    const taskId = response.data?.taskId;

    if (!taskId) {
      console.error('[Image API] KIE response:', JSON.stringify(response.data, null, 2));
      throw new Error('KIE AI did not return a task ID');
    }

    console.log(`[KIE] Task created: ${taskId}, polling for completion...`);

    // Get API key from config for polling
    const configForPolling = await getProviderConfig({
      userId: userId || 'system',
      type: 'image'
    });

    // Poll for task completion using the same pattern as the working script
    const KIE_API_URL = 'https://api.kie.ai';
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const statusResponse = await fetch(`${KIE_API_URL}/api/v1/fetch/image/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${configForPolling.apiKey}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check KIE status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      const state = statusData.data?.state;

      console.log(`[KIE] Status: ${state}, attempt ${attempts + 1}/${maxAttempts}`);

      if (state === 'COMPLETED') {
        imageUrl = statusData.data?.result?.url;
        if (!imageUrl) {
          throw new Error('KIE completed but no image URL in result');
        }
        break;
      }

      if (state === 'FAILED') {
        throw new Error(`KIE task failed: ${statusData.data?.error || 'Unknown error'}`);
      }

      attempts++;
    }

    if (!imageUrl) {
      throw new Error('KIE task timed out');
    }
  } else {
    // Modal providers
    if (response.data.image) {
      imageUrl = response.data.image.startsWith('data:')
        ? response.data.image
        : `data:image/png;base64,${response.data.image}`;
    } else if (response.data.imageUrl) {
      imageUrl = response.data.imageUrl;
    }
  }

  if (!imageUrl) {
    throw new Error(`${provider} did not return an image`);
  }

  // Calculate costs
  let realCost = 0.09; // Default cost
  if (provider === 'kie' && kieModelId) {
    // Set costs based on model
    if (kieModelId.includes('nano-banana')) {
      realCost = kieModelId.includes('4k') ? 0.12 : 0.09;
    } else if (kieModelId.includes('seedream')) {
      realCost = 0.10; // Seedream 4.5
    } else if (kieModelId.includes('grok')) {
      realCost = 0.02;
    } else if (kieModelId.includes('flux')) {
      realCost = 0.15; // Flux Pro
    }
  }

  const creditCost = getImageCreditCost(resolution);
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (creditUserId) {
    await spendCredits(
      creditUserId,
      creditCost,
      'image',
      `${provider} image ${actionType} (${resolution.toUpperCase()})`,
      projectId,
      provider as any,
      { isRegeneration, sceneId },
      realCost
    );
  } else if (realCostUserId) {
    await trackRealCostOnly(
      realCostUserId,
      realCost,
      'image',
      `${provider} image ${actionType} (${resolution.toUpperCase()}) - prepaid`,
      projectId,
      provider as any,
      { isRegeneration, sceneId, prepaidRegeneration: true }
    );
  }

  // Upload to S3
  imageUrl = await uploadMediaToS3(imageUrl, 'image', projectId);

  return { imageUrl, cost: realCost, storage: !imageUrl.startsWith('data:') ? 's3' : 'base64' };
}

export async function POST(request: NextRequest) {
  // SECURITY: Rate limit generation to prevent abuse (20 requests/min)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const {
      prompt,
      aspectRatio = '1:1',
      resolution = '2k',
      projectId,
      referenceImages = [],
      isRegeneration = false,
      sceneId,
      skipCreditCheck = false,
      ownerId,
      model: requestModel
    }: ImageGenerationRequest = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const authCtx = await optionalAuth();
    const sessionUserId = authCtx?.userId;

    // Get provider configuration - single source of truth
    const settingsUserId = ownerId || sessionUserId || 'system';
    const config = await getProviderConfig({
      userId: settingsUserId,

      type: 'image',
    });

    const imageProvider = config.provider;
    const userHasOwnApiKey = config.userHasOwnApiKey;

    // Check permissions and credits
    if (sessionUserId && !skipCreditCheck) {
      const permissions = await getUserPermissions(sessionUserId);
      const useOwnKeys = await shouldUseOwnApiKeys(sessionUserId, 'image');

      if ((useOwnKeys || permissions.requiresApiKeys) && !userHasOwnApiKey) {
        const keyCheck = await checkRequiredApiKeys(sessionUserId, 'image');
        if (!keyCheck.hasKeys) {
          const error = getMissingRequirementError(permissions, 'image', keyCheck.missing);
          return NextResponse.json(error, { status: error.code === 'API_KEY_REQUIRED' ? 403 : 402 });
        }
      } else if (permissions.requiresCredits && !userHasOwnApiKey) {
        const creditCost = getImageCreditCost(resolution);
        const insufficientCredits = await requireCredits(sessionUserId, creditCost);
        if (insufficientCredits) return insufficientCredits;
      }
    }

    console.log(`[Image] Using provider: ${imageProvider}, model: ${config.model}, reference images: ${referenceImages.length}`);

    // For cost tracking
    const effectiveUserId = (skipCreditCheck || userHasOwnApiKey) ? undefined : sessionUserId;
    const realCostUserId = ownerId || sessionUserId;

    // Special handling for Modal-Edit without reference images
    if (imageProvider === 'modal-edit' && referenceImages.length === 0) {
      return NextResponse.json(
        { error: 'Modal-Edit requires reference images. Please provide reference images or switch to a different image provider (Gemini, KIE, or Modal) in your settings.' },
        { status: 400 }
      );
    }

    // Use Gemini AI SDK for Gemini provider
    if (imageProvider === 'gemini') {
      if (!config.apiKey) {
        return NextResponse.json(
          { error: 'Gemini API key not configured. Please add your API key in Settings.' },
          { status: 500 }
        );
      }

      const result = await generateWithGemini(
        prompt,
        aspectRatio,
        resolution,
        projectId,
        referenceImages,
        config.apiKey,
        effectiveUserId,
        realCostUserId,
        isRegeneration,
        sceneId
      );
      return NextResponse.json(result);
    }

    // Use wrapper for other providers
    const result = await generateWithWrapper(
      settingsUserId === 'system' ? undefined : settingsUserId,
      projectId,
      imageProvider,
      prompt,
      aspectRatio,
      resolution,
      referenceImages,
      effectiveUserId,
      realCostUserId,
      isRegeneration,
      sceneId,
      config.endpoint, // For modal endpoints
      requestModel
    );

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