// Unified Generations API v2
// Handles all generation types through a single endpoint

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import {
  createProvider,
  getProviderConfig,
  selectOptimalProvider,
  type UnifiedGenerationRequest,
  type UnifiedGenerationResponse,
  type GenerationType,
  type ProviderType
} from '@/lib/providers';
import { withCredits, type CreditTrackingResult } from '@/lib/api/generation';
import { v4 as uuidv4 } from 'uuid';
import { activeGenerations } from './generation-store';

// POST /api/v2/generations - Create a new generation
export const POST = withAuth(async (request, _, { userId }) => {
  try {
    const body: UnifiedGenerationRequest = await request.json();
    const { type, provider: requestedProvider, config, metadata = {} } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Generation type is required' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: 'Generation config is required' },
        { status: 400 }
      );
    }

    // Generate unique ID for this generation
    const generationId = uuidv4();

    // Get provider configuration
    let providerConfig;
    let selectedProvider: ProviderType;

    if (requestedProvider) {
      // Use requested provider
      providerConfig = await getProviderConfig({
        userId,
        type,
        projectId: metadata.projectId,
        settingsUserId: config.settingsUserId,
        ownerId: config.ownerId,
      });
      // Manually override provider
      providerConfig.provider = requestedProvider;
      selectedProvider = requestedProvider;
    } else {
      // Auto-select optimal provider
      const selection = await selectOptimalProvider({
        type,
        priority: 'speed', // Could be made configurable
      }, {
        // Don't pass userId here, it's not part of ProviderConfig
      });
      selectedProvider = selection.provider;
      providerConfig = await getProviderConfig({
        userId,
        type,
        projectId: metadata.projectId,
        settingsUserId: config.settingsUserId,
        ownerId: config.ownerId,
      });
      // Manually override provider
      providerConfig.provider = selectedProvider;
    }

    // Create provider instance
    const provider = createProvider(type, providerConfig);

    // Store generation info
    activeGenerations.set(generationId, {
      type,
      provider: selectedProvider,
      status: 'pending',
      createdAt: new Date(),
    });

    // Execute generation with credit tracking
    const result = await withCredits({
      userId,
      action: type,
      provider: selectedProvider,
      skipCheck: config.skipCreditCheck,
      userHasOwnApiKey: providerConfig.userHasOwnApiKey,
      projectId: metadata.projectId,
      isRegeneration: metadata.isRegeneration,
      sceneId: metadata.sceneId,
      characterId: metadata.characterId,
      realCostUserId: config.ownerId,
      ownerId: config.ownerId,
      estimatedCost: provider.estimateCost ? provider.estimateCost(config) : undefined,
      metadata,
      execute: async () => {
        const current = activeGenerations.get(generationId)!;
        current.status = 'processing';
        activeGenerations.set(generationId, current);

        const generationResult = await provider.generate(config);

        const completed = activeGenerations.get(generationId)!;
        completed.status = 'complete';
        completed.result = generationResult;
        activeGenerations.set(generationId, completed);

        return generationResult;
      },
    });

    // If it's a NextResponse (error), return it
    if (result instanceof NextResponse) {
      activeGenerations.delete(generationId);
      return result;
    }

    // Cast to our tracking result type
    const trackingResult = result as CreditTrackingResult;

    // Create unified response
    const response: UnifiedGenerationResponse = {
      id: generationId,
      type,
      provider: selectedProvider,
      status: trackingResult.status || 'complete',
      result: trackingResult,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        creditSpent: trackingResult.creditSpent,
        realCostTracked: trackingResult.realCostTracked,
      },
    };

    // If webhook URL provided, schedule webhook
    if (metadata.webhookUrl) {
      // In a production system, you'd queue this
      scheduleWebhook(generationId, metadata.webhookUrl, response);
    }

    // Clean up if complete
    if (response.status === 'complete' || response.status === 'error') {
      activeGenerations.delete(generationId);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
});

// GET /api/v2/generations - List generations
export const GET = withAuth(async (request, _, { userId }) => {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const type = url.searchParams.get('type');

  // For now, return active generations
  // In production, query from database filtered by userId
  const generations = Array.from(activeGenerations.entries())
    .filter(([_, gen]) => {
      if (type && gen.type !== type) return false;
      return true;
    })
    .map(([id, gen]) => ({
      id,
      type: gen.type,
      provider: gen.provider,
      status: gen.status,
      createdAt: gen.createdAt.toISOString(),
    }));

  return NextResponse.json({ generations });
})


// Helper to schedule webhook
async function scheduleWebhook(
  generationId: string,
  webhookUrl: string,
  payload: UnifiedGenerationResponse
) {
  // In production, use a job queue like Inngest
  setTimeout(async () => {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Generation-Id': generationId,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Webhook failed:', error);
    }
  }, 1000);
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}