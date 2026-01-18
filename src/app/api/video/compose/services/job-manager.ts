// Video Composition - Job Management Service

import { prisma } from '@/lib/db/prisma';
import type { CompositionCost } from '../types';

/**
 * Create a new video composition job
 */
export async function createCompositionJob(params: {
  projectId: string;
  userId: string;
  outputFormat: 'mp4' | 'draft' | 'both';
  resolution: 'sd' | 'hd' | '4k';
  includeMusic: boolean;
  includeCaptions: boolean;
  cost: CompositionCost;
}) {
  return await prisma.videoCompositionJob.create({
    data: {
      projectId: params.projectId,
      userId: params.userId,
      status: 'processing',
      outputFormat: params.outputFormat,
      resolution: params.resolution,
      includeMusic: params.includeMusic,
      includeCaptions: params.includeCaptions,
      creditsCost: params.cost.credits,
      realCost: params.cost.realCost,
      startedAt: new Date(),
    },
  });
}

/**
 * Update job with successful completion
 */
export async function updateJobSuccess(params: {
  jobId: string;
  projectId: string;
  videoUrl?: string | null;
  draftUrl?: string | null;
  srtContent?: string | null;
  duration?: number;
  fileSize?: number;
}) {
  // Update job with results
  await prisma.videoCompositionJob.update({
    where: { id: params.jobId },
    data: {
      status: 'complete',
      progress: 100,
      videoUrl: params.videoUrl || null,
      draftUrl: params.draftUrl || null,
      srtUrl: params.srtContent ? `data:text/plain;base64,${Buffer.from(params.srtContent).toString('base64')}` : null,
      duration: params.duration || 0,
      fileSize: params.fileSize || 0,
      completedAt: new Date(),
    },
  });

  // Also save to project for persistence after page refresh
  await prisma.project.update({
    where: { id: params.projectId },
    data: {
      renderedVideoUrl: params.videoUrl || null,
      renderedDraftUrl: params.draftUrl || null,
    },
  });
}

/**
 * Update job with error
 */
export async function updateJobError(jobId: string, errorMessage: string) {
  await prisma.videoCompositionJob.update({
    where: { id: jobId },
    data: {
      status: 'error',
      errorMessage,
      completedAt: new Date(),
    },
  });
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string, userId: string) {
  const job = await prisma.videoCompositionJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return null;
  }

  if (job.userId !== userId) {
    return null;
  }

  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    phase: job.phase,
    videoUrl: job.videoUrl,
    draftUrl: job.draftUrl,
    srtUrl: job.srtUrl,
    duration: job.duration,
    fileSize: job.fileSize,
    error: job.errorMessage,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  };
}

/**
 * Get latest job for a project
 */
export async function getProjectJob(projectId: string, userId: string) {
  const job = await prisma.videoCompositionJob.findFirst({
    where: { projectId, userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!job) {
    return null;
  }

  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    phase: job.phase,
    videoUrl: job.videoUrl,
    draftUrl: job.draftUrl,
    srtUrl: job.srtUrl,
    duration: job.duration,
    fileSize: job.fileSize,
    error: job.errorMessage,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  };
}
