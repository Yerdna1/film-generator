// Credits Service - Manage user credits for AI generation
import { prisma } from '@/lib/db/prisma';
import { getActionCost, type Provider, type ActionType } from './real-costs';
import { getStartingCredits } from './app-config';

// Cost configuration (in credits)
// Based on real API costs: 1 credit ≈ $0.005 (video baseline: 20 credits = $0.10)
export const COSTS = {
  // Image generation by resolution
  IMAGE_GENERATION: 27,      // Default (2K) - for backward compatibility
  IMAGE_GENERATION_1K: 27,   // 1K image ($0.134) - same as 2K
  IMAGE_GENERATION_2K: 27,   // 2K image ($0.134)
  IMAGE_GENERATION_4K: 48,   // 4K image ($0.24)
  // Other operations
  VIDEO_GENERATION: 20,      // Per 6s video ($0.10)
  VOICEOVER_LINE: 6,         // Per dialogue line - ElevenLabs ($0.03)
  SCENE_GENERATION: 2,       // Per scene - Claude ($0.01)
  CHARACTER_GENERATION: 2,   // Per character - Claude ($0.008)
  MUSIC_GENERATION: 10,      // Per music track - Suno ($0.05)
} as const;

// Helper to get image credit cost by resolution
export function getImageCreditCost(resolution: '1k' | '2k' | '4k' = '2k'): number {
  switch (resolution) {
    case '1k': return COSTS.IMAGE_GENERATION_1K;
    case '2k': return COSTS.IMAGE_GENERATION_2K;
    case '4k': return COSTS.IMAGE_GENERATION_4K;
    default: return COSTS.IMAGE_GENERATION_2K;
  }
}

export type CostType = keyof typeof COSTS;

// Map credit types to action types for real cost calculation
const TYPE_TO_ACTION: Record<string, ActionType> = {
  image: 'image',
  video: 'video',
  voiceover: 'voiceover',
  scene: 'scene',
  character: 'character',
  prompt: 'prompt',
};

export interface CreditsInfo {
  balance: number;
  totalSpent: number;
  totalEarned: number;
  totalRealCost: number;
  lastUpdated: Date;
}

export interface TransactionRecord {
  id: string;
  amount: number;
  realCost: number;
  type: string;
  provider: string | null;
  description: string | null;
  projectId: string | null;
  createdAt: Date;
}

/**
 * Get or create credits for a user
 * Uses upsert for atomic operation - prevents race conditions on creation
 */
export async function getOrCreateCredits(userId: string): Promise<CreditsInfo> {
  // First check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    // Return default credits if user doesn't exist in database
    return {
      balance: 0,
      totalSpent: 0,
      totalEarned: 0,
      totalRealCost: 0,
      lastUpdated: new Date(),
    };
  }

  // Get starting credits from admin config (default 0)
  const startingCredits = await getStartingCredits();

  // Use upsert for atomic get-or-create
  const credits = await prisma.credits.upsert({
    where: { userId },
    create: {
      userId,
      balance: startingCredits,
      totalEarned: startingCredits,
      totalRealCost: 0,
    },
    update: {}, // No update needed, just return existing
  });

  return {
    balance: credits.balance,
    totalSpent: credits.totalSpent,
    totalEarned: credits.totalEarned,
    totalRealCost: credits.totalRealCost,
    lastUpdated: credits.lastUpdated,
  };
}

/**
 * Spend credits for an operation with real cost tracking
 * Uses atomic check-and-deduct to prevent race conditions and negative balances
 */
