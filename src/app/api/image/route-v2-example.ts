// Example of how to migrate the image route to use the new provider system
// This shows the dramatic simplification from 724 lines to ~100 lines

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import { createProvider, getProviderConfig } from '@/lib/providers';
import { withCredits } from '@/lib/api/generation';
import { rateLimit } from '@/lib/services/rate-limit';
import type { ImageProvider } from '@/types/project';

// Import all providers to ensure registration
import '@/lib/providers/all-providers';

export const maxDuration = 300;

export const POST = withAuth(async (request, _, { userId }) => {
  // Rate limiting
  const rateLimitResponse = await rateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse; // 429 response
  }

  try {
    const body = await request.json();
    const {
      prompt,
      aspectRatio = '16:9',
      resolution = '2k',
      projectId,
      referenceImages = [],
      isRegeneration = false,
      sceneId,
      skipCreditCheck = false,
      ownerId,
      imageProvider: requestedProvider,
      model,
      settingsUserId,
    } = body;

    const config = await getProviderConfig({
      userId,
      type: 'image',
      projectId,
      settingsUserId: settingsUserId || ownerId,
      ownerId,
    });

    // Override model if provided
    if (model) {
      config.model = model;
    }

    // Override provider if requested and allowed (manual override not supported by getProviderConfig)
    if (requestedProvider) {
      // We manually override it here since getProviderConfig doesn't support it
      config.provider = requestedProvider as ImageProvider;
    }

    // Create provider instance
    const provider = createProvider('image', config);

    // Execute with credit tracking
    const result = await withCredits({
      userId,
      action: 'image',
      provider: config.provider,
      skipCheck: skipCreditCheck,
      userHasOwnApiKey: config.userHasOwnApiKey,
      projectId,
      isRegeneration,
      sceneId,
      realCostUserId: ownerId,
      ownerId,
      execute: () => {
        const imageProvider = provider as any; // Type assertion for image provider
        return imageProvider.generate({
          prompt,
          aspectRatio,
          resolution: resolution as any,
          referenceImages,
          projectId,
          isRegeneration,
          sceneId,
        });
      },
    });

    // If error response, return it
    if (result instanceof NextResponse) {
      return result;
    }

    // Return successful result
    return NextResponse.json({
      success: true,
      ...result,
      provider: config.provider,
      model: config.model,
    });
  } catch (error) {
    console.error('Image generation error:', error);

    // Handle specific provider errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Provider rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    );
  }
});

// Example of using the new v2 unified API instead
export async function exampleV2Usage(request: NextRequest) {
  const body = await request.json();

  // Call the unified v2 API
  const response = await fetch('/api/v2/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'image',
      provider: body.imageProvider, // Optional, auto-selected if not provided
      config: {
        prompt: body.prompt,
        aspectRatio: body.aspectRatio,
        resolution: body.resolution,
        referenceImages: body.referenceImages,
      },
      metadata: {
        projectId: body.projectId,
        sceneId: body.sceneId,
        isRegeneration: body.isRegeneration,
      },
    }),
  });

  return response;
}