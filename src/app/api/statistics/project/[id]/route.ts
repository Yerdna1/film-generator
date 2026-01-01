import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProjectStatistics, getUserCostMultiplier } from '@/lib/services/credits';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get project statistics
    const statistics = await getProjectStatistics(projectId);

    // Get cost multiplier
    const multiplier = await getUserCostMultiplier(session.user.id);

    // Apply multiplier to real costs
    const applyMultiplier = (cost: number) => cost * multiplier;

    const responseData = {
      projectId,
      projectName: project.name,
      totalCredits: statistics.totalCredits,
      totalRealCost: applyMultiplier(statistics.totalRealCost),
      summary: statistics.summary,
      byType: Object.fromEntries(
        Object.entries(statistics.byType).map(([key, value]) => [
          key,
          {
            ...value,
            realCost: applyMultiplier(value.realCost),
          },
        ])
      ),
      byProvider: Object.fromEntries(
        Object.entries(statistics.byProvider).map(([key, value]) => [
          key,
          {
            ...value,
            realCost: applyMultiplier(value.realCost),
          },
        ])
      ),
      recentTransactions: statistics.transactions.slice(0, 20).map((tx) => ({
        ...tx,
        realCost: applyMultiplier(tx.realCost),
      })),
      multiplier,
      isAdmin: multiplier === 1.0,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching project statistics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch project statistics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
