import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import { prisma } from '@/lib/db/prisma';
import { optionalAuth, requireCredits } from '@/lib/api';
import { COSTS } from '@/lib/services/credits';
import { rateLimit } from '@/lib/services/rate-limit';
import { getProviderConfig } from '@/lib/providers';

export const maxDuration = 300; // 5 minutes for music generation

interface MusicBatchRequest {
  projectId: string;
  prompt: string;
  instrumental?: boolean;
  title?: string;
}

export async function POST(request: NextRequest) {
  // SECURITY: Rate limit to prevent abuse
  const rateLimitResult = await rateLimit(request, 'generation');
  if (rateLimitResult) return rateLimitResult;

  try {
    const authCtx = await optionalAuth();
    const userId = authCtx?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, prompt, instrumental = true, title }: MusicBatchRequest = await request.json();

    if (!projectId || !prompt) {
      return NextResponse.json(
        { error: 'Project ID and prompt are required' },
        { status: 400 }
      );
    }

    // Check if user has their own API key configured
    const providerConfig = await getProviderConfig({
      userId,
      projectId,
      type: 'music',
    });

    const userHasOwnApiKey = providerConfig.userHasOwnApiKey;

    console.log(`[Music API] User has own API key: ${userHasOwnApiKey}, provider: ${providerConfig.provider}`);

    // Only check credits if user doesn't have their own API key
    if (!userHasOwnApiKey) {
      const insufficientCredits = await requireCredits(userId, COSTS.MUSIC_GENERATION || 10);
      if (insufficientCredits) return insufficientCredits;
    } else {
      console.log(`[Music API] Skipping credit check - user has own API key`);
    }

    // Create music generation job
    const job = await prisma.musicGenerationJob.create({
      data: {
        projectId,
        userId,
        status: 'pending',
        progress: 0,
        prompt,
        instrumental,
        title,
      },
    });

    // Send event to Inngest
    const eventId = await inngest.send({
      name: 'music/generate.batch',
      data: {
        projectId,
        userId,
        batchId: job.id,
        prompt,
        instrumental,
        title,
        userHasOwnApiKey,
      },
    });

    console.log(`[Music API] Created music job ${job.id} with event ${eventId}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      eventId,
      usingOwnApiKey: userHasOwnApiKey,
    });

  } catch (error) {
    console.error('Music batch creation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to check job status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const job = await prisma.musicGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      errorDetails: job.errorDetails,
      audioUrl: job.audioUrl,
      title: job.title,
      musicProvider: job.musicProvider,
      musicModel: job.musicModel,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });

  } catch (error) {
    console.error('Music job status error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
