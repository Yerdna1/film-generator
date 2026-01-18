// Get all public projects for the discover page
// Returns projects sorted by most recently updated

import { prisma } from '@/lib/db/prisma';

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
