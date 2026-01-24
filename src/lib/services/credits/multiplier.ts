/**
 * User cost multiplier functions
 */

import { prisma } from '@/lib/db/prisma';

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
