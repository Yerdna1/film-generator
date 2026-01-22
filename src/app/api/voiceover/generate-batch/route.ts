import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import { prisma } from '@/lib/db/prisma';
import { optionalAuth, requireCredits } from '@/lib/api';
import { COSTS } from '@/lib/services/credits';
import { rateLimit } from '@/lib/services/rate-limit';
import { getProviderConfig } from '@/lib/providers';

export const maxDuration = 300; // 5 minutes for batch creation

interface VoiceoverBatchRequest {
  projectId: string;
  audioLines: Array<{
    lineId: string;
    sceneId: string;
    sceneNumber: number;
    text: string;
    characterId: string;
    voiceId: string;
  }>;
  language?: string;
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

    const { projectId, audioLines, language = 'en' }: VoiceoverBatchRequest = await request.json();

    if (!projectId || !audioLines || audioLines.length === 0) {
      return NextResponse.json(
        { error: 'Project ID and audio lines are required' },
        { status: 400 }
      );
    }

    // Check if user has their own API key configured
    const providerConfig = await getProviderConfig({
      userId,
      projectId,
      type: 'tts',
    });

    const userHasOwnApiKey = providerConfig.userHasOwnApiKey;

    console.log(`[Voiceover API] User has own API key: ${userHasOwnApiKey}, provider: ${providerConfig.provider}`);

    // Only check credits if user doesn't have their own API key
    if (!userHasOwnApiKey) {
      const totalCredits = audioLines.length * COSTS.VOICEOVER_LINE;

      const insufficientCredits = await requireCredits(userId, totalCredits);
      if (insufficientCredits) return insufficientCredits;
    } else {
      console.log(`[Voiceover API] Skipping credit check - user has own API key`);
    }

    // Create voiceover generation job
    const job = await prisma.voiceoverGenerationJob.create({
      data: {
        projectId,
        userId,
        status: 'pending',
        totalAudioLines: audioLines.length,
        completedAudioLines: 0,
        failedAudioLines: 0,
        progress: 0,
      },
    });

    // Send event to Inngest
    const eventId = await inngest.send({
      name: 'voiceover/generate.batch',
      data: {
        projectId,
        userId,
        batchId: job.id,
        audioLines,
        language,
        userHasOwnApiKey, // Pass this to Inngest so it knows whether to charge credits
      },
    });

    console.log(`[Voiceover API] Created batch job ${job.id} with event ${eventId} for ${audioLines.length} lines`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      eventId,
      totalLines: audioLines.length,
      usingOwnApiKey: userHasOwnApiKey,
    });

  } catch (error) {
    console.error('Voiceover batch creation error:', error);

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

    const job = await prisma.voiceoverGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      totalAudioLines: job.totalAudioLines,
      completedAudioLines: job.completedAudioLines,
      failedAudioLines: job.failedAudioLines,
      progress: job.progress,
      errorDetails: job.errorDetails,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      audioProvider: job.audioProvider,
      audioModel: job.audioModel,
    });

  } catch (error) {
    console.error('Voiceover job status error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
