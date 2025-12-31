import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { inngest } from '@/lib/inngest/client';

export const maxDuration = 30;

// POST - Start a batch image generation job
export async function POST(request: NextRequest) {
  try {
    console.log('[Jobs] POST request received');

    const session = await auth();
    console.log('[Jobs] Auth session:', session?.user?.id ? 'authenticated' : 'not authenticated');

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, aspectRatio = '16:9', resolution = '2k', limit } = body;
    console.log('[Jobs] Request body:', { projectId, aspectRatio, resolution, limit });

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get project with scenes and characters
    console.log('[Jobs] Fetching project...');
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
      include: {
        scenes: true,
        characters: true,
      },
    });

    if (!project) {
      console.log('[Jobs] Project not found');
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    console.log('[Jobs] Project found:', project.scenes.length, 'scenes,', project.characters.length, 'characters');

    // Get scenes that need images
    let scenesWithoutImages = project.scenes.filter(s => !s.imageUrl);
    console.log('[Jobs] Scenes without images:', scenesWithoutImages.length);

    if (scenesWithoutImages.length === 0) {
      return NextResponse.json({ error: 'All scenes already have images' }, { status: 400 });
    }

    // Apply limit if specified (for batch generation)
    if (limit && limit > 0 && limit < scenesWithoutImages.length) {
      scenesWithoutImages = scenesWithoutImages.slice(0, limit);
      console.log('[Jobs] Limited to first', limit, 'scenes');
    }

    // Create job record
    console.log('[Jobs] Creating job record...');
    const job = await prisma.imageGenerationJob.create({
      data: {
        projectId,
        userId: session.user.id,
        totalScenes: scenesWithoutImages.length,
        status: 'pending',
      },
    });
    console.log('[Jobs] Job created:', job.id);

    // Get reference images from characters
    const referenceImages = project.characters
      .filter(c => c.imageUrl)
      .map(c => ({
        name: c.name,
        imageUrl: c.imageUrl!,
      }));
    console.log('[Jobs] Reference images:', referenceImages.length);

    // Send event to Inngest
    console.log('[Jobs] Sending event to Inngest...');
    await inngest.send({
      name: 'image/generate.batch',
      data: {
        projectId,
        userId: session.user.id,
        batchId: job.id,
        scenes: scenesWithoutImages.map(s => ({
          sceneId: s.id,
          sceneNumber: s.number,
          prompt: s.textToImagePrompt,
        })),
        aspectRatio,
        resolution,
        referenceImages,
      },
    });
    console.log('[Jobs] Inngest event sent successfully');

    console.log(`[Jobs] Started batch ${job.id} with ${scenesWithoutImages.length} scenes`);

    return NextResponse.json({
      jobId: job.id,
      totalScenes: scenesWithoutImages.length,
      message: 'Image generation started in background',
    });
  } catch (error) {
    console.error('[Jobs] Error starting image generation job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to start image generation: ${errorMessage}` },
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
      // Get specific job
      const job = await prisma.imageGenerationJob.findUnique({
        where: { id: jobId, userId: session.user.id },
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json(job);
    }

    if (projectId) {
      // Get active jobs for project
      try {
        const jobs = await prisma.imageGenerationJob.findMany({
          where: {
            projectId,
            userId: session.user.id,
            status: { in: ['pending', 'processing'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });

        return NextResponse.json({ activeJob: jobs[0] || null });
      } catch (dbError) {
        // If the table doesn't exist yet or other DB error, return no active job
        console.warn('Error checking for active jobs:', dbError);
        return NextResponse.json({ activeJob: null });
      }
    }

    return NextResponse.json({ error: 'Job ID or Project ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
