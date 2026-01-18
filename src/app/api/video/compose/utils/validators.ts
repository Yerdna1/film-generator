// Video Composition - Validation Utilities

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkBalance } from '@/lib/services/credits';
import type { Scene } from '@/types/project';
import type { ComposeRequest, CompositionCost } from '../types';

/**
 * Validate the composition request body
 */
export function validateComposeRequest(body: Partial<ComposeRequest>): { valid: boolean; error?: string } {
  if (!body.projectId) {
    return { valid: false, error: 'Project ID is required' };
  }
  return { valid: true };
}

/**
 * Check if user has access to the project (owner or member)
 */
export async function checkProjectAccess(projectId: string, userId: string): Promise<{ hasAccess: boolean; error?: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return { hasAccess: false, error: 'Project not found' };
  }

  if (project.userId === userId) {
    return { hasAccess: true };
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!membership) {
    return { hasAccess: false, error: 'Access denied' };
  }

  return { hasAccess: true };
}

/**
 * Validate that project has scenes with media
 */
export async function validateProjectScenes(projectId: string): Promise<{
  valid: boolean;
  error?: string;
  scenes?: Scene[];
  hasMusic?: boolean;
  captionCount?: number;
}> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      scenes: { orderBy: { number: 'asc' } },
      characters: true,
    },
  });

  if (!project) {
    return { valid: false, error: 'Project not found' };
  }

  const scenes = project.scenes as unknown as Scene[];
  const settings = project.settings as { backgroundMusic?: unknown };

  if (scenes.length === 0) {
    return { valid: false, error: 'No scenes to compose' };
  }

  const hasMedia = scenes.some(s => s.videoUrl || s.imageUrl);
  if (!hasMedia) {
    return { valid: false, error: 'No scene images or videos available' };
  }

  const captionCount = scenes.reduce((sum, s) => sum + (s.captions?.length || 0), 0);

  return {
    valid: true,
    scenes,
    hasMusic: !!settings?.backgroundMusic,
    captionCount,
  };
}

/**
 * Check if user has sufficient credits for composition
 */
export async function checkUserCredits(
  userId: string,
  cost: CompositionCost
): Promise<{ hasEnough: boolean; error?: string; balance?: number; required?: number }> {
  const balanceCheck = await checkBalance(userId, cost.credits);

  if (!balanceCheck.hasEnough) {
    return {
      hasEnough: false,
      error: 'Insufficient credits',
      required: balanceCheck.required,
      balance: balanceCheck.balance,
    };
  }

  return { hasEnough: true };
}

/**
 * Check if user has VectCut endpoint configured
 */
export async function checkVectCutEndpoint(userId: string): Promise<{
  hasEndpoint: boolean;
  endpoint?: string;
  error?: string;
}> {
  const userApiKeys = await prisma.apiKeys.findUnique({
    where: { userId },
  });

  const vectcutEndpoint = userApiKeys?.modalVectcutEndpoint;

  if (!vectcutEndpoint) {
    return {
      hasEndpoint: false,
      error: 'VectCut endpoint not configured. Please add your Modal endpoint URL in Settings.',
    };
  }

  return { hasEndpoint: true, endpoint: vectcutEndpoint };
}
