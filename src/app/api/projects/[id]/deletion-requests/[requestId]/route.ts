// Individual Deletion Request API
// PUT - Approve or reject deletion request

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, requestId } = await params;
    const { approved, note } = await request.json();

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'approved field must be a boolean' },
        { status: 400 }
      );
    }

    // Check approve requests permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get the deletion request
    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { id: requestId },
      include: {
        project: {
          select: { name: true },
        },
      },
    });

    if (!deletionRequest || deletionRequest.projectId !== projectId) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (deletionRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    // If approved, perform the deletion
    if (approved) {
      try {
        switch (deletionRequest.targetType) {
          case 'project':
            await prisma.project.delete({
              where: { id: deletionRequest.targetId },
            });
            break;
          case 'scene':
            await prisma.scene.delete({
              where: { id: deletionRequest.targetId },
            });
            break;
          case 'character':
            await prisma.character.delete({
              where: { id: deletionRequest.targetId },
            });
            break;
          case 'video':
            // For video, we clear the videoUrl on the scene
            await prisma.scene.update({
              where: { id: deletionRequest.targetId },
              data: { videoUrl: null },
            });
            break;
        }
      } catch (deleteError) {
        console.error('Failed to perform deletion:', deleteError);
        return NextResponse.json(
          { error: 'Failed to perform deletion. The item may have been already deleted.' },
          { status: 500 }
        );
      }
    }

    // Update the request status
    const updatedRequest = await prisma.deletionRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? 'approved' : 'rejected',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });

    // Notify the requester
    await prisma.notification.create({
      data: {
        userId: deletionRequest.requesterId,
        type: approved ? 'request_approved' : 'request_rejected',
        title: approved ? 'Deletion Approved' : 'Deletion Rejected',
        message: approved
          ? `Your request to delete ${deletionRequest.targetType} "${deletionRequest.targetName || deletionRequest.targetId}" has been approved.`
          : `Your request to delete ${deletionRequest.targetType} "${deletionRequest.targetName || deletionRequest.targetId}" has been rejected.${note ? ` Reason: ${note}` : ''}`,
        metadata: {
          projectId,
          projectName: deletionRequest.project.name,
          requestId: deletionRequest.id,
          targetType: deletionRequest.targetType,
          targetName: deletionRequest.targetName,
          approved,
          reviewNote: note,
        },
        actionUrl: deletionRequest.targetType === 'project' ? '/' : `/project/${projectId}`,
      },
    });

    return NextResponse.json({
      request: updatedRequest,
      deleted: approved,
    });
  } catch (error) {
    console.error('Review deletion request error:', error);
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    );
  }
}
