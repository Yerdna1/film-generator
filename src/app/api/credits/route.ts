// Credits API - Get and manage user credits
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getOrCreateCredits,
  spendCredits,
  addCredits,
  getTransactionHistory,
  COSTS,
} from '@/lib/services/credits';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

// GET - Get user's credits and optionally transaction history (with 30-min cache)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const historyLimit = parseInt(searchParams.get('limit') || '20');
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Create cache key based on query params
    const cacheKey = `${cacheKeys.userCredits(userId)}:history=${includeHistory}:limit=${historyLimit}`;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = cache.get<object>(cacheKey);
      if (cachedData) {
        console.log(`[Cache HIT] Credits for user ${userId}`);
        return NextResponse.json(cachedData, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }

    console.log(`[Cache MISS] Fetching credits from DB for user ${userId}`);

    const credits = await getOrCreateCredits(userId);

    const response: {
      credits: typeof credits;
      costs: typeof COSTS;
      transactions?: Awaited<ReturnType<typeof getTransactionHistory>>;
    } = {
      credits,
      costs: COSTS,
    };

    if (includeHistory) {
      response.transactions = await getTransactionHistory(userId, historyLimit);
    }

    // Cache for 30 minutes
    cache.set(cacheKey, response, cacheTTL.MEDIUM);

    return NextResponse.json(response, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Credits API error:', error);

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
        costs: COSTS,
        transactions: [],
        error: 'Database temporarily unavailable (quota exceeded)',
        isOffline: true,
      });
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Spend or add credits
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, amount, type, description, projectId } = await request.json();

    if (!action || !amount || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: action, amount, type' },
        { status: 400 }
      );
    }

    if (action === 'spend') {
      const result = await spendCredits(
        session.user.id,
        amount,
        type,
        description,
        projectId
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, balance: result.balance },
          { status: 402 } // Payment Required
        );
      }

      // Invalidate all credit-related caches for this user
      cache.invalidateUser(session.user.id);
      console.log(`[Cache INVALIDATED] All caches for user ${session.user.id} after spending credits`);

      return NextResponse.json({
        success: true,
        balance: result.balance,
      });
    }

    if (action === 'add') {
      const result = await addCredits(
        session.user.id,
        amount,
        type,
        description
      );

      // Invalidate all credit-related caches for this user
      cache.invalidateUser(session.user.id);
      console.log(`[Cache INVALIDATED] All caches for user ${session.user.id} after adding credits`);

      return NextResponse.json({
        success: result.success,
        balance: result.balance,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "spend" or "add"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process credits' },
      { status: 500 }
    );
  }
}
