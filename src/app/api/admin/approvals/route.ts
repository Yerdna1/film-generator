// Admin Approvals API
// GET - Fetch all pending requests across all projects

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

const ADMIN_EMAIL = 'andrej.galad@gmail.com';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all pending requests across all projects
    const [deletionRequests, regenerationRequests, promptEditRequests] = await Promise.all([
      prisma.deletionRequest.findMany({
        where: { status: 'pending' },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.regenerationRequest.findMany({
        where: { status: { in: ['pending', 'awaiting_final'] } },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.promptEditRequest.findMany({
        where: { status: 'pending' },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // For regeneration requests, also fetch scene info
    const sceneIds = regenerationRequests.map(r => r.targetId);
    const scenes = await prisma.scene.findMany({
      where: { id: { in: sceneIds } },
      select: {
        id: true,
        title: true,
        number: true,
        imageUrl: true,
        videoUrl: true,
      },
    });

    const sceneMap = new Map(scenes.map(s => [s.id, s]));

    const regenerationRequestsWithScenes = regenerationRequests.map(r => ({
      ...r,
      scene: sceneMap.get(r.targetId) || null,
    }));

    return NextResponse.json({
      deletionRequests,
      regenerationRequests: regenerationRequestsWithScenes,
      promptEditRequests,
    });
  } catch (error) {
    console.error('Admin approvals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
