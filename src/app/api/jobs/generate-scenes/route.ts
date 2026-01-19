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
      console.log('[Jobs/Scenes] Unauthorized: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.log('[Jobs/Scenes] Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { projectId, story, characters, style, sceneCount, skipCreditCheck = false } = body;
    console.log('[Jobs/Scenes] Request:', { projectId, sceneCount, charactersCount: characters?.length, skipCreditCheck });

    if (!projectId || !story || !characters || !sceneCount) {
      console.log('[Jobs/Scenes] Bad Request: Missing fields', { projectId, hasStory: !!story, hasCharacters: !!characters, sceneCount });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check credit balance (skip if user provides own API key)
    if (!skipCreditCheck) {
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
    try {
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
          skipCreditCheck,
        },
      });
      console.log('[Jobs/Scenes] Inngest event sent successfully');
    } catch (inngestError) {
      console.error('[Jobs/Scenes] Failed to send to Inngest:', inngestError);

      // Fallback: Generate scenes synchronously when Inngest is not available
      console.log('[Jobs/Scenes] Falling back to synchronous scene generation...');

      // Import the synchronous generation function
      const { generateScenesSynchronously } = await import('@/lib/inngest/functions/generate-scenes');

      // Update job status to processing
      await prisma.sceneGenerationJob.update({
        where: { id: job.id },
        data: { status: 'processing' },
      });

      // Generate scenes synchronously
      await generateScenesSynchronously({
        projectId,
        userId: session.user.id,
        jobId: job.id,
        story,
        characters,
        style,
        sceneCount,
        skipCreditCheck,
      });

      console.log('[Jobs/Scenes] Synchronous generation completed');
    }

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

// DELETE - Cancel a scene generation job
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Find the job
    const job = await prisma.sceneGenerationJob.findUnique({
      where: {
        id: jobId,
        userId: session.user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only allow cancellation of pending or processing jobs
    if (job.status !== 'pending' && job.status !== 'processing') {
      return NextResponse.json({
        error: 'Job cannot be cancelled',
        status: job.status
      }, { status: 400 });
    }

    // Update job status to cancelled
    const updatedJob = await prisma.sceneGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorDetails: 'Cancelled by user',
      },
    });

    console.log(`[Jobs/Scenes] Cancelled job ${jobId}`);

    return NextResponse.json({
      message: 'Job cancelled successfully',
      job: updatedJob,
    });
  } catch (error) {
    console.error('[Jobs/Scenes] Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
