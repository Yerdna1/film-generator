import { NextResponse } from 'next/server';
import { spendCredits, trackRealCostOnly } from '@/lib/services/credits';
import { requireCredits } from '@/lib/api';
import { GenerationType, ProviderType, BaseGenerationResponse } from '@/lib/providers/types';
import { getActionCost } from '@/lib/services/real-costs';

export interface CreditTrackingOptions {
  userId?: string;
  action: GenerationType;
  provider: ProviderType;
  skipCheck?: boolean;
  userHasOwnApiKey?: boolean;
  projectId?: string;
  isRegeneration?: boolean;
  sceneId?: string;
  characterId?: string;
  realCostUserId?: string;
  ownerId?: string;
  estimatedCost?: number;
  metadata?: Record<string, any>;
  execute: () => Promise<BaseGenerationResponse>;
}

export interface CreditTrackingResult extends BaseGenerationResponse {
  creditSpent: number;
  realCostTracked: number;
}

// Helper function to map GenerationType to ActionType for getActionCost compatibility
function mapGenerationTypeToActionType(generationType: GenerationType): string {
  return generationType === 'tts' ? 'voiceover' : generationType;
}

/**
 * Wrapper that handles credit checking, execution, and spending
 */
export async function withCredits(
  options: CreditTrackingOptions
): Promise<CreditTrackingResult | NextResponse> {
  const {
    userId,
    action,
    provider,
    skipCheck = false,
    userHasOwnApiKey = false,
    projectId,
    isRegeneration,
    sceneId,
    characterId,
    realCostUserId,
    ownerId,
    estimatedCost,
    metadata = {},
    execute,
  } = options;

  // Determine credit cost
  const creditCost = estimatedCost || getActionCost(mapGenerationTypeToActionType(action) as any, provider as any);

  // Determine which user to deduct credits from
  const creditUserId = (skipCheck || userHasOwnApiKey) ? undefined : userId;
  const costTrackingUserId = realCostUserId || ownerId || userId;

  // Step 1: Pre-check credit balance
  if (creditUserId && !skipCheck && !userHasOwnApiKey) {
    const insufficientCredits = await requireCredits(creditUserId, creditCost);
    if (insufficientCredits) {
      return insufficientCredits;
    }
  }

  let result: BaseGenerationResponse;
  let realCost = 0;

  try {
    // Step 2: Execute generation
    result = await execute();

    // Extract real cost from result if available
    realCost = result.realCost || result.cost || 0;
  } catch (error) {
    // If generation fails, don't charge credits
    console.error(`Generation failed for ${action} with ${provider}:`, error);
    throw error;
  }

  // Step 3: Deduct credits or track cost
  let creditSpent = 0;
  let realCostTracked = 0;

  try {
    if (creditUserId) {
      // Normal generation - deduct credits with real cost override
      const description = buildDescription(action, provider, metadata);

      await spendCredits(
        creditUserId,
        creditCost,
        action,
        description,
        projectId,
        provider,
        {
          isRegeneration,
          sceneId,
          characterId,
          ...metadata,
        },
        realCost // Pass real cost as override
      );

      creditSpent = creditCost;
      realCostTracked = realCost;
    } else if (costTrackingUserId && realCost > 0) {
      // Collaborator regeneration or user with own API key - only track real cost
      const description = buildDescription(action, provider, {
        ...metadata,
        prepaid: skipCheck,
        ownApiKey: userHasOwnApiKey,
      });

      await trackRealCostOnly(
        costTrackingUserId,
        realCost,
        action,
        description,
        projectId,
        provider,
        {
          isRegeneration,
          sceneId,
          characterId,
          prepaidRegeneration: skipCheck,
          userOwnApiKey: userHasOwnApiKey,
          ...metadata,
        }
      );

      realCostTracked = realCost;
    }
  } catch (creditError) {
    // Log credit tracking error but don't fail the request
    console.error('Credit tracking error:', creditError);
  }

  return {
    ...result,
    creditSpent,
    realCostTracked,
  };
}

/**
 * Build description for credit transaction
 */
function buildDescription(
  action: GenerationType,
  provider: ProviderType,
  metadata: Record<string, any>
): string {
  const parts = [
    capitalizeFirst(provider),
    action,
    'generation',
  ];

  if (metadata.resolution) {
    parts.push(`(${metadata.resolution})`);
  }
  if (metadata.duration) {
    parts.push(`(${metadata.duration}s)`);
  }
  if (metadata.prepaid) {
    parts.push('- prepaid');
  }
  if (metadata.ownApiKey) {
    parts.push('- user API key');
  }

  return parts.join(' ');
}

/**
 * Calculate credit cost based on action and metadata
 */
export function calculateCreditCost(
  action: GenerationType,
  provider: ProviderType,
  metadata: Record<string, any>
): number {
  // This should be moved to a centralized place
  // For now, using the getActionCost function
  // TODO: Use metadata for more accurate cost calculation (e.g., resolution, duration)
  return getActionCost(mapGenerationTypeToActionType(action) as any, provider as any);
}

/**
 * Batch credit operations for multiple generations
 */
export async function withBatchCredits(
  userId: string,
  operations: Array<{
    action: GenerationType;
    provider: ProviderType;
    estimatedCost?: number;
    metadata?: Record<string, any>;
  }>,
  execute: () => Promise<BaseGenerationResponse[]>
): Promise<CreditTrackingResult[] | NextResponse> {
  // Calculate total cost
  const totalCost = operations.reduce((sum, op) => {
    const cost = op.estimatedCost || getActionCost(mapGenerationTypeToActionType(op.action) as any, op.provider as any);
    return sum + cost;
  }, 0);

  // Pre-check total credits
  const insufficientCredits = await requireCredits(userId, totalCost);
  if (insufficientCredits) {
    return insufficientCredits;
  }

  // Execute all operations
  const results = await execute();

  // Track credits for each result
  const trackedResults: CreditTrackingResult[] = await Promise.all(
    results.map(async (result, index) => {
      const op = operations[index];
      const creditCost = op.estimatedCost || getActionCost(mapGenerationTypeToActionType(op.action) as any, op.provider as any);
      const realCost = result.realCost || result.cost || 0;

      await spendCredits(
        userId,
        creditCost,
        op.action,
        buildDescription(op.action, op.provider, op.metadata || {}),
        undefined, // projectId
        op.provider,
        op.metadata || {},
        realCost
      );

      return {
        ...result,
        creditSpent: creditCost,
        realCostTracked: realCost,
      };
    })
  );

  return trackedResults;
}

/**
 * Helper to capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}