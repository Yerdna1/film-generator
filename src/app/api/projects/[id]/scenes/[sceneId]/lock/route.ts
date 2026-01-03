import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheKeys } from '@/lib/cache';
import { verifyPermission } from '@/lib/permissions';

// POST - Toggle scene lock status (admin/owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId, sceneId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin/owner can toggle lock (canApproveRequests permission)
    const permCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    if (!permCheck.allowed) {
      return NextResponse.json(
        { error: 'Only project owner or admin can lock/unlock scenes' },
        { status: 403 }
      );
    }

    // Get current scene
    const currentScene = await prisma.scene.findUnique({
      where: { id: sceneId },
      select: { locked: true, projectId: true },
    });

    if (!currentScene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    // Verify scene belongs to this project
    if (currentScene.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Scene not found in this project' },
        { status: 404 }
      );
    }

    // Parse request body - allow explicit lock value or toggle
    const body = await request.json().catch(() => ({}));
    const newLockedState = body.locked !== undefined ? body.locked : !currentScene.locked;

    // Toggle lock status
    const scene = await prisma.scene.update({
      where: { id: sceneId },
      data: { locked: newLockedState },
    });

    // Get project for cache invalidation
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (project) {
      cache.invalidate(cacheKeys.userProjects(project.userId));
    }

    return NextResponse.json({
      id: scene.id,
      locked: scene.locked,
      message: scene.locked ? 'Scene locked successfully' : 'Scene unlocked successfully',
    });
  } catch (error) {
    console.error('Error toggling scene lock:', error);
    return NextResponse.json(
      { error: 'Failed to toggle scene lock' },
      { status: 500 }
    );
  }
}
