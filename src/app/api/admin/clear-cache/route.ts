import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statsBefore = cache.getStats();
    cache.clear();
    const statsAfter = cache.getStats();

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      before: statsBefore,
      after: statsAfter
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
