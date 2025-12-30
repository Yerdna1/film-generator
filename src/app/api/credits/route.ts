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

// GET - Get user's credits and optionally transaction history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const historyLimit = parseInt(searchParams.get('limit') || '20');

    const credits = await getOrCreateCredits(session.user.id);

    const response: {
      credits: typeof credits;
      costs: typeof COSTS;
      transactions?: Awaited<ReturnType<typeof getTransactionHistory>>;
    } = {
      credits,
      costs: COSTS,
    };

    if (includeHistory) {
      response.transactions = await getTransactionHistory(
        session.user.id,
        historyLimit
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get credits' },
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
