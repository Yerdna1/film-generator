import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { inngest } from '@/lib/inngest/client';
import { checkBalance, COSTS } from '@/lib/services/credits';

export const maxDuration = 30;

// POST - Start a background prompt generation job
export async function POST(request: NextRequest) {
  try {
    console.log('[Jobs/Prompt] POST request received at', new Date().toISOString());

    const session = await auth();
    if (!session?.user?.id) {
      console.log('[Jobs/Prompt] Unauthorized: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.log('[Jobs/Prompt] Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { projectId, story, style, settings, skipCreditCheck = false } = body;
    console.log('[Jobs/Prompt] Request:', { projectId, skipCreditCheck });

    if (!projectId || !story || !settings) {
      console.log('[Jobs/Prompt] Bad Request: Missing fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check credit balance (skip if user provides own API key)
    if (!skipCreditCheck) {
      const totalCost = COSTS.SCENE_GENERATION; // Same cost as scene generation
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
    const existingJob = await prisma.promptGenerationJob.findFirst({
      where: {
        projectId,
        userId: session.user.id,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existingJob) {
      return NextResponse.json({
        error: 'A prompt generation job is already running',
        jobId: existingJob.id,
      }, { status: 409 });
    }

    // Create job record
    console.log('[Jobs/Prompt] Creating job record...');
    const job = await prisma.promptGenerationJob.create({
      data: {
        projectId,
        userId: session.user.id,
        status: 'pending',
      },
    });
    console.log('[Jobs/Prompt] Job created:', job.id);

    // Send event to Inngest
    console.log('[Jobs/Prompt] Sending event to Inngest...');
    try {
      await inngest.send({
        name: 'prompt/generate.batch',
        data: {
          projectId,
          userId: session.user.id,
          jobId: job.id,
          story,
          style,
          settings,
          skipCreditCheck,
        },
      });
      console.log('[Jobs/Prompt] Inngest event sent successfully');
    } catch (inngestError) {
      console.error('[Jobs/Prompt] Failed to send to Inngest:', inngestError);

      // Clean up the job record
      await prisma.promptGenerationJob.delete({
        where: { id: job.id },
      });

      return NextResponse.json({
        error: 'Failed to start background job',
      }, { status: 500 });
    }

    return NextResponse.json({
      jobId: job.id,
      message: 'Prompt generation started',
    });
  } catch (error) {
    console.error('[Jobs/Prompt] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to start prompt generation',
    }, { status: 500 });
  }
}

// GET - Check job status
export async function GET(request: NextRequest) {
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

    const job = await prisma.promptGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get the project to check if prompt was generated
    const project = await prisma.project.findUnique({
      where: { id: job.projectId },
      select: { masterPrompt: true },
    });

    return NextResponse.json({
      job: {
        ...job,
        hasMasterPrompt: !!project?.masterPrompt,
      },
    });
  } catch (error) {
    console.error('[Jobs/Prompt] Error checking status:', error);
    return NextResponse.json({
      error: 'Failed to check job status',
    }, { status: 500 });
  }
}

// DELETE - Cancel job
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

    const job = await prisma.promptGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'completed') {
      return NextResponse.json({ error: 'Job already completed' }, { status: 400 });
    }

    // Update job status to cancelled
    await prisma.promptGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorDetails: 'Cancelled by user',
      },
    });

    // Note: We can't actually stop the Inngest function once started,
    // but marking as cancelled will prevent further processing

    return NextResponse.json({ message: 'Job cancelled' });
  } catch (error) {
    console.error('[Jobs/Prompt] Error cancelling job:', error);
    return NextResponse.json({
      error: 'Failed to cancel job',
    }, { status: 500 });
  }
}