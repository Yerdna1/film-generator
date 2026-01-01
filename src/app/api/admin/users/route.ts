import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

const ADMIN_EMAIL = 'andrejgalad@gmail.com';

// GET - List all users with their credits
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        isApproved: true,
        costMultiplier: true,
        createdAt: true,
        credits: {
          select: {
            balance: true,
            totalSpent: true,
            totalEarned: true,
            totalRealCost: true,
          },
        },
        _count: {
          select: {
            projects: true,
            projectMemberships: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        ...user,
        credits: user.credits || { balance: 0, totalSpent: 0, totalEarned: 0, totalRealCost: 0 },
        projectCount: user._count.projects,
        membershipCount: user._count.projectMemberships,
      })),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
