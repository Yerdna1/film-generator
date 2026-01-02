import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

// Fix missing projectId on image transactions by matching count with project scenes
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's credits record
    const credits = await prisma.credits.findUnique({
      where: { userId },
    });

    if (!credits) {
      return NextResponse.json({ error: 'No credits record found' }, { status: 404 });
    }

    // OPTIMIZATION: Fetch orphaned transactions, projects, and transaction counts in parallel
    const [orphanedImageTransactions, projects, existingTransactionCounts] = await Promise.all([
      // Get all image transactions without projectId
      prisma.creditTransaction.findMany({
        where: {
          creditsId: credits.id,
          type: 'image',
          projectId: null,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // Get all projects with scenes that have imageUrl
      prisma.project.findMany({
        where: { userId },
        include: {
          scenes: {
            where: {
              imageUrl: { not: null },
            },
            select: { id: true, imageUrl: true }, // Only select what we need
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      // OPTIMIZATION: Get transaction counts grouped by projectId in a single query
      prisma.creditTransaction.groupBy({
        by: ['projectId'],
        where: {
          creditsId: credits.id,
          type: 'image',
          projectId: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    if (orphanedImageTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned image transactions found',
        orphanedCount: 0,
      });
    }

    // Build a map of existing transaction counts per project
    const transactionCountMap = new Map<string, number>();
    for (const group of existingTransactionCounts) {
      if (group.projectId) {
        transactionCountMap.set(group.projectId, group._count.id);
      }
    }

    // Count images per project and existing transactions per project
    const projectInfo: {
      projectId: string;
      projectName: string;
      sceneImageCount: number;
      existingTransactions: number;
      needsAssignment: number;
    }[] = [];

    for (const project of projects) {
      const sceneImageCount = project.scenes.filter(s => s.imageUrl).length;
      const existingTransactions = transactionCountMap.get(project.id) || 0;
      const needsAssignment = sceneImageCount - existingTransactions;

      if (sceneImageCount > 0) {
        projectInfo.push({
          projectId: project.id,
          projectName: project.name,
          sceneImageCount,
          existingTransactions,
          needsAssignment: Math.max(0, needsAssignment),
        });
      }
    }

    // Collect all assignments to perform in a single batch transaction
    const assignmentUpdates: { id: string; projectId: string }[] = [];
    const assignments: { transactionId: string; projectId: string; projectName: string }[] = [];
    let orphanedIndex = 0;

    for (const project of projectInfo) {
      if (project.needsAssignment <= 0) continue;

      for (let i = 0; i < project.needsAssignment && orphanedIndex < orphanedImageTransactions.length; i++) {
        const tx = orphanedImageTransactions[orphanedIndex];
        assignmentUpdates.push({ id: tx.id, projectId: project.projectId });
        assignments.push({
          transactionId: tx.id,
          projectId: project.projectId,
          projectName: project.projectName,
        });
        orphanedIndex++;
      }
    }

    // OPTIMIZATION: Perform all updates in a single transaction
    if (assignmentUpdates.length > 0) {
      await prisma.$transaction(
        assignmentUpdates.map(({ id, projectId }) =>
          prisma.creditTransaction.update({
            where: { id },
            data: { projectId },
          })
        )
      );
    }

    // OPTIMIZATION: Get all project transactions in a single query
    const allProjectTransactions = await prisma.creditTransaction.findMany({
      where: {
        creditsId: credits.id,
        projectId: { not: null },
      },
      select: {
        projectId: true,
        realCost: true,
        amount: true,
      },
    });

    // Aggregate costs per project
    const projectCostMap = new Map<string, { totalRealCost: number; totalCredits: number }>();
    for (const tx of allProjectTransactions) {
      if (!tx.projectId) continue;
      const existing = projectCostMap.get(tx.projectId) || { totalRealCost: 0, totalCredits: 0 };
      existing.totalRealCost += tx.realCost;
      existing.totalCredits += Math.abs(tx.amount);
      projectCostMap.set(tx.projectId, existing);
    }

    // Build updated project info
    const updatedProjectInfo: { projectId: string; projectName: string; totalRealCost: number; totalCredits: number }[] = [];
    for (const project of projects) {
      const costs = projectCostMap.get(project.id);
      if (costs) {
        updatedProjectInfo.push({
          projectId: project.id,
          projectName: project.name,
          totalRealCost: costs.totalRealCost,
          totalCredits: costs.totalCredits,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Assigned ${assignmentUpdates.length} orphaned image transactions to projects`,
      orphanedCount: orphanedImageTransactions.length,
      assignedCount: assignmentUpdates.length,
      remainingOrphaned: orphanedImageTransactions.length - assignmentUpdates.length,
      projectInfo,
      assignments: assignments.slice(0, 20), // Show first 20 assignments
      updatedProjectCosts: updatedProjectInfo,
    });
  } catch (error) {
    console.error('Error fixing image costs:', error);
    return NextResponse.json(
      { error: 'Failed to fix image costs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET - Preview what would be fixed without making changes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's credits record
    const credits = await prisma.credits.findUnique({
      where: { userId },
    });

    if (!credits) {
      return NextResponse.json({ error: 'No credits record found' }, { status: 404 });
    }

    // OPTIMIZATION: Fetch all data in parallel
    const [orphanedImageTransactions, projects, existingTransactionCounts] = await Promise.all([
      // Get all image transactions without projectId
      prisma.creditTransaction.findMany({
        where: {
          creditsId: credits.id,
          type: 'image',
          projectId: null,
        },
        select: { realCost: true, amount: true },
      }),
      // Get all projects with scenes that have imageUrl
      prisma.project.findMany({
        where: { userId },
        include: {
          scenes: {
            where: {
              imageUrl: { not: null },
            },
            select: { id: true, imageUrl: true },
          },
        },
      }),
      // OPTIMIZATION: Get transaction counts grouped by projectId in a single query
      prisma.creditTransaction.groupBy({
        by: ['projectId'],
        where: {
          creditsId: credits.id,
          type: 'image',
          projectId: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    // Build a map of existing transaction counts per project
    const transactionCountMap = new Map<string, number>();
    for (const group of existingTransactionCounts) {
      if (group.projectId) {
        transactionCountMap.set(group.projectId, group._count.id);
      }
    }

    // Count images per project
    const projectInfo: {
      projectId: string;
      projectName: string;
      sceneImageCount: number;
      existingTransactions: number;
      needsAssignment: number;
    }[] = [];

    let totalNeedsAssignment = 0;

    for (const project of projects) {
      const sceneImageCount = project.scenes.filter(s => s.imageUrl).length;
      const existingTransactions = transactionCountMap.get(project.id) || 0;
      const needsAssignment = Math.max(0, sceneImageCount - existingTransactions);
      totalNeedsAssignment += needsAssignment;

      if (sceneImageCount > 0) {
        projectInfo.push({
          projectId: project.id,
          projectName: project.name,
          sceneImageCount,
          existingTransactions,
          needsAssignment,
        });
      }
    }

    const orphanedRealCost = orphanedImageTransactions.reduce((sum, tx) => sum + tx.realCost, 0);
    const orphanedCredits = orphanedImageTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return NextResponse.json({
      preview: true,
      message: 'Preview of image cost fix (no changes made)',
      orphanedImageTransactions: orphanedImageTransactions.length,
      orphanedRealCost,
      orphanedCredits,
      totalNeedsAssignment,
      canAssign: Math.min(orphanedImageTransactions.length, totalNeedsAssignment),
      projectInfo,
    });
  } catch (error) {
    console.error('Error previewing image costs fix:', error);
    return NextResponse.json(
      { error: 'Failed to preview', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
