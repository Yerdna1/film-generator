// Get user's role for a specific project
// Checks both ownership (legacy userId) and ProjectMember table
// For public projects, returns 'reader' role if user has no specific access

import { prisma } from '@/lib/db/prisma';
import type { ProjectRole } from './types';

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
