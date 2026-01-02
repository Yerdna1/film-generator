// Prompt Edit Request Review API
// PATCH - Approve/reject a prompt edit request

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, requestId } = await params;
    const { action, reviewNote } = await request.json();

    // Validate action
    if (!['approve', 'reject', 'revert'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or revert' },
        { status: 400 }
      );
    }

    // Check approve permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get the prompt edit request
    const promptEditRequest = await prisma.promptEditRequest.findFirst({
      where: {
        id: requestId,
        projectId,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!promptEditRequest) {
      return NextResponse.json(
        { error: 'Prompt edit request not found' },
        { status: 404 }
      );
    }

    if (promptEditRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `This request has already been ${promptEditRequest.status}` },
        { status: 400 }
      );
    }

    // Handle revert action - restore old value
    if (action === 'revert') {
      // Update the scene with the old value
      await prisma.scene.update({
        where: { id: promptEditRequest.sceneId },
        data: {
          [promptEditRequest.fieldName]: promptEditRequest.oldValue,
        },
      });

      // Update request status
      const updatedRequest = await prisma.promptEditRequest.update({
        where: { id: requestId },
        data: {
          status: 'reverted',
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNote,
        },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Notify the requester
      await prisma.notification.create({
        data: {
          userId: promptEditRequest.requesterId,
          type: 'prompt_edit_reverted',
          title: 'Prompt Edit Reverted',
          message: `Your edit to "${promptEditRequest.sceneName || 'a scene'}" has been reverted by an admin${reviewNote ? `: ${reviewNote}` : ''}`,
          metadata: {
            projectId,
            requestId,
            sceneId: promptEditRequest.sceneId,
          },
          actionUrl: `/project/${projectId}`,
        },
      });

      return NextResponse.json({ request: updatedRequest });
    }

    // Handle approve/reject
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updatedRequest = await prisma.promptEditRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNote,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // If rejected, revert the scene to old value
    if (action === 'reject') {
      await prisma.scene.update({
        where: { id: promptEditRequest.sceneId },
        data: {
          [promptEditRequest.fieldName]: promptEditRequest.oldValue,
        },
      });
    }

    // Notify the requester
    await prisma.notification.create({
      data: {
        userId: promptEditRequest.requesterId,
        type: action === 'approve' ? 'prompt_edit_approved' : 'prompt_edit_rejected',
        title: action === 'approve' ? 'Prompt Edit Approved' : 'Prompt Edit Rejected',
        message: action === 'approve'
          ? `Your edit to "${promptEditRequest.sceneName || 'a scene'}" has been approved`
          : `Your edit to "${promptEditRequest.sceneName || 'a scene'}" was rejected${reviewNote ? `: ${reviewNote}` : ''}`,
        metadata: {
          projectId,
          requestId,
          sceneId: promptEditRequest.sceneId,
        },
        actionUrl: `/project/${projectId}`,
      },
    });

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error('Review prompt edit request error:', error);
    return NextResponse.json(
      { error: 'Failed to review prompt edit request' },
      { status: 500 }
    );
  }
}
