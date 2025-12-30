// Credits Service - Manage user credits for AI generation
import { prisma } from '@/lib/db/prisma';

// Cost configuration (in kie points)
export const COSTS = {
  IMAGE_GENERATION: 5,    // Per image (Gemini/NanoBanana)
  VIDEO_GENERATION: 20,   // Per 6s video (Grok Imagine via kie.ai)
  VOICEOVER_LINE: 2,      // Per dialogue line (Gemini TTS/ElevenLabs)
  SCENE_GENERATION: 1,    // Per scene text generation (Claude/Gemini)
  CHARACTER_GENERATION: 1, // Per character prompt generation
} as const;

export type CostType = keyof typeof COSTS;

export interface CreditsInfo {
  balance: number;
  totalSpent: number;
  totalEarned: number;
  lastUpdated: Date;
}

export interface TransactionRecord {
  id: string;
  amount: number;
  type: string;
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
    credits = await prisma.credits.create({
      data: {
        userId,
        balance: 500, // Initial credits
        totalEarned: 500,
      },
    });
  }

  return {
    balance: credits.balance,
    totalSpent: credits.totalSpent,
    totalEarned: credits.totalEarned,
    lastUpdated: credits.lastUpdated,
  };
}

/**
 * Spend credits for an operation
 */
export async function spendCredits(
  userId: string,
  amount: number,
  type: string,
  description?: string,
  projectId?: string
): Promise<{ success: boolean; balance: number; error?: string }> {
  try {
    const credits = await getOrCreateCredits(userId);

    if (credits.balance < amount) {
      return {
        success: false,
        balance: credits.balance,
        error: `Insufficient credits. Need ${amount}, have ${credits.balance}`,
      };
    }

    // Update credits and create transaction in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedCredits = await tx.credits.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount },
          lastUpdated: new Date(),
        },
      });

      await tx.creditTransaction.create({
        data: {
          creditsId: updatedCredits.id,
          amount: -amount,
          type,
          description: description || `${type} generation`,
          projectId,
        },
      });

      return updatedCredits;
    });

    return {
      success: true,
      balance: updated.balance,
    };
  } catch (error) {
    console.error('Error spending credits:', error);
    return {
      success: false,
      balance: 0,
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
    const credits = await getOrCreateCredits(userId);

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
