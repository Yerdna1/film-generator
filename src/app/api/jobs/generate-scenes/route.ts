import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { inngest } from '@/lib/inngest/client';
import { checkBalance, COSTS } from '@/lib/services/credits';

export const maxDuration = 30;

// POST - Start a background scene generation job
export async function POST(request: NextRequest) {
  try {
    console.log('[Jobs/Scenes] POST request received');

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, story, characters, style, sceneCount } = body;
    console.log('[Jobs/Scenes] Request:', { projectId, sceneCount, charactersCount: characters?.length });

    if (!projectId || !story || !characters || !sceneCount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check credit balance
    const totalCost = COSTS.SCENE_GENERATION * sceneCount;
    const balanceCheck = await checkBalance(session.user.id, totalCost);
    if (!balanceCheck.hasEnough) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: balanceCheck.required,
        balance: balanceCheck.balance,
        needsPurchase: true,
      }, { status: 402 });
    }

    // Check for existing active job
    const existingJob = await prisma.sceneGenerationJob.findFirst({
      where: {
        projectId,
        userId: session.user.id,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existingJob) {
      return NextResponse.json({
        error: 'A scene generation job is already running',
        jobId: existingJob.id,
      }, { status: 409 });
    }

    // Create job record
    console.log('[Jobs/Scenes] Creating job record...');
    const job = await prisma.sceneGenerationJob.create({
      data: {
        projectId,
        userId: session.user.id,
        totalScenes: sceneCount,
        status: 'pending',
      },
    });
    console.log('[Jobs/Scenes] Job created:', job.id);

    // Send event to Inngest
    console.log('[Jobs/Scenes] Sending event to Inngest...');
    await inngest.send({
      name: 'scenes/generate.batch',
      data: {
        projectId,
        userId: session.user.id,
        jobId: job.id,
        story,
        characters,
        style,
        sceneCount,
      },
    });
    console.log('[Jobs/Scenes] Inngest event sent successfully');

    return NextResponse.json({
      jobId: job.id,
      totalScenes: sceneCount,
      message: 'Scene generation started in background',
    });
  } catch (error) {
    console.error('[Jobs/Scenes] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to start scene generation: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET - Get job status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const projectId = searchParams.get('projectId');

    if (jobId) {
      const job = await prisma.sceneGenerationJob.findUnique({
        where: { id: jobId, userId: session.user.id },
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json(job);
    }

    if (projectId) {
      const jobs = await prisma.sceneGenerationJob.findMany({
        where: {
          projectId,
          userId: session.user.id,
          status: { in: ['pending', 'processing'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      return NextResponse.json({ activeJob: jobs[0] || null });
    }

    return NextResponse.json({ error: 'Job ID or Project ID required' }, { status: 400 });
  } catch (error) {
    console.error('[Jobs/Scenes] Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
