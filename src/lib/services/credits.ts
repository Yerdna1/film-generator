// Credits Service - Manage user credits for AI generation
import { prisma } from '@/lib/db/prisma';
import { getActionCost, type Provider, type ActionType } from './real-costs';

// Cost configuration (in kie points)
export const COSTS = {
  IMAGE_GENERATION: 5,    // Per image (Gemini/NanoBanana)
  VIDEO_GENERATION: 20,   // Per 6s video (Grok Imagine via kie.ai)
  VOICEOVER_LINE: 2,      // Per dialogue line (Gemini TTS/ElevenLabs)
  SCENE_GENERATION: 1,    // Per scene text generation (Claude/Gemini)
  CHARACTER_GENERATION: 1, // Per character prompt generation
} as const;

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
 */
export async function getOrCreateCredits(userId: string): Promise<CreditsInfo> {
  let credits = await prisma.credits.findUnique({
    where: { userId },
  });

  if (!credits) {
    // Check if user exists first
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    credits = await prisma.credits.create({
      data: {
        userId,
        balance: 500, // Initial credits
        totalEarned: 500,
        totalRealCost: 0,
      },
    });
  }

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
    const credits = await getOrCreateCredits(userId);

    if (credits.balance < amount) {
      return {
        success: false,
        balance: credits.balance,
        realCost: 0,
        error: `Insufficient credits. Need ${amount}, have ${credits.balance}`,
      };
    }

    // Calculate real cost - use override if provided, otherwise calculate from action type
    const actionType = TYPE_TO_ACTION[type];
    const realCost = realCostOverride !== undefined
      ? realCostOverride
      : (actionType && provider ? getActionCost(actionType, provider) : 0);

    // Update credits and create transaction in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedCredits = await tx.credits.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount },
          totalRealCost: { increment: realCost },
          lastUpdated: new Date(),
        },
      });

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

      return updatedCredits;
    });

    return {
      success: true,
      balance: updated.balance,
      realCost,
    };
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
 * Add credits to user (for purchases or bonuses)
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: string = 'bonus',
  description?: string
): Promise<{ success: boolean; balance: number }> {
  try {
    // Ensure credits record exists
    await getOrCreateCredits(userId);

    const updated = await prisma.$transaction(async (tx) => {
      const userCredits = await tx.credits.findUnique({
        where: { userId },
      });

      if (!userCredits) {
        throw new Error('Credits not found');
      }

      const updatedCredits = await tx.credits.update({
        where: { userId },
        data: {
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
 * Get cost for an operation type
 */
export function getCost(costType: CostType, quantity: number = 1): number {
  return COSTS[costType] * quantity;
}

/**
 * Get user statistics with real costs
 */
export async function getUserStatistics(userId: string): Promise<{
  credits: CreditsInfo;
  stats: {
    totalTransactions: number;
    byType: Record<string, { count: number; credits: number; realCost: number }>;
    byProvider: Record<string, { count: number; credits: number; realCost: number }>;
    byProject: Record<string, { name: string; credits: number; realCost: number }>;
  };
  recentTransactions: TransactionRecord[];
}> {
  const credits = await getOrCreateCredits(userId);

  const creditsRecord = await prisma.credits.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!creditsRecord) {
    return {
      credits,
      stats: {
        totalTransactions: 0,
        byType: {},
        byProvider: {},
        byProject: {},
      },
      recentTransactions: [],
    };
  }

  const transactions = creditsRecord.transactions;

  // Calculate stats by type
  const byType: Record<string, { count: number; credits: number; realCost: number }> = {};
  const byProvider: Record<string, { count: number; credits: number; realCost: number }> = {};
  const projectIds = new Set<string>();

  for (const tx of transactions) {
    if (tx.amount < 0) {
      // By type
      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, credits: 0, realCost: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].credits += Math.abs(tx.amount);
      byType[tx.type].realCost += tx.realCost;

      // By provider
      const provider = tx.provider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, credits: 0, realCost: 0 };
      }
      byProvider[provider].count++;
      byProvider[provider].credits += Math.abs(tx.amount);
      byProvider[provider].realCost += tx.realCost;

      // Collect project IDs
      if (tx.projectId) {
        projectIds.add(tx.projectId);
      }
    }
  }

  // Get project names and calculate per-project costs
  const byProject: Record<string, { name: string; credits: number; realCost: number }> = {};

  if (projectIds.size > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: Array.from(projectIds) } },
      select: { id: true, name: true },
    });

    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    for (const tx of transactions) {
      if (tx.amount < 0 && tx.projectId) {
        if (!byProject[tx.projectId]) {
          byProject[tx.projectId] = {
            name: projectMap.get(tx.projectId) || 'Unknown Project',
            credits: 0,
            realCost: 0,
          };
        }
        byProject[tx.projectId].credits += Math.abs(tx.amount);
        byProject[tx.projectId].realCost += tx.realCost;
      }
    }
  }

  return {
    credits,
    stats: {
      totalTransactions: transactions.filter((t) => t.amount < 0).length,
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
 * Get project-specific statistics
 */
export async function getProjectStatistics(projectId: string): Promise<{
  totalCredits: number;
  totalRealCost: number;
  byType: Record<string, { count: number; credits: number; realCost: number }>;
  byProvider: Record<string, { count: number; credits: number; realCost: number }>;
  transactions: TransactionRecord[];
}> {
  const transactions = await prisma.creditTransaction.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  let totalCredits = 0;
  let totalRealCost = 0;
  const byType: Record<string, { count: number; credits: number; realCost: number }> = {};
  const byProvider: Record<string, { count: number; credits: number; realCost: number }> = {};

  for (const tx of transactions) {
    if (tx.amount < 0) {
      totalCredits += Math.abs(tx.amount);
      totalRealCost += tx.realCost;

      // By type
      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, credits: 0, realCost: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].credits += Math.abs(tx.amount);
      byType[tx.type].realCost += tx.realCost;

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
