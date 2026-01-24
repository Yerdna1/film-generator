/**
 * Query functions for credit information
 */

import { prisma } from '@/lib/db/prisma';
import { COSTS } from './constants';
import type { CostType, CreditsInfo, TransactionRecord } from './types';
import { getOrCreateCredits } from './operations';

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
