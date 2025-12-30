import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { COSTS } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';

// Fix missing video cost records by scanning projects for videos without transactions
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's credits record
    let credits = await prisma.credits.findUnique({
      where: { userId },
      include: {
        transactions: {
          where: { type: 'video' },
        },
      },
    });

    if (!credits) {
      return NextResponse.json({ error: 'No credits record found' }, { status: 404 });
    }

    // Get all projects with scenes that have videoUrl
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        scenes: {
          where: {
            videoUrl: { not: null },
          },
        },
      },
    });

    // Count total videos across all projects
    let totalVideosInProjects = 0;
    const projectVideoCounts: { projectId: string; projectName: string; videoCount: number }[] = [];

    for (const project of projects) {
      const videoCount = project.scenes.filter(s => s.videoUrl).length;
      totalVideosInProjects += videoCount;
      if (videoCount > 0) {
        projectVideoCounts.push({
          projectId: project.id,
          projectName: project.name,
          videoCount,
        });
      }
    }

    // Count existing video transactions
    const existingVideoTransactions = credits.transactions.length;

    // Calculate missing transactions
    const missingTransactions = totalVideosInProjects - existingVideoTransactions;

    if (missingTransactions <= 0) {
      return NextResponse.json({
        success: true,
        message: 'No missing video transactions found',
        totalVideosInProjects,
        existingVideoTransactions,
        missingTransactions: 0,
        projectVideoCounts,
      });
    }

    // Create missing transactions
    const videoCreditCost = COSTS.VIDEO_GENERATION; // 20 credits per video
    const videoRealCost = ACTION_COSTS.video.grok; // $0.10 per video

    const totalCreditsToDeduct = missingTransactions * videoCreditCost;
    const totalRealCostToAdd = missingTransactions * videoRealCost;

    // Create transactions for each project proportionally
    const createdTransactions: { projectId: string; count: number }[] = [];

    for (const project of projects) {
      const videosInProject = project.scenes.filter(s => s.videoUrl).length;
      if (videosInProject === 0) continue;

      // Check how many video transactions already exist for this project
      const existingForProject = await prisma.creditTransaction.count({
        where: {
          creditsId: credits.id,
          type: 'video',
          projectId: project.id,
        },
      });

      const missingForProject = videosInProject - existingForProject;

      if (missingForProject > 0) {
        // Create individual transactions for each missing video
        for (let i = 0; i < missingForProject; i++) {
          await prisma.creditTransaction.create({
            data: {
              creditsId: credits.id,
              amount: -videoCreditCost,
              realCost: videoRealCost,
              type: 'video',
              provider: 'grok',
              description: `Grok video generation (retroactive fix)`,
              projectId: project.id,
            },
          });
        }

        createdTransactions.push({
          projectId: project.id,
          count: missingForProject,
        });
      }
    }

    // Update credits totals
    const totalCreated = createdTransactions.reduce((sum, t) => sum + t.count, 0);

    await prisma.credits.update({
      where: { id: credits.id },
      data: {
        balance: { decrement: totalCreated * videoCreditCost },
        totalSpent: { increment: totalCreated * videoCreditCost },
        totalRealCost: { increment: totalCreated * videoRealCost },
        lastUpdated: new Date(),
      },
    });

    // Fetch updated credits
    const updatedCredits = await prisma.credits.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: `Created ${totalCreated} missing video transactions`,
      totalVideosInProjects,
      existingVideoTransactions,
      missingTransactions: totalCreated,
      creditsDeducted: totalCreated * videoCreditCost,
      realCostAdded: totalCreated * videoRealCost,
      newBalance: updatedCredits?.balance,
      newTotalSpent: updatedCredits?.totalSpent,
      newTotalRealCost: updatedCredits?.totalRealCost,
      projectVideoCounts,
      createdTransactions,
    });
  } catch (error) {
    console.error('Error fixing video costs:', error);
    return NextResponse.json(
      { error: 'Failed to fix video costs', details: error instanceof Error ? error.message : String(error) },
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
      include: {
        transactions: {
          where: { type: 'video' },
        },
      },
    });

    if (!credits) {
      return NextResponse.json({ error: 'No credits record found' }, { status: 404 });
    }

    // Get all projects with scenes that have videoUrl
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        scenes: {
          where: {
            videoUrl: { not: null },
          },
        },
      },
    });

    // Count total videos across all projects
    let totalVideosInProjects = 0;
    const projectVideoCounts: { projectId: string; projectName: string; videoCount: number; existingTransactions: number; missing: number }[] = [];

    for (const project of projects) {
      const videoCount = project.scenes.filter(s => s.videoUrl).length;
      totalVideosInProjects += videoCount;

      // Count existing transactions for this project
      const existingForProject = await prisma.creditTransaction.count({
        where: {
          creditsId: credits.id,
          type: 'video',
          projectId: project.id,
        },
      });

      if (videoCount > 0) {
        projectVideoCounts.push({
          projectId: project.id,
          projectName: project.name,
          videoCount,
          existingTransactions: existingForProject,
          missing: videoCount - existingForProject,
        });
      }
    }

    // Count existing video transactions
    const existingVideoTransactions = credits.transactions.length;
    const missingTransactions = totalVideosInProjects - existingVideoTransactions;

    const videoCreditCost = COSTS.VIDEO_GENERATION;
    const videoRealCost = ACTION_COSTS.video.grok;

    return NextResponse.json({
      preview: true,
      message: 'Preview of video cost fix (no changes made)',
      totalVideosInProjects,
      existingVideoTransactions,
      missingTransactions: Math.max(0, missingTransactions),
      wouldDeductCredits: Math.max(0, missingTransactions) * videoCreditCost,
      wouldAddRealCost: Math.max(0, missingTransactions) * videoRealCost,
      currentBalance: credits.balance,
      currentTotalSpent: credits.totalSpent,
      currentTotalRealCost: credits.totalRealCost,
      projectVideoCounts,
      costPerVideo: {
        credits: videoCreditCost,
        realCost: videoRealCost,
      },
    });
  } catch (error) {
    console.error('Error previewing video costs fix:', error);
    return NextResponse.json(
      { error: 'Failed to preview', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
