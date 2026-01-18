// Get project admins for notification purposes
//
// OPTIMIZED: Single query fetches owner + admin members together

import { prisma } from '@/lib/db/prisma';

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
