/**
 * Core credit operations - spend, add, track, and manage user credits
 */

import { prisma } from '@/lib/db/prisma';
import { getActionCost, type Provider } from '../real-costs';
import { getStartingCredits } from '../app-config';
import { cache } from '@/lib/cache';
import { TYPE_TO_ACTION } from './constants';
import type { CreditsInfo } from './types';

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

    // Invalidate cache after successful credit spend
    if (result.success) {
      cache.invalidateUser(userId);
    }

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

    // Invalidate cache after adding credits
    cache.invalidateUser(userId);

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