export async function spendCredits(
  userId: string,
  amount: number,
  type: string,
  description?: string,
  projectId?: string,
  provider?: Provider,
  metadata?: Record<string, unknown>,
  realCostOverride?: number  // Optional: pass exact real cost (e.g., for resolution-based pricing)
): Promise<{ success: boolean; balance: number; realCost: number; error?: string }> {
  try {
    // Calculate real cost - use override if provided, otherwise calculate from action type
    const actionType = TYPE_TO_ACTION[type];
    const realCost = realCostOverride !== undefined
      ? realCostOverride
      : (actionType && provider ? getActionCost(actionType, provider) : 0);

    // All operations inside a single transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get or create credits record inside transaction
      const startingCredits = await getStartingCredits();
      const credits = await tx.credits.upsert({
        where: { userId },
        create: {
          userId,
          balance: startingCredits,
          totalEarned: startingCredits,
          totalRealCost: 0,
        },
        update: {}, // Just get existing if it exists
      });

      // Check balance INSIDE transaction to prevent race conditions
      if (credits.balance < amount) {
        return {
          success: false,
          balance: credits.balance,
          realCost: 0,
          error: `Insufficient credits. Need ${amount}, have ${credits.balance}`,
        };
      }

      // Atomic update with balance check in WHERE clause for extra safety
      // This ensures the update only succeeds if balance is still sufficient
      const updateResult = await tx.credits.updateMany({
        where: {
          userId,
          balance: { gte: amount }, // Only update if balance is still sufficient
        },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount },
          totalRealCost: { increment: realCost },
          lastUpdated: new Date(),
        },
      });

      // If no rows updated, balance became insufficient (race condition caught)
      if (updateResult.count === 0) {
        const currentCredits = await tx.credits.findUnique({ where: { userId } });
        return {
          success: false,
          balance: currentCredits?.balance ?? 0,
          realCost: 0,
          error: `Insufficient credits. Need ${amount}, have ${currentCredits?.balance ?? 0}`,
        };
      }

      // Get updated credits for transaction record
      const updatedCredits = await tx.credits.findUnique({ where: { userId } });
      if (!updatedCredits) {
        throw new Error('Credits record not found after update');
      }

      // Create transaction record
      await tx.creditTransaction.create({
        data: {
          creditsId: updatedCredits.id,
          amount: -amount,
          realCost,
          type,
          provider: provider || null,
          description: description || `${type} generation`,
          projectId,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });

      return {
        success: true,
        balance: updatedCredits.balance,
        realCost,
      };
    });

    return result;
  } catch (error) {
    console.error('Error spending credits:', error);
    return {
      success: false,
      balance: 0,
      realCost: 0,
      error: error instanceof Error ? error.message : 'Failed to spend credits',
    };
  }
}

/**
 * Track real API cost only (without deducting credits)
 * Used for collaborator regenerations where credits were already prepaid by admin
 */
