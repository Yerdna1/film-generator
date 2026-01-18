// Get all projects a user has access to (owned + shared)
// Includes both full version (with all scenes and characters) and summary version (for dashboard/list views)

import { prisma } from '@/lib/db/prisma';
import type { ProjectRole } from './types';

// Helper to check if a URL is actually a URL (not base64 data)
function isValidUrl(url: string | null): boolean {
  if (!url) return false;
  // Base64 data URLs start with "data:" and are very long
  // Valid URLs start with http:// or https://
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * FULL VERSION - includes all scenes and characters
 * Use getUserAccessibleProjectsSummary for dashboard/list views
 */
export async function getUserAccessibleProjects(userId: string) {
  // Get owned projects
  const ownedProjects = await prisma.project.findMany({
    where: { userId },
    include: {
      characters: true,
      scenes: {
        orderBy: { number: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Get shared projects via ProjectMember
  const sharedMemberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          characters: true,
          scenes: {
            orderBy: { number: 'asc' },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Combine and annotate with roles
  const ownedWithRole = ownedProjects.map((project) => ({
    ...project,
    role: 'admin' as ProjectRole,
    isOwner: true,
  }));

  const sharedWithRole = sharedMemberships
    .filter((m) => m.project.userId !== userId) // Exclude owned projects
    .map((membership) => ({
      ...membership.project,
      role: membership.role as ProjectRole,
      isOwner: false,
      owner: membership.project.user,
    }));

  return [...ownedWithRole, ...sharedWithRole];
}

/**
 * LIGHTWEIGHT VERSION for dashboard/list views
 * Only fetches essential data: basic info, thumbnail, counts
 * ~100x smaller than full version (KB vs MB)
 */
export async function getUserAccessibleProjectsSummary(userId: string) {
  // Get owned projects with minimal data
  const ownedProjects = await prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      userId: true,
      style: true,
      currentStep: true,
      isComplete: true,
      createdAt: true,
      updatedAt: true,
      story: true,
      settings: true,
      masterPrompt: true,
      renderedVideoUrl: true,
      renderedDraftUrl: true,
      // Get first scene for thumbnail only
      scenes: {
        orderBy: { number: 'asc' },
        take: 1,
        select: {
          imageUrl: true,
          videoUrl: true,
        },
      },
      // Get counts instead of full data
      _count: {
        select: {
          scenes: true,
          characters: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Get shared projects with minimal data
  const sharedMemberships = await prisma.projectMember.findMany({
    where: { userId },
    select: {
      role: true,
      project: {
        select: {
          id: true,
          name: true,
          userId: true,
          style: true,
          currentStep: true,
          isComplete: true,
          createdAt: true,
          updatedAt: true,
          story: true,
          settings: true,
          masterPrompt: true,
          renderedVideoUrl: true,
          renderedDraftUrl: true,
          scenes: {
            orderBy: { number: 'asc' },
            take: 1,
            select: {
              imageUrl: true,
              videoUrl: true,
            },
          },
          _count: {
            select: {
              scenes: true,
              characters: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  // Transform owned projects
  const ownedWithRole = ownedProjects.map((project) => {
    const sceneImageUrl = project.scenes[0]?.imageUrl;
    const sceneVideoUrl = project.scenes[0]?.videoUrl;

    return {
      id: project.id,
      name: project.name,
      userId: project.userId,
      style: project.style,
      currentStep: project.currentStep,
      isComplete: project.isComplete,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      story: project.story as { title?: string; concept?: string; genre?: string },
      renderedVideoUrl: project.renderedVideoUrl,
      renderedDraftUrl: project.renderedDraftUrl,
      // Only include URLs, not base64 data (which can be 1MB+)
      thumbnailUrl: isValidUrl(sceneImageUrl) ? sceneImageUrl : null,
      thumbnailVideoUrl: isValidUrl(sceneVideoUrl) ? sceneVideoUrl : null,
      scenesCount: project._count.scenes,
      charactersCount: project._count.characters,
      role: 'admin' as ProjectRole,
      isOwner: true,
      owner: undefined as { id: string; name: string | null; image: string | null } | undefined,
    };
  });

  // Transform shared projects
  const sharedWithRole = sharedMemberships
    .filter((m) => m.project.userId !== userId)
    .map((membership) => {
      const sceneImageUrl = membership.project.scenes[0]?.imageUrl;
      const sceneVideoUrl = membership.project.scenes[0]?.videoUrl;

      return {
        id: membership.project.id,
        name: membership.project.name,
        userId: membership.project.userId,
        style: membership.project.style,
        currentStep: membership.project.currentStep,
        isComplete: membership.project.isComplete,
        createdAt: membership.project.createdAt,
        updatedAt: membership.project.updatedAt,
        story: membership.project.story as { title?: string; concept?: string; genre?: string },
        renderedVideoUrl: membership.project.renderedVideoUrl,
        renderedDraftUrl: membership.project.renderedDraftUrl,
        // Only include URLs, not base64 data (which can be 1MB+)
        thumbnailUrl: isValidUrl(sceneImageUrl) ? sceneImageUrl : null,
        thumbnailVideoUrl: isValidUrl(sceneVideoUrl) ? sceneVideoUrl : null,
        scenesCount: membership.project._count.scenes,
        charactersCount: membership.project._count.characters,
        role: membership.role as ProjectRole,
        isOwner: false,
        owner: membership.project.user,
      };
    });

  return [...ownedWithRole, ...sharedWithRole];
}
