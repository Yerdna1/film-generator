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
 */
export async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  // First check if user is the project owner (admin)
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    return null;
  }

  // Owner is always admin
  if (project.userId === userId) {
    return 'admin';
  }

  // Check ProjectMember table
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
 */
export async function getProjectWithPermissions(
  userId: string,
  projectId: string
) {
  const role = await getUserProjectRole(userId, projectId);

  if (!role) {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      characters: true,
      scenes: {
        orderBy: { number: 'asc' },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    project,
    role,
    permissions: ROLE_PERMISSIONS[role],
  };
}

/**
 * Get all projects a user has access to (owned + shared)
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
 */
export async function getProjectAdmins(projectId: string): Promise<string[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    return [];
  }

  // Owner is always an admin
  const adminIds = [project.userId];

  // Get additional admins from ProjectMember
  const adminMembers = await prisma.projectMember.findMany({
    where: {
      projectId,
      role: 'admin',
    },
    select: { userId: true },
  });

  for (const member of adminMembers) {
    if (!adminIds.includes(member.userId)) {
      adminIds.push(member.userId);
    }
  }

  return adminIds;
}