export async function trackRealCostOnly(
  userId: string,
  realCost: number,
  type: string,
  description?: string,
  projectId?: string,
  provider?: Provider,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; realCost: number }> {
  try {
    // All operations in a single transaction - no separate getOrCreateCredits call
    await prisma.$transaction(async (tx) => {
      // Get or create credits record inside transaction using upsert
      const startingCredits = await getStartingCredits();
      const credits = await tx.credits.upsert({
        where: { userId },
        create: {
          userId,
          balance: startingCredits,
          totalEarned: startingCredits,
          totalRealCost: realCost,
        },
        update: {
          totalRealCost: { increment: realCost },
          lastUpdated: new Date(),
        },
      });

      // Create transaction record with 0 credit amount
      await tx.creditTransaction.create({
        data: {
          creditsId: credits.id,
          amount: 0, // No credit deduction
          realCost,
          type,
          provider: provider || null,
          description: description || `${type} (prepaid regeneration)`,
          projectId,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
    });

    return { success: true, realCost };
  } catch (error) {
    console.error('Error tracking real cost:', error);
    return { success: false, realCost: 0 };
  }
}

/**
 * Add credits to user (for purchases or bonuses)
 * Uses upsert to eliminate redundant DB calls
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: string = 'bonus',
  description?: string
): Promise<{ success: boolean; balance: number }> {
  try {
    // All operations in a single transaction with upsert
    const updated = await prisma.$transaction(async (tx) => {
      const startingCredits = await getStartingCredits();

      // Upsert handles both create and update in one operation
      const updatedCredits = await tx.credits.upsert({
        where: { userId },
        create: {
          userId,
          balance: startingCredits + amount,
          totalEarned: startingCredits + amount,
          totalRealCost: 0,
        },
        update: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
          lastUpdated: new Date(),
        },
      });

      await tx.creditTransaction.create({
        data: {
          creditsId: updatedCredits.id,
          amount: amount,
          type,
          description: description || `${type} credits added`,
        },
      });

      return updatedCredits;
    });

    return {
      success: true,
      balance: updated.balance,
    };
  } catch (error) {
    console.error('Error adding credits:', error);
    return {
      success: false,
      balance: 0,
    };
  }
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50
): Promise<TransactionRecord[]> {
  const credits = await prisma.credits.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: limit,
      },
    },
  });

  return credits?.transactions || [];
}

/**
 * Check if user can afford an operation
 */
export async function canAfford(
  userId: string,
  costType: CostType,
  quantity: number = 1
): Promise<{ canAfford: boolean; balance: number; cost: number }> {
  const credits = await getOrCreateCredits(userId);
  const cost = COSTS[costType] * quantity;

  return {
    canAfford: credits.balance >= cost,
    balance: credits.balance,
    cost,
  };
}

/**
 * Check if user has sufficient balance for a specific credit amount
 * Used for pre-checking before starting generation operations
 */
export async function checkBalance(
  userId: string,
  requiredCredits: number
): Promise<{ hasEnough: boolean; balance: number; required: number }> {
  const credits = await getOrCreateCredits(userId);
  return {
    hasEnough: credits.balance >= requiredCredits,
    balance: credits.balance,
    required: requiredCredits,
  };
}

/**
 * Get cost for an operation type
 */
export function getCost(costType: CostType, quantity: number = 1): number {
  return COSTS[costType] * quantity;
}

/**
 * Get user statistics with real costs and generation/regeneration breakdown
 * Optimized: Single query for credits+transactions, batched project query
 */
export async function getUserStatistics(userId: string): Promise<{
  credits: CreditsInfo;
  stats: {
    totalTransactions: number;
    totalGenerations: number;
    totalRegenerations: number;
    byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }>;
    byProvider: Record<string, { count: number; credits: number; realCost: number }>;
    byProject: Record<string, { name: string; credits: number; realCost: number }>;
  };
  recentTransactions: TransactionRecord[];
}> {
  // Single query for credits and all transactions
  const creditsRecord = await prisma.credits.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // If no credits record, create one and return empty stats
  if (!creditsRecord) {
    const credits = await getOrCreateCredits(userId);
    return {
      credits,
      stats: {
        totalTransactions: 0,
        totalGenerations: 0,
        totalRegenerations: 0,
        byType: {},
        byProvider: {},
        byProject: {},
      },
      recentTransactions: [],
    };
  }

  const credits: CreditsInfo = {
    balance: creditsRecord.balance,
    totalSpent: creditsRecord.totalSpent,
    totalEarned: creditsRecord.totalEarned,
    totalRealCost: creditsRecord.totalRealCost,
    lastUpdated: creditsRecord.lastUpdated,
  };

  const transactions = creditsRecord.transactions;

  // First pass: calculate stats and collect project IDs
  const byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }> = {};
  const byProvider: Record<string, { count: number; credits: number; realCost: number }> = {};
  const projectIds = new Set<string>();
  const projectCredits: Record<string, { credits: number; realCost: number }> = {};

  let totalGenerations = 0;
  let totalRegenerations = 0;

  for (const tx of transactions) {
    if (tx.amount < 0) {
      const metadata = tx.metadata as { isRegeneration?: boolean } | null;
      const isRegeneration = metadata?.isRegeneration ?? false;

      if (isRegeneration) {
        totalRegenerations++;
      } else {
        totalGenerations++;
      }

      // By type
      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, credits: 0, realCost: 0, generations: 0, regenerations: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].credits += Math.abs(tx.amount);
      byType[tx.type].realCost += tx.realCost;
      if (isRegeneration) {
        byType[tx.type].regenerations++;
      } else {
        byType[tx.type].generations++;
      }

      // By provider
      const provider = tx.provider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, credits: 0, realCost: 0 };
      }
      byProvider[provider].count++;
      byProvider[provider].credits += Math.abs(tx.amount);
      byProvider[provider].realCost += tx.realCost;

      // Collect project costs (will add names after batch query)
      if (tx.projectId) {
        projectIds.add(tx.projectId);
        if (!projectCredits[tx.projectId]) {
          projectCredits[tx.projectId] = { credits: 0, realCost: 0 };
        }
        projectCredits[tx.projectId].credits += Math.abs(tx.amount);
        projectCredits[tx.projectId].realCost += tx.realCost;
      }
    }
  }

  // Single batched query for all project names (avoids N+1)
  const byProject: Record<string, { name: string; credits: number; realCost: number }> = {};
  if (projectIds.size > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: Array.from(projectIds) } },
      select: { id: true, name: true },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    for (const [projectId, costs] of Object.entries(projectCredits)) {
      byProject[projectId] = {
        name: projectMap.get(projectId) || 'Unknown Project',
        ...costs,
      };
    }
  }

  return {
    credits,
    stats: {
      totalTransactions: transactions.filter((t) => t.amount < 0).length,
      totalGenerations,
      totalRegenerations,
      byType,
      byProvider,
      byProject,
    },
    recentTransactions: transactions.slice(0, 50).map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      realCost: tx.realCost,
      type: tx.type,
      provider: tx.provider,
      description: tx.description,
      projectId: tx.projectId,
      createdAt: tx.createdAt,
    })),
  };
}

