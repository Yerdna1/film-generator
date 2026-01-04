import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheKeys } from '@/lib/cache';
import { verifyPermission, getProjectAdmins } from '@/lib/permissions';

// PUT - Update scene
export async function PUT(
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

    // Verify user has edit permission (owner, admin, or collaborator)
    const permCheck = await verifyPermission(session.user.id, projectId, 'canEdit');
    if (!permCheck.allowed) {
      return NextResponse.json(
        { error: permCheck.error },
        { status: permCheck.status }
      );
    }

    // Check if user is admin (can approve requests = is admin)
    const isAdminCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    const isAdmin = isAdminCheck.allowed;

    // Get the project for cache invalidation (owner's cache)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get current scene values before update (for tracking changes and locked check)
    const currentScene = await prisma.scene.findUnique({
      where: { id: sceneId },
      select: {
        title: true,
        description: true,
        textToImagePrompt: true,
        imageToVideoPrompt: true,
        locked: true,
        imageUpdatedAt: true,
      },
    });

    const body = await request.json();

    // Check if scene is locked - only allow dialogue/audio updates on locked scenes
    if (currentScene?.locked) {
      const allowedFields = ['dialogue', 'audioUrl', 'useTtsInVideo'];
      const updateFields = Object.keys(body).filter(k => body[k] !== undefined);
      const hasDisallowedFields = updateFields.some(f => !allowedFields.includes(f));

      if (hasDisallowedFields) {
        return NextResponse.json(
          {
            error: 'Scene is locked',
            locked: true,
            message: 'This scene is locked. Only voiceover/dialogue changes are allowed.'
          },
          { status: 423 }  // 423 Locked status code
        );
      }
    }
    const {
      number,
      title,
      description,
      textToImagePrompt,
      imageToVideoPrompt,
      cameraShot,
      imageUrl,
      videoUrl,
      audioUrl,
      duration,
      dialogue,
      useTtsInVideo,
    } = body;

    const scene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        ...(number !== undefined && { number }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(textToImagePrompt !== undefined && { textToImagePrompt }),
        ...(imageToVideoPrompt !== undefined && { imageToVideoPrompt }),
        ...(cameraShot !== undefined && { cameraShot }),
        ...(imageUrl !== undefined && { imageUrl, imageUpdatedAt: new Date() }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(audioUrl !== undefined && { audioUrl }),
        ...(duration !== undefined && { duration }),
        ...(dialogue !== undefined && { dialogue }),
        ...(useTtsInVideo !== undefined && { useTtsInVideo }),
      },
    });

    // Track prompt changes for collaborators (non-admins)
    if (!isAdmin && currentScene) {
      const trackedFields = [
        { field: 'textToImagePrompt', oldVal: currentScene.textToImagePrompt, newVal: textToImagePrompt },
        { field: 'imageToVideoPrompt', oldVal: currentScene.imageToVideoPrompt, newVal: imageToVideoPrompt },
        { field: 'description', oldVal: currentScene.description, newVal: description },
      ];

      // Get user info and admin IDs ONCE before the loop (fixes N+1 query)
      const [user, adminIds] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true },
        }),
        getProjectAdmins(projectId),
      ]);

      // Format field name for notification
      const fieldLabels: Record<string, string> = {
        textToImagePrompt: 'Text-to-Image Prompt',
        imageToVideoPrompt: 'Image-to-Video Prompt',
        description: 'Description',
      };

      // Collect all notifications to batch create
      const notificationsToCreate: {
        userId: string;
        type: string;
        title: string;
        message: string;
        metadata: object;
        actionUrl: string;
      }[] = [];

      for (const { field, oldVal, newVal } of trackedFields) {
        // Only track if the field was updated and the value actually changed
        if (newVal !== undefined && oldVal !== newVal) {
          // Create prompt edit record
          const editRequest = await prisma.promptEditRequest.create({
            data: {
              projectId,
              requesterId: session.user.id,
              sceneId,
              sceneName: scene.title,
              fieldName: field,
              oldValue: oldVal || '',
              newValue: newVal || '',
            },
          });

          // Collect notifications for all admins
          for (const adminId of adminIds) {
            notificationsToCreate.push({
              userId: adminId,
              type: 'prompt_edit',
              title: 'Prompt Edit',
              message: `${user?.name || user?.email || 'A collaborator'} edited ${fieldLabels[field]} for scene "${scene.title}"`,
              metadata: {
                projectId,
                projectName: project.name,
                requestId: editRequest.id,
                sceneId,
                sceneName: scene.title,
                fieldName: field,
                requesterName: user?.name,
              },
              actionUrl: `/approvals`,
            });
          }
        }
      }

      // Batch create all notifications in a single query
      if (notificationsToCreate.length > 0) {
        await prisma.notification.createMany({
          data: notificationsToCreate,
        });
      }
    }

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    // Invalidate projects cache for the owner so next fetch gets fresh data
    cache.invalidate(cacheKeys.userProjects(project.userId));

    return NextResponse.json({
      id: scene.id,
      number: scene.number,
      title: scene.title,
      description: scene.description,
      textToImagePrompt: scene.textToImagePrompt,
      imageToVideoPrompt: scene.imageToVideoPrompt,
      cameraShot: scene.cameraShot,
      imageUrl: scene.imageUrl,
      videoUrl: scene.videoUrl,
      audioUrl: scene.audioUrl,
      duration: scene.duration,
      dialogue: scene.dialogue as object[],
      locked: scene.locked,
      useTtsInVideo: scene.useTtsInVideo,
      imageUpdatedAt: scene.imageUpdatedAt?.toISOString(),
      videoGeneratedFromImageAt: scene.videoGeneratedFromImageAt?.toISOString(),
    });
  } catch (error) {
    console.error('Error updating scene:', error);
    return NextResponse.json(
      { error: 'Failed to update scene' },
      { status: 500 }
    );
  }
}

// DELETE - Delete scene (admin only - collaborators must request deletion)
export async function DELETE(
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

    // Verify user has delete permission (admin only)
    const permCheck = await verifyPermission(session.user.id, projectId, 'canDelete');
    if (!permCheck.allowed) {
      return NextResponse.json(
        { error: permCheck.error },
        { status: permCheck.status }
      );
    }

    // Get the project for cache invalidation
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await prisma.scene.delete({
      where: { id: sceneId },
    });

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    // Invalidate projects cache for the owner
    cache.invalidate(cacheKeys.userProjects(project.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return NextResponse.json(
      { error: 'Failed to delete scene' },
      { status: 500 }
    );
  }
}
