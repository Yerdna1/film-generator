// Project Collaboration Permission System
// Handles role-based access control for projects

import { prisma } from '@/lib/db/prisma';

export type ProjectRole = 'admin' | 'collaborator' | 'reader';

export interface ProjectPermissions {
  canView: boolean;
  canEdit: boolean;           // Edit prompts, settings
  canRegenerate: boolean;     // Regenerate images/videos (if user has credits)
  canDelete: boolean;         // Direct delete (admin only)
  canRequestDeletion: boolean; // Request deletion (collaborator)
  canRequestRegeneration: boolean; // Request regeneration when no credits (collaborator)
  canManageMembers: boolean;  // Invite/remove members
  canApproveRequests: boolean; // Approve deletion/regeneration requests
}

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<ProjectRole, ProjectPermissions> = {
  admin: {
    canView: true,
    canEdit: true,
    canRegenerate: true,
    canDelete: true,
    canRequestDeletion: false, // Admin doesn't need to request
    canRequestRegeneration: false, // Admin regenerates directly
    canManageMembers: true,
    canApproveRequests: true,
  },
  collaborator: {
    canView: true,
    canEdit: true,
    canRegenerate: true, // Can regenerate if they have credits
    canDelete: false,
    canRequestDeletion: true,
    canRequestRegeneration: true, // Can request if no credits
    canManageMembers: false,
    canApproveRequests: false,
  },
  reader: {
    canView: true,
    canEdit: false,
    canRegenerate: false,
    canDelete: false,
    canRequestDeletion: false,
    canRequestRegeneration: false,
    canManageMembers: false,
    canApproveRequests: false,
  },
};

/**
 * Get user's role for a specific project
 * Checks both ownership (legacy userId) and ProjectMember table
 * For public projects, returns 'reader' role if user has no specific access
 */
export async function getUserProjectRole(
  userId: string | null,
  projectId: string
): Promise<ProjectRole | null> {
  // First check if user is the project owner (admin)
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { userId: true, visibility: true },
  });

  if (!project) {
    return null;
  }

  // Owner is always admin
  if (userId && project.userId === userId) {
    return 'admin';
  }

  // Check ProjectMember table for logged-in users
  if (userId) {
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: { role: true },
    });

    if (membership) {
      return membership.role as ProjectRole;
    }
  }

  // Public projects grant reader access to anyone
  if (project.visibility === 'public') {
    return 'reader';
  }

  return null;
}

/**
 * Check if user has a specific permission for a project
 */
export async function checkPermission(
  userId: string,
  projectId: string,
  permission: keyof ProjectPermissions
): Promise<boolean> {
  const role = await getUserProjectRole(userId, projectId);

  if (!role) {
    return false;
  }

  return ROLE_PERMISSIONS[role][permission];
}

/**
 * Get project with user's role and permissions
 * Returns null if user has no access
 * userId can be null for public project access
 *
 * OPTIMIZED: Single query fetches project + membership together,
 * avoiding N+1 query pattern (previously 3 queries, now 1)
 */
export async function getProjectWithPermissions(
  userId: string | null,
  projectId: string
) {
  // Single query to get project with optional membership data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      characters: true,
      scenes: {
        orderBy: { number: 'asc' },
      },
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      // Include membership for the current user (if logged in)
      ...(userId && {
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      }),
    },
  });

  if (!project) {
    return null;
  }

  // Determine role from single query result
  let role: ProjectRole | null = null;

  // Owner is always admin
  if (userId && project.userId === userId) {
    role = 'admin';
  }
  // Check membership from included data
  else if (userId && 'members' in project && Array.isArray(project.members) && project.members.length > 0) {
    role = project.members[0].role as ProjectRole;
  }
  // Public projects grant reader access to anyone
  else if (project.visibility === 'public') {
    role = 'reader';
  }

  if (!role) {
    return null;
  }

  // Remove members from project object before returning (internal use only)
  const { members: _members, ...projectWithoutMembers } = project as typeof project & { members?: { role: string }[] };

  return {
    project: projectWithoutMembers,
    role,
    permissions: ROLE_PERMISSIONS[role],
    isPublic: project.visibility === 'public',
  };
}

/**
 * Get all projects a user has access to (owned + shared)
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

  // Helper to check if a URL is actually a URL (not base64 data)
  const isValidUrl = (url: string | null): boolean => {
    if (!url) return false;
    // Base64 data URLs start with "data:" and are very long
    // Valid URLs start with http:// or https://
    return url.startsWith('http://') || url.startsWith('https://');
  };

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

/**
 * Verify user can perform a specific action and return appropriate error
 */
export async function verifyPermission(
  userId: string,
  projectId: string,
  permission: keyof ProjectPermissions
): Promise<{ allowed: true } | { allowed: false; error: string; status: number }> {
  const role = await getUserProjectRole(userId, projectId);

  if (!role) {
    return {
      allowed: false,
      error: 'Project not found or access denied',
      status: 404,
    };
  }

  const permissions = ROLE_PERMISSIONS[role];

  if (!permissions[permission]) {
    // Special case: if they can request deletion instead of direct delete
    if (permission === 'canDelete' && permissions.canRequestDeletion) {
      return {
        allowed: false,
        error: 'Deletion requires admin approval. Please submit a deletion request.',
        status: 403,
      };
    }

    return {
      allowed: false,
      error: `Insufficient permissions. Required: ${permission}`,
      status: 403,
    };
  }

  return { allowed: true };
}

/**
 * Get project admins for notification purposes
 *
 * OPTIMIZED: Single query fetches owner + admin members together
 */
export async function getProjectAdmins(projectId: string): Promise<string[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      members: {
        where: { role: 'admin' },
        select: { userId: true },
      },
    },
  });

  if (!project) {
    return [];
  }

  // Owner is always an admin, add any additional admin members
  const adminIds = new Set([project.userId]);
  for (const member of project.members) {
    adminIds.add(member.userId);
  }

  return Array.from(adminIds);
}

/**
 * Get all public projects for the discover page
 * Returns projects sorted by most recently updated
 */
export async function getPublicProjects(options?: {
  limit?: number;
  offset?: number;
  excludeUserId?: string; // Exclude projects owned by this user (for discover page)
}) {
  const { limit = 50, offset = 0, excludeUserId } = options || {};

  const publicProjects = await prisma.project.findMany({
    where: {
      visibility: 'public',
      ...(excludeUserId && { userId: { not: excludeUserId } }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      scenes: {
        orderBy: { number: 'asc' },
        take: 1, // Just get first scene for thumbnail
        select: {
          imageUrl: true,
        },
      },
      _count: {
        select: {
          scenes: true,
          characters: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  // Get total count for pagination
  const totalCount = await prisma.project.count({
    where: {
      visibility: 'public',
      ...(excludeUserId && { userId: { not: excludeUserId } }),
    },
  });

  return {
    projects: publicProjects.map((project) => ({
      id: project.id,
      name: project.name,
      style: project.style,
      story: project.story as { title?: string; concept?: string; genre?: string },
      visibility: project.visibility,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: project.user,
      thumbnailUrl: project.scenes[0]?.imageUrl || null,
      scenesCount: project._count.scenes,
      charactersCount: project._count.characters,
    })),
    totalCount,
    hasMore: offset + publicProjects.length < totalCount,
  };
}
