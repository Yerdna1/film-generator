import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheKeys } from '@/lib/cache';
import { getProjectWithPermissions, verifyPermission, getUserProjectRole } from '@/lib/permissions';

// GET - Fetch single project with all data
// Supports public projects without authentication
// Query params:
//   - includeDialogue=true: Include full dialogue data (default: false for performance)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    const userId = session?.user?.id || null;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const includeDialogue = searchParams.get('includeDialogue') === 'true';

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
        // Only include dialogue if requested (major performance improvement)
        dialogue: includeDialogue ? (s.dialogue as object[]) : [],
        locked: s.locked,
        useTtsInVideo: s.useTtsInVideo,
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
      // Flag to indicate if dialogue was included
      dialogueLoaded: includeDialogue,
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

// PUT - Update project (OPTIMIZED: minimal response, no full project refetch)
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

    // Combined permission + existence check (single query via getUserProjectRole)
    const role = await getUserProjectRole(session.user.id, id);
    if (!role) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }
    if (role === 'reader') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Required: canEdit' },
        { status: 403 }
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

    // If scenes are provided, batch update their order using a transaction
    if (scenes && Array.isArray(scenes) && scenes.length > 0) {
      await prisma.$transaction(
        scenes.map((scene: { id: string; number: number }) =>
          prisma.scene.update({
            where: { id: scene.id },
            data: { number: scene.number },
          })
        )
      );
    }

    // Build update data object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (style !== undefined) updateData.style = style;
    if (masterPrompt !== undefined) updateData.masterPrompt = masterPrompt;
    if (currentStep !== undefined) updateData.currentStep = currentStep;
    if (isComplete !== undefined) updateData.isComplete = isComplete;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (settings !== undefined) updateData.settings = settings;
    if (story !== undefined) updateData.story = story;
    if (voiceSettings !== undefined) updateData.voiceSettings = voiceSettings;
    if (backgroundMusic !== undefined) {
      updateData.settings = { ...((settings as object) || {}), backgroundMusic };
    }

    // Update project WITHOUT fetching related data (major performance gain)
    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        updatedAt: true,
        // Only select fields that were actually updated
        ...(name !== undefined && { name: true }),
        ...(style !== undefined && { style: true }),
        ...(masterPrompt !== undefined && { masterPrompt: true }),
        ...(currentStep !== undefined && { currentStep: true }),
        ...(isComplete !== undefined && { isComplete: true }),
        ...(visibility !== undefined && { visibility: true }),
        ...(settings !== undefined && { settings: true }),
        ...(story !== undefined && { story: true }),
        ...(voiceSettings !== undefined && { voiceSettings: true }),
      },
    });

    // Invalidate projects cache for this user
    cache.invalidate(cacheKeys.userProjects(session.user.id));
    cache.invalidate(cacheKeys.project(id));

    // If visibility changed, invalidate public projects cache
    if (visibility !== undefined) {
      cache.invalidatePattern('public-projects');
    }

    // Return minimal response with only updated fields
    return NextResponse.json({
      success: true,
      id: project.id,
      updatedAt: project.updatedAt.toISOString(),
      ...body, // Echo back the updated fields
    });
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
