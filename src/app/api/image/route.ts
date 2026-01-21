// Unified Image API Route - Routes to appropriate provider based on user settings
// Supports: Gemini, Modal (Qwen-Image), Modal-Edit (Qwen-Image-Edit for character consistency)

import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { prisma } from '@/lib/db/prisma';
import { optionalAuth, requireCredits, uploadMediaToS3 } from '@/lib/api';
import { spendCredits, getImageCreditCost, trackRealCostOnly } from '@/lib/services/credits';
import { getImageCost, type ImageResolution } from '@/lib/services/real-costs';
import { rateLimit } from '@/lib/services/rate-limit';
import { getUserPermissions, shouldUseOwnApiKeys, checkRequiredApiKeys, getMissingRequirementError } from '@/lib/services/user-permissions';
import type { ImageProvider } from '@/types/project';
import { DEFAULT_MODELS } from '@/components/workflow/api-key-modal/constants';

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
  imageProvider?: ImageProvider; // Override the default provider from user settings
  model?: string; // Model ID from project model config (for free users)
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
  console.log('[Modal] Uploading to S3...');
  imageUrl = await uploadMediaToS3(imageUrl, 'image', projectId);

  console.log('[Modal] Returning imageUrl length:', imageUrl.length);
  return { imageUrl, cost: realCost, storage: imageUrl.startsWith('data:') ? 'base64' : 's3' };
}

