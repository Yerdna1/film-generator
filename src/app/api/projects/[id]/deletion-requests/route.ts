// Deletion Requests API
// GET - List deletion requests for project
// POST - Create a deletion request

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission, getProjectAdmins } from '@/lib/permissions';
import type { DeletionTargetType } from '@/types/collaboration';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check view permission (admins can see all, others can see their own)
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canView');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Check if admin
    const canApprove = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    const isAdmin = canApprove.allowed;

    // Get deletion requests
    const whereClause = isAdmin
      ? { projectId }
      : { projectId, requesterId: session.user.id };

    const requests = await prisma.deletionRequest.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get deletion requests error:', error);
    return NextResponse.json(
      { error: 'Failed to get deletion requests' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { targetType, targetId, targetName, reason } = await request.json();

    // Validate target type
    const validTypes: DeletionTargetType[] = ['project', 'scene', 'character', 'video'];
    if (!validTypes.includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid target type' },
        { status: 400 }
      );
    }

    if (!targetId) {
      return NextResponse.json(
        { error: 'Target ID is required' },
        { status: 400 }
      );
    }

    // Check request deletion permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canRequestDeletion');
    if (!permissionCheck.allowed) {
      // If they can delete directly, they don't need to request
      const canDelete = await verifyPermission(session.user.id, projectId, 'canDelete');
      if (canDelete.allowed) {
        return NextResponse.json(
          { error: 'You have permission to delete directly. No request needed.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Check for existing pending request for same target
    const existingRequest = await prisma.deletionRequest.findFirst({
      where: {
        projectId,
        targetType,
        targetId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A deletion request for this item is already pending' },
        { status: 400 }
      );
    }

    // Get project and user info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    // Create deletion request
    const deletionRequest = await prisma.deletionRequest.create({
      data: {
        projectId,
        requesterId: session.user.id,
        targetType,
        targetId,
        targetName,
        reason,
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
      },
    });

    // Notify project admins
    const adminIds = await getProjectAdmins(projectId);
    for (const adminId of adminIds) {
      await prisma.notification.create({
        data: {
          userId: adminId,
          type: 'deletion_request',
          title: 'Deletion Request',
          message: `${user?.name || user?.email || 'A team member'} requested to delete ${targetType}: "${targetName || targetId}"`,
          metadata: {
            projectId,
            projectName: project?.name,
            requestId: deletionRequest.id,
            targetType,
            targetId,
            targetName,
            requesterName: user?.name,
          },
          actionUrl: `/project/${projectId}?tab=approvals`,
        },
      });
    }

    return NextResponse.json({ request: deletionRequest });
  } catch (error) {
    console.error('Create deletion request error:', error);
    return NextResponse.json(
      { error: 'Failed to create deletion request' },
      { status: 500 }
    );
  }
}
