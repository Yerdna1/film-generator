// Get project with user's role and permissions
// Returns null if user has no access
// userId can be null for public project access
//
// OPTIMIZED: Single query fetches project + membership together,
// avoiding N+1 query pattern (previously 3 queries, now 1)

import { prisma } from '@/lib/db/prisma';
import { ROLE_PERMISSIONS } from './role-permissions';
import type { ProjectRole } from './types';

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
