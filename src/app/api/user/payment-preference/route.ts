import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

// POST - Update user's payment preference
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { useOwnKeys } = body;

    if (typeof useOwnKeys !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid preference value' },
        { status: 400 }
      );
    }

    // Update or create API keys record with preference
    const apiKeys = await prisma.apiKeys.upsert({
      where: { userId: session.user.id },
      update: {
        preferOwnKeys: useOwnKeys,
      },
      create: {
        id: `apikeys_${session.user.id}`,
        userId: session.user.id,
        preferOwnKeys: useOwnKeys,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment preference updated successfully',
      preferOwnKeys: apiKeys.preferOwnKeys,
    });
  } catch (error) {
    console.error('Error updating payment preference:', error);
    return NextResponse.json(
      { error: 'Failed to update payment preference' },
      { status: 500 }
    );
  }
}