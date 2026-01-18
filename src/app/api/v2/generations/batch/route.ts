// Batch Generation API
// POST /api/v2/generations/batch

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import {
  createProvider,
  getProviderConfig,
  selectOptimalProvider,
  type GenerationType,
  type ProviderType,
  type BatchGenerationRequest,
  type BatchGenerationResponse
} from '@/lib/providers';
import { withCredits, type CreditTrackingResult } from '@/lib/api/generation';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 300; // 5 minutes for batch operations

export const POST = withAuth(async (request, _, { userId }) => {
  try {
    const body: BatchGenerationRequest = await request.json();
    const { items, webhookUrl, parallel = true, continueOnError = true } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (items.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 items allowed per batch' },
        { status: 400 }
      );
    }

    const batchId = uuidv4();
    const results: BatchGenerationResponse['results'] = [];

    if (parallel) {
      // Process all items in parallel
      const promises = items.map(async (item, index) => {
        try {
          const result = await processGenerationItem(userId, item, index);
          return { index, result };
        } catch (error) {
          if (continueOnError) {
            return {
              index,
              result: {
                index,
                type: item.type,
                provider: item.provider || 'unknown' as ProviderType,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Generation failed'
              }
            };
          }
          throw error;
        }
      });

      const parallelResults = await Promise.all(promises);

      // Sort by index to maintain order
      parallelResults.sort((a, b) => a.index - b.index);
      results.push(...parallelResults.map(r => r.result));
    } else {
      // Process items sequentially
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        try {
          const result = await processGenerationItem(userId, item, index);
          results.push(result);
        } catch (error) {
          if (continueOnError) {
            results.push({
              index,
              type: item.type,
              provider: item.provider || 'unknown' as ProviderType,
              status: 'error',
              error: error instanceof Error ? error.message : 'Generation failed'
            });
          } else {
            // Stop processing on error
            break;
          }
        }
      }
    }

    // Calculate summary
    const completed = results.filter((r): boolean => r.status === 'complete').length;
    const failed = results.filter((r): boolean => r.status === 'error').length;

    const response: BatchGenerationResponse = {
      id: batchId,
      status: failed === results.length ? 'error' :
              failed > 0 ? 'partial' :
              'complete',
      total: items.length,
      completed,
      failed,
      results
    };

    // Schedule webhook if provided
    if (webhookUrl) {
      scheduleWebhook(batchId, webhookUrl, response);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Batch generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch generation failed' },
      { status: 500 }
    );
  }
});

async function processGenerationItem(
  userId: string,
  item: BatchGenerationRequest['items'][0],
  index: number
): Promise<BatchGenerationResponse['results'][0]> {
  const { type, provider: requestedProvider, config, metadata = {} } = item;

  // Get provider configuration
  let providerConfig;
  let selectedProvider: ProviderType;

  if (requestedProvider) {
    providerConfig = await getProviderConfig({
      userId,
      type,
      requestProvider: requestedProvider,
      projectId: metadata.projectId,
      settingsUserId: config.settingsUserId,
      ownerId: config.ownerId,
    });
    selectedProvider = requestedProvider;
  } else {
    // Auto-select optimal provider
    const selection = await selectOptimalProvider({
      type,
      priority: 'speed',
    }, {});
    selectedProvider = selection.provider;
    providerConfig = await getProviderConfig({
      userId,
      type,
      requestProvider: selectedProvider,
      projectId: metadata.projectId,
      settingsUserId: config.settingsUserId,
      ownerId: config.ownerId,
    });
  }

  // Create provider instance
  const provider = createProvider(type, providerConfig);

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
      return await provider.generate(config);
    },
  });

  // If it's a NextResponse (error), extract the error
  if (result instanceof NextResponse) {
    const errorData = await result.json();
    return {
      index,
      type,
      provider: selectedProvider,
      status: 'error',
      error: errorData.error || 'Generation failed'
    };
  }

  // Cast to our tracking result type
  const trackingResult = result as CreditTrackingResult;

  return {
    index,
    type,
    provider: selectedProvider,
    status: trackingResult.status || 'complete',
    result: trackingResult
  };
}

// Helper to schedule webhook
async function scheduleWebhook(
  batchId: string,
  webhookUrl: string,
  payload: BatchGenerationResponse
) {
  // In production, use a job queue
  setTimeout(async () => {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Batch-Id': batchId,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Batch webhook failed:', error);
    }
  }, 1000);
}