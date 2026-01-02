import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig, updateAppConfig } from '@/lib/services/app-config';
import { verifyAdmin } from '@/lib/admin';

export async function GET() {
  try {
    // SECURITY: Verify admin role from database
    const adminCheck = await verifyAdmin();
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized - Admin access required' },
        { status: 401 }
      );
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
    // SECURITY: Verify admin role from database
    const adminCheck = await verifyAdmin();
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized - Admin access required' },
        { status: 401 }
      );
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
