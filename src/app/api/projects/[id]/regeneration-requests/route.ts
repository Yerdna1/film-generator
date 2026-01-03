// Regeneration Requests API
// GET - List regeneration requests for project
// POST - Create regeneration request(s) - supports batch

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission, getProjectAdmins } from '@/lib/permissions';
import { sendNotificationEmail, isEmailConfigured } from '@/lib/services/email';
import type { RegenerationTargetType } from '@/types/collaboration';
import { v4 as uuidv4 } from 'uuid';

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

    // Check view permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canView');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Check if admin (can see all requests)
    const canApprove = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    const isAdmin = canApprove.allowed;

    // Get status filter from query (supports comma-separated values)
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const statusArray = statusFilter ? statusFilter.split(',').map(s => s.trim()) : null;

    // Build where clause
    const whereClause: {
      projectId: string;
      requesterId?: string;
      status?: string | { in: string[] };
    } = isAdmin
      ? { projectId }
      : { projectId, requesterId: session.user.id };

    if (statusArray && statusArray.length > 0) {
      whereClause.status = statusArray.length === 1 ? statusArray[0] : { in: statusArray };
    }

    const requests = await prisma.regenerationRequest.findMany({
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

    // Fetch scene data for each request
    const sceneIds = [...new Set(requests.map(r => r.targetId))];
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

    // Enrich requests with scene data
    const enrichedRequests = requests.map(request => ({
      ...request,
      scene: sceneMap.get(request.targetId) || null,
    }));

    return NextResponse.json({ requests: enrichedRequests });
  } catch (error) {
    console.error('Get regeneration requests error:', error);
    return NextResponse.json(
      { error: 'Failed to get regeneration requests' },
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
    const userId = session.user.id;

    const { id: projectId } = await params;
    const { targetType, sceneIds, reason } = await request.json();

    // Validate target type
    const validTypes: RegenerationTargetType[] = ['image', 'video'];
    if (!validTypes.includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid target type. Must be "image" or "video"' },
        { status: 400 }
      );
    }

    if (!sceneIds || !Array.isArray(sceneIds) || sceneIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one scene ID is required' },
        { status: 400 }
      );
    }

    // Check request regeneration permission
    const permissionCheck = await verifyPermission(userId, projectId, 'canRequestRegeneration');
    if (!permissionCheck.allowed) {
      // If they can regenerate directly, they don't need to request
      const canRegenerate = await verifyPermission(userId, projectId, 'canRegenerate');
      if (canRegenerate.allowed) {
        return NextResponse.json(
          { error: 'As an admin, you cannot request regeneration from yourself. Please purchase more credits to continue.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Verify all scenes exist and belong to this project
    const scenes = await prisma.scene.findMany({
      where: {
        id: { in: sceneIds },
        projectId,
      },
      select: {
        id: true,
        title: true,
        number: true,
      },
    });

    if (scenes.length !== sceneIds.length) {
      return NextResponse.json(
        { error: 'One or more scenes not found or do not belong to this project' },
        { status: 400 }
      );
    }

    // Check for existing pending requests for these scenes
    const existingRequests = await prisma.regenerationRequest.findMany({
      where: {
        projectId,
        targetType,
        targetId: { in: sceneIds },
        status: 'pending',
      },
      select: { targetId: true },
    });

    const existingSceneIds = new Set(existingRequests.map(r => r.targetId));
    const newSceneIds = sceneIds.filter((id: string) => !existingSceneIds.has(id));

    if (newSceneIds.length === 0) {
      return NextResponse.json(
        { error: 'All selected scenes already have pending regeneration requests' },
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

    // Create regeneration requests for each scene
    // Generate a batchId if creating multiple requests (for bulk approval)
    const batchId = newSceneIds.length > 1 ? uuidv4() : null;

    const sceneMap = new Map(scenes.map(s => [s.id, s]));
    const createdRequests = await prisma.$transaction(
      newSceneIds.map((sceneId: string) => {
        const scene = sceneMap.get(sceneId);
        return prisma.regenerationRequest.create({
          data: {
            projectId,
            requesterId: userId,
            targetType,
            targetId: sceneId,
            targetName: scene?.title || `Scene ${scene?.number || 'Unknown'}`,
            reason,
            batchId, // Link requests in a batch for bulk approval
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
      })
    );

    // Notify project admins
    const adminIds = await getProjectAdmins(projectId);
    const requesterName = user?.name || user?.email || 'A team member';
    const sceneCount = newSceneIds.length;
    const sceneNames = newSceneIds
      .map((id: string) => sceneMap.get(id)?.title || `Scene ${sceneMap.get(id)?.number}`)
      .slice(0, 3)
      .join(', ');
    const moreScenes = sceneCount > 3 ? ` and ${sceneCount - 3} more` : '';

    for (const adminId of adminIds) {
      await prisma.notification.create({
        data: {
          userId: adminId,
          type: 'regeneration_request',
          title: 'Regeneration Request',
          message: `${requesterName} requested to regenerate ${targetType}${sceneCount > 1 ? 's' : ''} for: ${sceneNames}${moreScenes}`,
          metadata: {
            projectId,
            projectName: project?.name,
            requestIds: createdRequests.map(r => r.id),
            targetType,
            sceneCount,
            requesterName,
          },
          actionUrl: `/project/${projectId}?tab=approvals`,
        },
      });
    }

    // Send email to admins if configured
    if (isEmailConfigured()) {
      const admins = await prisma.user.findMany({
        where: { id: { in: adminIds } },
        select: { email: true, name: true },
      });

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      for (const admin of admins) {
        if (admin.email) {
          try {
            await sendNotificationEmail({
              to: admin.email,
              subject: `Regeneration Request for "${project?.name}"`,
              title: 'Regeneration Request',
              message: `${requesterName} requested to regenerate ${sceneCount} ${targetType}${sceneCount > 1 ? 's' : ''} for scenes: ${sceneNames}${moreScenes}.${reason ? `\n\nReason: "${reason}"` : ''}`,
              actionUrl: `${appUrl}/project/${projectId}?tab=approvals`,
              actionText: 'Review Request',
            });
          } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
          }
        }
      }
    }

    return NextResponse.json({
      requests: createdRequests,
      created: newSceneIds.length,
      skipped: existingSceneIds.size,
    });
  } catch (error) {
    console.error('Create regeneration request error:', error);
    return NextResponse.json(
      { error: 'Failed to create regeneration request' },
      { status: 500 }
    );
  }
}
