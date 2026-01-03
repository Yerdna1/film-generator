// Prompt Edit Requests API
// GET - List prompt edit requests for project
// POST - Create a prompt edit request (automatic when collaborator edits)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission, getProjectAdmins } from '@/lib/permissions';

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status

    // Check view permission
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

    // Build where clause
    const whereClause: Record<string, unknown> = isAdmin
      ? { projectId }
      : { projectId, requesterId: session.user.id };

    if (status) {
      whereClause.status = status;
    }

    const requests = await prisma.promptEditRequest.findMany({
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

    // Add cache headers for SWR deduplication (private, short cache, stale-while-revalidate)
    return NextResponse.json(
      { requests },
      {
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Get prompt edit requests error:', error);
    return NextResponse.json(
      { error: 'Failed to get prompt edit requests' },
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
    const { sceneId, sceneName, fieldName, oldValue, newValue } = await request.json();

    // Validate field name
    const validFields = ['textToImagePrompt', 'imageToVideoPrompt', 'description'];
    if (!validFields.includes(fieldName)) {
      return NextResponse.json(
        { error: 'Invalid field name' },
        { status: 400 }
      );
    }

    if (!sceneId || oldValue === undefined || newValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Don't create request if values are the same
    if (oldValue === newValue) {
      return NextResponse.json(
        { error: 'No changes detected' },
        { status: 400 }
      );
    }

    // Check edit permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canEdit');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Check if user is admin (admins don't need to create edit requests)
    const canApprove = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    if (canApprove.allowed) {
      // Admin - just log the change, don't create a request
      return NextResponse.json({
        request: null,
        message: 'Admin edit - no approval needed'
      });
    }

    // Get project and user info for notification
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    // Create prompt edit request
    const promptEditRequest = await prisma.promptEditRequest.create({
      data: {
        projectId,
        requesterId: session.user.id,
        sceneId,
        sceneName,
        fieldName,
        oldValue,
        newValue,
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

    // Format field name for display
    const fieldLabels: Record<string, string> = {
      textToImagePrompt: 'Text-to-Image Prompt',
      imageToVideoPrompt: 'Image-to-Video Prompt',
      description: 'Description',
    };

    // Notify project admins
    const adminIds = await getProjectAdmins(projectId);
    for (const adminId of adminIds) {
      await prisma.notification.create({
        data: {
          userId: adminId,
          type: 'prompt_edit',
          title: 'Prompt Edit',
          message: `${user?.name || user?.email || 'A collaborator'} edited ${fieldLabels[fieldName]} for scene "${sceneName || sceneId}"`,
          metadata: {
            projectId,
            projectName: project?.name,
            requestId: promptEditRequest.id,
            sceneId,
            sceneName,
            fieldName,
            requesterName: user?.name,
          },
          actionUrl: `/project/${projectId}?tab=approvals`,
        },
      });
    }

    return NextResponse.json({ request: promptEditRequest });
  } catch (error) {
    console.error('Create prompt edit request error:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt edit request' },
      { status: 500 }
    );
  }
}
