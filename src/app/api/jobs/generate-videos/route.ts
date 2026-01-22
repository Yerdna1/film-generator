import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { prisma } from '@/lib/db/prisma';
import { inngest } from '@/lib/inngest/client';
import type { VideoProvider } from '@/types/project';
import { DEFAULT_MODEL_CONFIG, DEFAULT_MODELS } from '@/lib/constants/model-config-defaults';

/**
 * Start a background video generation job using Inngest
 */
export const POST = withAuth(async (request, _, context) => {
  const { userId } = context;

  try {
    const body = await request.json();
    const { projectId, videoMode = 'normal', limit, sceneIds } = body;

    // Validate project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId },
          {
            members: {
              some: {
                userId,
                role: { in: ['admin', 'collaborator'] }
              }
            }
          }
        ]
      },
      include: {
        scenes: {
          where: {
            imageUrl: { not: null }
          },
          select: {
            id: true,
            number: true,
            imageUrl: true,
            videoUrl: true,
            imageToVideoPrompt: true
          },
          orderBy: { number: 'asc' }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get scenes to process
    let scenesToProcess;

    if (sceneIds && sceneIds.length > 0) {
      // Specific scenes requested (single or multiple)
      scenesToProcess = project.scenes.filter(s => sceneIds.includes(s.id));

      if (scenesToProcess.length === 0) {
        return NextResponse.json(
          { error: 'No valid scenes found' },
          { status: 400 }
        );
      }

      // Check if all selected scenes have images
      const scenesWithoutImages = scenesToProcess.filter(s => !s.imageUrl);
      if (scenesWithoutImages.length > 0) {
        return NextResponse.json(
          { error: `${scenesWithoutImages.length} scene(s) do not have images yet` },
          { status: 400 }
        );
      }
    } else {
      // Batch mode - get scenes without videos but with images
      scenesToProcess = project.scenes.filter(s => s.imageUrl && !s.videoUrl);

      if (scenesToProcess.length === 0) {
        return NextResponse.json(
          { error: 'No scenes found that need video generation' },
          { status: 400 }
        );
      }

      // Apply limit if specified
      if (limit && limit > 0 && limit < scenesToProcess.length) {
        scenesToProcess = scenesToProcess.slice(0, limit);
      }
    }

    // Get user's video provider settings
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId },
      select: {
        videoProvider: true,
        kieVideoModel: true
      }
    });

    // Get video provider from project model config or default (no fallback to userApiKeys preferences)
    const projectModelConfig = project.modelConfig as Record<string, any> | null;
    const videoConfig = projectModelConfig?.video || DEFAULT_MODEL_CONFIG.video;
    const videoProvider = videoConfig.provider as VideoProvider;
    const videoModel = videoConfig.model || DEFAULT_MODELS.kieVideoModel;

    // Create job record
    const job = await prisma.videoGenerationJob.create({
      data: {
        projectId,
        userId,
        totalVideos: scenesToProcess.length,
        status: 'pending',
        videoProvider,
        videoModel
      }
    });

    // Trigger Inngest function
    await inngest.send({
      name: 'video/generate.batch',
      data: {
        projectId,
        userId,
        jobId: job.id,
        scenes: scenesToProcess.map(scene => ({
          sceneId: scene.id,
          sceneNumber: scene.number,
          imageUrl: scene.imageUrl as string, // We know it's not null from the where clause
          prompt: scene.imageToVideoPrompt || ''
        })),
        videoMode,
        videoProvider,
        videoModel
      }
    });

    return NextResponse.json({
      jobId: job.id,
      totalVideos: scenesToProcess.length,
      message: scenesToProcess.length === 1 ? 'Video generation started' : 'Video generation job started in background'
    });

  } catch (error) {
    console.error('Error starting video generation job:', error);
    return NextResponse.json(
      { error: 'Failed to start video generation job' },
      { status: 500 }
    );
  }
});

/**
 * Get video generation job status
 */
export const GET = withAuth(async (request, _, context) => {
  const { userId } = context;
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  }

  try {
    const job = await prisma.videoGenerationJob.findFirst({
      where: {
        id: jobId,
        userId
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        totalVideos: job.totalVideos,
        completedVideos: job.completedVideos,
        failedVideos: job.failedVideos,
        errorDetails: job.errorDetails,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }
    });

  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
});