// Generate image using KIE AI with model support
async function generateWithKie(
  prompt: string,
  aspectRatio: string,
  resolution: ImageResolution,
  projectId: string | undefined,
  kieApiKey: string,
  modelId: string,
  creditUserId: string | undefined,
  realCostUserId: string | undefined,
  isRegeneration: boolean = false,
  sceneId?: string
): Promise<{ imageUrl: string; cost: number; storage: string }> {
  console.log(`[KIE] Generating image with model: ${modelId}`);

  // Query model from database instead of constants file
  const modelConfig = await prisma.kieImageModel.findUnique({
    where: { modelId }
  });

  if (!modelConfig || !modelConfig.isActive) {
    throw new Error(`Invalid KIE image model: ${modelId}`);
  }

  // Use apiModelId for KIE.ai API call
  // If apiModelId is null, this model is not directly supported by KIE's API
  if (!modelConfig.apiModelId) {
    throw new Error(
      `The model "${modelConfig.name}" (${modelId}) is not directly supported by KIE's API. ` +
      `Please select a different model in Settings. ` +
      `Working models: "Ideogram V3", "Grok Imagine", "Z-Image"`
    );
  }

  const apiModelId = modelConfig.apiModelId;
  const costText = `${modelConfig.credits} credits ($${modelConfig.cost.toFixed(2)})`;
  console.log(`[KIE] Using model: ${modelConfig.name} (${apiModelId}) - ${costText}`);

  try {
    // KIE AI unified task creation endpoint
    const KIE_API_URL = 'https://api.kie.ai';
    const createResponse = await fetch(`${KIE_API_URL}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kieApiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: apiModelId, // Use apiModelId for KIE.ai API call
        input: {
          prompt: prompt,
          aspect_ratio: aspectRatio,
          // Model-specific parameters can be added here based on apiModelId
          ...(apiModelId.includes('ideogram') && { render_text: true }),
          ...(apiModelId.includes('flux') && { guidance_scale: 7.5 }),
        },
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok || createData.code !== 200) {
      const errorMsg = createData.msg || createData.message || createData.error || 'Failed to create KIE image task';
      console.error('[KIE] Task creation failed:', {
        status: createResponse.status,
        code: createData.code,
        msg: createData.msg,
        message: createData.message,
        fullResponse: createData,
        requestDetails: {
          model: apiModelId,
          promptLength: prompt.length,
          aspectRatio,
          promptPreview: prompt.substring(0, 100) + '...',
        }
      });

      // Provide helpful error messages
      if (errorMsg.includes('access') || errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
        throw new Error(`KIE AI access denied: Your API key may not have access to model "${modelId}". Please check your KIE AI account permissions and try a different model.`);
      }
      if (errorMsg.includes('credit') || errorMsg.includes('balance') || errorMsg.includes('insufficient')) {
        throw new Error(`KIE AI credits exhausted: Your KIE AI account has run out of credits. Please top up at kie.ai to continue generating images.`);
      }
      if (errorMsg.includes('key') || errorMsg.includes('auth') || errorMsg.includes('token')) {
        throw new Error(`KIE AI authentication failed: Your API key appears to be invalid. Please check your API key in Settings.`);
      }
      throw new Error(`KIE AI image generation failed: ${errorMsg}`);
    }

    const taskId = createData.data?.taskId;
    if (!taskId) {
      throw new Error('KIE AI did not return a task ID');
    }

    console.log(`[KIE] Task created: ${taskId}, polling for completion...`);

    // Poll for task completion
    const maxPolls = 60; // 2 minutes max (2s intervals)
    let imageUrl: string | undefined;
    let failMessage: string | undefined;

    for (let i = 0; i < maxPolls; i++) {
      // Wait before polling (except first iteration)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const statusResponse = await fetch(
        `${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${kieApiKey}`,
            'Accept': 'application/json',
          },
        }
      );

      const statusData = await statusResponse.json();

      if (!statusResponse.ok || statusData.code !== 200) {
        throw new Error(statusData.msg || statusData.message || 'Failed to check KIE task status');
      }

      const taskData = statusData.data;
      const state = taskData.state;

      console.log(`[KIE] Task ${taskId} state: ${state}`);

      if (state === 'success') {
        // Extract image URL from result
        if (taskData.resultJson) {
          try {
            const result = JSON.parse(taskData.resultJson);
            imageUrl = result.resultUrls?.[0] || result.imageUrl || result.image_url;
            if (!imageUrl && result.images?.length > 0) {
              imageUrl = result.images[0];
            }
          } catch (e) {
            console.error('[KIE] Failed to parse resultJson:', e);
          }
        }

        // Fallback to direct URL fields
        if (!imageUrl) {
          imageUrl = taskData.imageUrl || taskData.image_url || taskData.resultUrl;
        }

        if (!imageUrl) {
          throw new Error('KIE AI completed but did not return an image URL');
        }

        break;
      } else if (state === 'fail') {
        failMessage = taskData.failMsg || 'Image generation failed';
        throw new Error(`KIE AI image generation failed: ${failMessage}`);
      }
      // Continue polling for 'waiting', 'queuing', 'generating' states
    }

    if (!imageUrl) {
      throw new Error('KIE AI image generation timed out');
    }

    // Calculate costs based on model
    const realCost = modelConfig.cost;
    const creditCost = getImageCreditCost(resolution);
    const actionType = isRegeneration ? 'regeneration' : 'generation';

    if (creditUserId) {
      // Normal case: deduct credits and track real cost
      await spendCredits(
        creditUserId,
        creditCost,
        'image',
        `KIE AI ${modelConfig.name} ${actionType} (${resolution.toUpperCase()})`,
        projectId,
        'kie',
        { isRegeneration, sceneId, model: modelId, kieCredits: modelConfig.credits },
        realCost
      );
    } else if (realCostUserId) {
      // Collaborator regeneration: only track real cost
      await trackRealCostOnly(
        realCostUserId,
        realCost,
        'image',
        `KIE AI ${modelConfig.name} ${actionType} (${resolution.toUpperCase()}) - prepaid`,
        projectId,
        'kie',
        { isRegeneration, sceneId, model: modelId, kieCredits: modelConfig.credits, prepaidRegeneration: true }
      );
    }

    // Upload to S3 if needed
    imageUrl = await uploadMediaToS3(imageUrl, 'image', projectId);

    return { imageUrl, cost: realCost, storage: !imageUrl.startsWith('data:') ? 's3' : 'base64' };
  } catch (error) {
    console.error('[KIE] Error generating image:', error);
    throw error;
  }
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
  console.log('[Modal-Edit] Uploading to S3...');
  imageUrl = await uploadMediaToS3(imageUrl, 'image', projectId);

  console.log('[Modal-Edit] Returning imageUrl length:', imageUrl.length);
  return { imageUrl, cost: realCost, storage: imageUrl.startsWith('data:') ? 'base64' : 's3' };
}

export async function POST(request: NextRequest) {
  // SECURITY: Rate limit generation to prevent abuse (20 requests/min)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const { prompt, aspectRatio = '1:1', resolution = '2k', projectId, referenceImages = [], isRegeneration = false, sceneId, skipCreditCheck = false, ownerId, imageProvider: requestProvider, model: requestModel }: ImageGenerationRequest = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const authCtx = await optionalAuth();
    const sessionUserId = authCtx?.userId;
    let imageProvider: ImageProvider = requestProvider || 'gemini';
    let geminiApiKey = process.env.GEMINI_API_KEY;
    let kieApiKey = process.env.KIE_API_KEY;
    let kieImageModel = requestModel || DEFAULT_MODELS.kieImageModel; // Use model from request, fallback to default
    let modalImageEndpoint: string | null = null;
    let modalImageEditEndpoint: string | null = null;

    // When ownerId is provided (collaborator regeneration), use owner's settings
    // Otherwise use session user's settings
    const settingsUserId = ownerId || sessionUserId;

    let userHasOwnApiKey = false; // Track if user has their own API key (declare outside block)

    if (settingsUserId) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: settingsUserId },
      });

      if (userApiKeys) {
        // Only use database provider if not provided in request (for backward compatibility)
        if (!requestProvider) imageProvider = (userApiKeys.imageProvider as ImageProvider) || 'gemini';

        // Get provider-specific settings
        if (userApiKeys.geminiApiKey) {
          geminiApiKey = userApiKeys.geminiApiKey;
          userHasOwnApiKey = true;
        }
        if (userApiKeys.kieApiKey) {
          kieApiKey = userApiKeys.kieApiKey;
          userHasOwnApiKey = true;
        }
        // Only use database model if not provided in request (for backward compatibility)
        if (!requestModel && userApiKeys.kieImageModel) {
          kieImageModel = userApiKeys.kieImageModel;
        }
        if (userApiKeys.modalImageEndpoint) {
          modalImageEndpoint = userApiKeys.modalImageEndpoint;
          userHasOwnApiKey = true;
        }
        if (userApiKeys.modalImageEditEndpoint) {
          modalImageEditEndpoint = userApiKeys.modalImageEditEndpoint;
          userHasOwnApiKey = true;
        }
      }

      // Check user permissions and credit/API key requirements
      if (sessionUserId && !skipCreditCheck) {
        const permissions = await getUserPermissions(sessionUserId);
        const useOwnKeys = await shouldUseOwnApiKeys(sessionUserId, 'image');

        // Check if user needs API keys
        if (useOwnKeys || permissions.requiresApiKeys) {
          const keyCheck = await checkRequiredApiKeys(sessionUserId, 'image');

          if (!keyCheck.hasKeys) {
            const error = getMissingRequirementError(permissions, 'image', keyCheck.missing);
            return NextResponse.json(error, { status: error.code === 'API_KEY_REQUIRED' ? 403 : 402 });
          }

          // User has API keys, skip credit check
          userHasOwnApiKey = true;
          console.log('[Image] User using own API keys - skipping credit check and deduction');
        } else if (permissions.requiresCredits) {
          // Premium/admin user using system keys - check credits
          const creditCost = getImageCreditCost(resolution);
          const insufficientCredits = await requireCredits(sessionUserId, creditCost);
          if (insufficientCredits) return insufficientCredits;
        }
      }
    }

    console.log(`[Image] Using provider: ${imageProvider}, model: ${kieImageModel}, reference images: ${referenceImages.length}, skipCreditCheck: ${skipCreditCheck}, ownerId: ${ownerId || 'none'}`);

    // For cost tracking:
    // - When skipCreditCheck is true (collaborator regeneration): credits already prepaid by admin,
    //   but we still want to track real API costs to the owner
    // - When skipCreditCheck is false (normal generation): track to session user
    // - When user has own API key: no credit deduction needed (they're paying provider directly)
    const effectiveUserId = (skipCreditCheck || userHasOwnApiKey) ? undefined : sessionUserId; // For credit deduction
    const realCostUserId = ownerId || sessionUserId; // For real cost tracking (always track to owner)

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

    if (imageProvider === 'kie') {
      if (!kieApiKey) {
        return NextResponse.json(
          { error: 'KIE AI API key not configured. Please add your API key in Settings.' },
          { status: 400 }
        );
      }

      const result = await generateWithKie(prompt, aspectRatio, resolution, projectId, kieApiKey, kieImageModel, effectiveUserId, realCostUserId, isRegeneration, sceneId);
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
