import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { getAppConfig, updateAppConfig } from '@/lib/services/app-config';

// Only admin email can access this endpoint
const ADMIN_EMAIL = 'andrej.galad@gmail.com';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const config = await getAppConfig();

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error getting app config:', error);
    return NextResponse.json(
      { error: 'Failed to get app config', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { startingCredits } = body;

    if (startingCredits !== undefined && (typeof startingCredits !== 'number' || startingCredits < 0)) {
      return NextResponse.json(
        { error: 'startingCredits must be a non-negative number' },
        { status: 400 }
      );
    }

    const config = await updateAppConfig({
      startingCredits: startingCredits ?? 0,
    });

    return NextResponse.json({
      success: true,
      message: `Starting credits updated to ${config.startingCredits}`,
      config,
    });
  } catch (error) {
    console.error('Error updating app config:', error);
    return NextResponse.json(
      { error: 'Failed to update app config', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
