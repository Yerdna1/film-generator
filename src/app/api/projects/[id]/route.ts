import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheKeys } from '@/lib/cache';
import { getProjectWithPermissions, verifyPermission, getUserProjectRole } from '@/lib/permissions';

// GET - Fetch single project with all data
// Supports public projects without authentication
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    const userId = session?.user?.id || null;

    // Use permission system to check access (supports null userId for public projects)
    const result = await getProjectWithPermissions(userId, id);

    if (!result) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const { project, role, permissions, isPublic } = result;

    const transformedProject = {
      id: project.id,
      name: project.name,
      userId: project.userId,
      style: project.style,
      masterPrompt: project.masterPrompt,
      currentStep: project.currentStep,
      isComplete: project.isComplete,
      visibility: project.visibility,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      settings: project.settings as object,
      story: project.story as object,
      voiceSettings: project.voiceSettings as object,
      characters: project.characters.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        visualDescription: c.visualDescription,
        personality: c.personality,
        masterPrompt: c.masterPrompt,
        imageUrl: c.imageUrl,
        voiceId: c.voiceId,
        voiceName: c.voiceName,
      })),
      scenes: project.scenes.map((s) => ({
        id: s.id,
        number: s.number,
        title: s.title,
        description: s.description,
        textToImagePrompt: s.textToImagePrompt,
        imageToVideoPrompt: s.imageToVideoPrompt,
        cameraShot: s.cameraShot,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        audioUrl: s.audioUrl,
        duration: s.duration,
        dialogue: s.dialogue as object[],
      })),
      // Rendered video export URLs
      renderedVideoUrl: project.renderedVideoUrl,
      renderedDraftUrl: project.renderedDraftUrl,
      // Include collaboration info
      role,
      permissions,
      isOwner: userId ? project.userId === userId : false,
      isPublic,
      isAuthenticated: !!userId,
      owner: project.user,
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check edit permission
    const permissionCheck = await verifyPermission(session.user.id, id, 'canEdit');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get existing project
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      style,
      masterPrompt,
      currentStep,
      isComplete,
      visibility,
      settings,
      story,
      voiceSettings,
      scenes,
      backgroundMusic,
    } = body;

    // If scenes are provided, update their order (numbers)
    if (scenes && Array.isArray(scenes)) {
      await Promise.all(
        scenes.map((scene: { id: string; number: number }) =>
          prisma.scene.update({
            where: { id: scene.id },
            data: { number: scene.number },
          })
        )
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(style !== undefined && { style }),
        ...(masterPrompt !== undefined && { masterPrompt }),
        ...(currentStep !== undefined && { currentStep }),
        ...(isComplete !== undefined && { isComplete }),
        ...(visibility !== undefined && { visibility }),
        ...(settings !== undefined && { settings }),
        ...(story !== undefined && { story }),
        ...(voiceSettings !== undefined && { voiceSettings }),
        ...(backgroundMusic !== undefined && { settings: { ...((settings as object) || {}), backgroundMusic } }),
      },
      include: {
        characters: true,
        scenes: {
          orderBy: { number: 'asc' },
        },
      },
    });

    const transformedProject = {
      id: project.id,
      name: project.name,
      userId: project.userId,
      style: project.style,
      masterPrompt: project.masterPrompt,
      currentStep: project.currentStep,
      isComplete: project.isComplete,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      settings: project.settings as object,
      story: project.story as object,
      voiceSettings: project.voiceSettings as object,
      characters: project.characters.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        visualDescription: c.visualDescription,
        personality: c.personality,
        masterPrompt: c.masterPrompt,
        imageUrl: c.imageUrl,
        voiceId: c.voiceId,
        voiceName: c.voiceName,
      })),
      scenes: project.scenes.map((s) => ({
        id: s.id,
        number: s.number,
        title: s.title,
        description: s.description,
        textToImagePrompt: s.textToImagePrompt,
        imageToVideoPrompt: s.imageToVideoPrompt,
        cameraShot: s.cameraShot,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        audioUrl: s.audioUrl,
        duration: s.duration,
        dialogue: s.dialogue as object[],
      })),
    };

    // Invalidate projects cache for this user
    cache.invalidate(cacheKeys.userProjects(session.user.id));
    cache.invalidate(cacheKeys.project(id));

    // If visibility changed, invalidate public projects cache
    if (visibility !== undefined) {
      cache.invalidatePattern('public-projects');
      console.log(`[Cache INVALIDATED] Public projects cache after visibility change`);
    }
    console.log(`[Cache INVALIDATED] Projects cache after update`);

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check delete permission
    const permissionCheck = await verifyPermission(session.user.id, id, 'canDelete');
    if (!permissionCheck.allowed) {
      // Check if they can request deletion instead
      const canRequest = await verifyPermission(session.user.id, id, 'canRequestDeletion');
      if (canRequest.allowed) {
        return NextResponse.json(
          {
            error: 'Deletion requires admin approval. Please submit a deletion request.',
            requiresApproval: true,
            canRequestDeletion: true,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get existing project for cache invalidation
    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete project (cascades to characters and scenes)
    await prisma.project.delete({
      where: { id },
    });

    // Invalidate projects cache for project owner and current user
    cache.invalidate(cacheKeys.userProjects(existingProject.userId));
    cache.invalidate(cacheKeys.userProjects(session.user.id));
    cache.invalidate(cacheKeys.project(id));
    console.log(`[Cache INVALIDATED] Projects cache after delete`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
