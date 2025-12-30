import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { getUserCostMultiplier } from '@/lib/services/credits';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

export interface ProjectCostData {
  projectId: string;
  credits: number;
  realCost: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const cacheKey = cacheKeys.projectCosts(userId);

    // Check for force refresh query param
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedCosts = cache.get<object>(cacheKey);
      if (cachedCosts) {
        console.log(`[Cache HIT] Project costs for user ${userId}`);
        return NextResponse.json(cachedCosts, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }

    console.log(`[Cache MISS] Fetching project costs from DB for user ${userId}`);

    // Get cost multiplier for user
    const multiplier = await getUserCostMultiplier(userId);

    // Get all credit transactions grouped by project
    const credits = await prisma.credits.findUnique({
      where: { userId },
      include: {
        transactions: {
          where: {
            projectId: { not: null },
            amount: { lt: 0 }, // Only spending transactions
          },
          select: {
            projectId: true,
            amount: true,
            realCost: true,
          },
        },
      },
    });

    if (!credits) {
      return NextResponse.json({ costs: {} });
    }

    // Aggregate by project
    const projectCosts: Record<string, { credits: number; realCost: number }> = {};

    for (const tx of credits.transactions) {
      if (!tx.projectId) continue;

      if (!projectCosts[tx.projectId]) {
        projectCosts[tx.projectId] = { credits: 0, realCost: 0 };
      }

      projectCosts[tx.projectId].credits += Math.abs(tx.amount);
      projectCosts[tx.projectId].realCost += tx.realCost * multiplier;
    }

    const responseData = {
      costs: projectCosts,
      multiplier,
      isAdmin: multiplier === 1.0,
    };

    // Cache for 2 hours
    cache.set(cacheKey, responseData, cacheTTL.LONG);
    console.log(`[Cache SET] Project costs cached for 2 hours`);

    return NextResponse.json(responseData, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Error fetching project costs:', error);

    // Check if it's a database quota error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuotaError = errorMessage.includes('data transfer quota') || errorMessage.includes('quota');

    if (isQuotaError) {
      // Return empty costs when database is unavailable
      return NextResponse.json({
        costs: {},
        multiplier: 1.5,
        isAdmin: false,
        isOffline: true,
        error: 'Database temporarily unavailable',
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch project costs',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
