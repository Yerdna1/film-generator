import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserStatistics, getUserCostMultiplier } from '@/lib/services/credits';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const cacheKey = cacheKeys.userStatistics(userId);

    // Check for force refresh query param
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedStats = cache.get<object>(cacheKey);
      if (cachedStats) {
        console.log(`[Cache HIT] Statistics for user ${userId}`);
        return NextResponse.json(cachedStats, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }

    console.log(`[Cache MISS] Fetching statistics from DB for user ${userId}`);

    // Get user statistics
    const statistics = await getUserStatistics(userId);

    // Get cost multiplier
    const multiplier = await getUserCostMultiplier(userId);

    // Apply multiplier to real costs if user is not admin
    const applyMultiplier = (cost: number) => cost * multiplier;

    // Transform the stats with the multiplier applied
    const transformedStats = {
      ...statistics.stats,
      byType: Object.fromEntries(
        Object.entries(statistics.stats.byType).map(([key, value]) => [
          key,
          {
            ...value,
            realCost: applyMultiplier(value.realCost),
          },
        ])
      ),
      byProvider: Object.fromEntries(
        Object.entries(statistics.stats.byProvider).map(([key, value]) => [
          key,
          {
            ...value,
            realCost: applyMultiplier(value.realCost),
          },
        ])
      ),
      byProject: Object.fromEntries(
        Object.entries(statistics.stats.byProject).map(([key, value]) => [
          key,
          {
            ...value,
            realCost: applyMultiplier(value.realCost),
          },
        ])
      ),
    };

    const responseData = {
      credits: {
        ...statistics.credits,
        totalRealCost: applyMultiplier(statistics.credits.totalRealCost),
      },
      stats: transformedStats,
      recentTransactions: statistics.recentTransactions.map((tx) => ({
        ...tx,
        realCost: applyMultiplier(tx.realCost),
      })),
      multiplier,
      isAdmin: multiplier === 1.0,
    };

    // Cache for 1 hour
    cache.set(cacheKey, responseData, cacheTTL.LONG);
    console.log(`[Cache SET] Statistics cached for 2 hours`);

    return NextResponse.json(responseData, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);

    // Check if it's a database quota error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuotaError = errorMessage.includes('data transfer quota') || errorMessage.includes('quota');

    if (isQuotaError) {
      // Return fallback data when database is unavailable
      return NextResponse.json({
        credits: {
          balance: 0,
          totalSpent: 0,
          totalEarned: 0,
          totalRealCost: 0,
          lastUpdated: new Date(),
        },
        stats: {
          totalTransactions: 0,
          byType: {},
          byProvider: {},
          byProject: {},
        },
        recentTransactions: [],
        multiplier: 1.5,
        isAdmin: false,
        isOffline: true,
        error: 'Database temporarily unavailable',
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
