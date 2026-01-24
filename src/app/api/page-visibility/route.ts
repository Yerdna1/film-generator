import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/api';
import { checkPageVisibility, getUserPageVisibility } from '@/lib/services/page-visibility';
import { prisma } from '@/lib/db/prisma';

interface CheckVisibilityRequest {
  path: string;
}

// GET /api/page-visibility - Get all page visibility rules for the current user
export async function GET(request: NextRequest) {
  try {
    const authCtx = await optionalAuth();

    if (!authCtx?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const visibility = await getUserPageVisibility(authCtx.userId);

    return NextResponse.json({
      visibility,
    });
  } catch (error) {
    console.error('Page visibility check error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/page-visibility - Check if a specific path is visible
export async function POST(request: NextRequest) {
  try {
    const authCtx = await optionalAuth();

    if (!authCtx?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path }: CheckVisibilityRequest = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    // Get user and API keys for context
    const [user, apiKeys] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authCtx.userId },
      }),
      prisma.apiKeys.findUnique({
        where: { userId: authCtx.userId },
      }),
    ]);

    const result = await checkPageVisibility({
      path,
      user,
      apiKeys,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Page visibility check error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
