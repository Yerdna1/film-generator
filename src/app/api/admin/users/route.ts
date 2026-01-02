import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdmin } from '@/lib/admin';

// GET - List all users with their credits
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
