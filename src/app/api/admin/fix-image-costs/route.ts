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

    // Get all image transactions without projectId
    const orphanedImageTransactions = await prisma.creditTransaction.findMany({
      where: {
        creditsId: credits.id,
        type: 'image',
        projectId: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (orphanedImageTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned image transactions found',
        orphanedCount: 0,
      });
    }

    // Get all projects with scenes that have imageUrl
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        scenes: {
          where: {
            imageUrl: { not: null },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

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

      // Count existing image transactions for this project
      const existingTransactions = await prisma.creditTransaction.count({
        where: {
          creditsId: credits.id,
          type: 'image',
          projectId: project.id,
        },
      });

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

    // Assign orphaned transactions to projects based on how many each project needs
    let assignedCount = 0;
    let orphanedIndex = 0;
    const assignments: { transactionId: string; projectId: string; projectName: string }[] = [];

    for (const project of projectInfo) {
      if (project.needsAssignment <= 0) continue;

      // Assign transactions to this project
      for (let i = 0; i < project.needsAssignment && orphanedIndex < orphanedImageTransactions.length; i++) {
        const tx = orphanedImageTransactions[orphanedIndex];

        await prisma.creditTransaction.update({
          where: { id: tx.id },
          data: { projectId: project.projectId },
        });

        assignments.push({
          transactionId: tx.id,
          projectId: project.projectId,
          projectName: project.projectName,
        });

        assignedCount++;
        orphanedIndex++;
      }
    }

    // Calculate updated project costs
    const updatedProjectInfo: { projectId: string; projectName: string; totalRealCost: number; totalCredits: number }[] = [];

    for (const project of projects) {
      const projectTransactions = await prisma.creditTransaction.findMany({
        where: {
          creditsId: credits.id,
          projectId: project.id,
        },
      });

      const totalRealCost = projectTransactions.reduce((sum, tx) => sum + tx.realCost, 0);
      const totalCredits = projectTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      if (projectTransactions.length > 0) {
        updatedProjectInfo.push({
          projectId: project.id,
          projectName: project.name,
          totalRealCost,
          totalCredits,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Assigned ${assignedCount} orphaned image transactions to projects`,
      orphanedCount: orphanedImageTransactions.length,
      assignedCount,
      remainingOrphaned: orphanedImageTransactions.length - assignedCount,
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

    // Get all image transactions without projectId
    const orphanedImageTransactions = await prisma.creditTransaction.findMany({
      where: {
        creditsId: credits.id,
        type: 'image',
        projectId: null,
      },
    });

    // Get all projects with scenes that have imageUrl
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        scenes: {
          where: {
            imageUrl: { not: null },
          },
        },
      },
    });

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

      const existingTransactions = await prisma.creditTransaction.count({
        where: {
          creditsId: credits.id,
          type: 'image',
          projectId: project.id,
        },
      });

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
