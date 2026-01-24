// Unified Image API Route using centralized API wrapper
// All provider configurations come from Settings (single source of truth)

import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth, requireCredits } from '@/lib/api';
import { getImageCreditCost } from '@/lib/services/credits';
import { rateLimit } from '@/lib/services/rate-limit';
import { getUserPermissions, shouldUseOwnApiKeys, checkRequiredApiKeys, getMissingRequirementError } from '@/lib/services/user-permissions';
import { getProviderConfig } from '@/lib/providers';
import type { ImageResolution } from '@/lib/services/real-costs';

import { generateWithGemini } from './generators/gemini';
import { generateWithWrapper } from './generators/wrapper';
import type { ImageGenerationRequest } from './types';

export const maxDuration = 300; // Allow up to 5 minutes for image generation (Modal cold start can take ~2-3 min)

export async function POST(request: NextRequest) {
  // SECURITY: Rate limit generation to prevent abuse (20 requests/min)
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const {
      prompt,
      aspectRatio = '1:1',
      resolution,
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

    // Get default resolution from model if not provided in request
    let effectiveResolution: ImageResolution = resolution || '2k';
    if (!resolution && imageProvider === 'kie') {
      // For KIE, get the defaultResolution from the model config
      const { prisma } = await import('@/lib/db/prisma');
      const modelConfig = await prisma.kieImageModel.findUnique({
        where: { modelId: config.model },
        select: { defaultResolution: true },
      });
      effectiveResolution = (modelConfig?.defaultResolution || '2k') as ImageResolution;
    }

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
        const creditCost = getImageCreditCost(effectiveResolution);
        const insufficientCredits = await requireCredits(sessionUserId, creditCost);
        if (insufficientCredits) return insufficientCredits;
      }
    }

    console.log(`[Image] Using provider: ${imageProvider}, model: ${config.model}, resolution: ${effectiveResolution}, reference images: ${referenceImages.length}`);

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

      const result = await generateWithGemini({
        prompt,
        aspectRatio,
        resolution: effectiveResolution,
        projectId,
        referenceImages,
        apiKey: config.apiKey,
        creditUserId: effectiveUserId,
        realCostUserId,
        isRegeneration,
        sceneId,
      });
      return NextResponse.json(result);
    }

    // Use wrapper for other providers
    const result = await generateWithWrapper({
      userId: settingsUserId === 'system' ? undefined : settingsUserId,
      projectId,
      provider: imageProvider,
      prompt,
      aspectRatio,
      resolution: effectiveResolution,
      referenceImages,
      creditUserId: effectiveUserId,
      realCostUserId,
      isRegeneration,
      sceneId,
      endpoint: config.endpoint, // For modal endpoints
      requestModel,
    });

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