/**
 * Get project-specific statistics with generation/regeneration breakdown
 */
export async function getProjectStatistics(projectId: string): Promise<{
  totalCredits: number;
  totalRealCost: number;
  byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }>;
  byProvider: Record<string, { count: number; credits: number; realCost: number }>;
  transactions: TransactionRecord[];
  summary: {
    totalGenerations: number;
    totalRegenerations: number;
    imageGenerations: number;
    imageRegenerations: number;
    videoGenerations: number;
    videoRegenerations: number;
  };
}> {
  const transactions = await prisma.creditTransaction.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  let totalCredits = 0;
  let totalRealCost = 0;
  const byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }> = {};
  const byProvider: Record<string, { count: number; credits: number; realCost: number }> = {};

  // Summary counts
  let totalGenerations = 0;
  let totalRegenerations = 0;
  let imageGenerations = 0;
  let imageRegenerations = 0;
  let videoGenerations = 0;
  let videoRegenerations = 0;

  for (const tx of transactions) {
    if (tx.amount < 0) {
      totalCredits += Math.abs(tx.amount);
      totalRealCost += tx.realCost;

      // Check metadata for isRegeneration flag
      const metadata = tx.metadata as { isRegeneration?: boolean } | null;
      const isRegeneration = metadata?.isRegeneration ?? false;

      // By type with generation/regeneration breakdown
      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, credits: 0, realCost: 0, generations: 0, regenerations: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].credits += Math.abs(tx.amount);
      byType[tx.type].realCost += tx.realCost;

      if (isRegeneration) {
        byType[tx.type].regenerations++;
        totalRegenerations++;
        if (tx.type === 'image') imageRegenerations++;
        if (tx.type === 'video') videoRegenerations++;
      } else {
        byType[tx.type].generations++;
        totalGenerations++;
        if (tx.type === 'image') imageGenerations++;
        if (tx.type === 'video') videoGenerations++;
      }

      // By provider
      const provider = tx.provider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, credits: 0, realCost: 0 };
      }
      byProvider[provider].count++;
      byProvider[provider].credits += Math.abs(tx.amount);
      byProvider[provider].realCost += tx.realCost;
    }
  }

  return {
    totalCredits,
    totalRealCost,
    byType,
    byProvider,
    transactions: transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      realCost: tx.realCost,
      type: tx.type,
      provider: tx.provider,
      description: tx.description,
      projectId: tx.projectId,
      createdAt: tx.createdAt,
    })),
    summary: {
      totalGenerations,
      totalRegenerations,
      imageGenerations,
      imageRegenerations,
      videoGenerations,
      videoRegenerations,
    },
  };
}

/**
 * Get user's cost multiplier (configurable per user, default 1.0)
 */
export async function getUserCostMultiplier(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, costMultiplier: true },
    });

    if (!user) return 1.0; // Default multiplier

    // Use user's configured multiplier or default to 1.0
    return user.costMultiplier ?? 1.0;
  } catch (error) {
    console.error('Error getting cost multiplier:', error);
    return 1.0; // Default on error
  }
}
