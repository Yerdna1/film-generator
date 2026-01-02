import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheKeys } from '@/lib/cache';
import { verifyPermission } from '@/lib/permissions';

// POST - Create new scene
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId } = await params;

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

    // Get project for cache invalidation
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

    const body = await request.json();
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
    } = body;

    const scene = await prisma.scene.create({
      data: {
        projectId,
        number: number || 1,
        title: title || 'New Scene',
        description: description || '',
        textToImagePrompt: textToImagePrompt || '',
        imageToVideoPrompt: imageToVideoPrompt || '',
        cameraShot: cameraShot || 'medium',
        imageUrl,
        videoUrl,
        audioUrl,
        duration: duration || 6,
        dialogue: dialogue || [],
      },
    });

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    // Invalidate projects cache for the owner
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating scene:', error);
    return NextResponse.json(
      { error: 'Failed to create scene' },
      { status: 500 }
    );
  }
}

// PUT - Batch update/upsert scenes (safe - does NOT delete existing scenes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId } = await params;

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

    // Get project for cache invalidation
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

    const body = await request.json();
    const { scenes } = body;

    if (!Array.isArray(scenes)) {
      return NextResponse.json(
        { error: 'Invalid scenes data' },
        { status: 400 }
      );
    }

    // SAFE: Upsert scenes instead of delete-all-recreate
    // This prevents accidental data loss from partial syncs
    // Use $transaction with parallel operations for efficiency (reduces DB round-trips)
    const updatedScenes = await prisma.$transaction(async (tx) => {
      const operations = scenes.map((scene) => {
        if (scene.id) {
          // Update existing scene
          return tx.scene.update({
            where: { id: scene.id },
            data: {
              number: scene.number || 1,
              title: scene.title || 'Scene',
              description: scene.description || '',
              textToImagePrompt: scene.textToImagePrompt || '',
              imageToVideoPrompt: scene.imageToVideoPrompt || '',
              cameraShot: scene.cameraShot || 'medium',
              imageUrl: scene.imageUrl,
              videoUrl: scene.videoUrl,
              audioUrl: scene.audioUrl,
              duration: scene.duration || 6,
              dialogue: scene.dialogue || [],
            },
          });
        } else {
          // Create new scene (no id provided)
          return tx.scene.create({
            data: {
              projectId,
              number: scene.number || 1,
              title: scene.title || 'Scene',
              description: scene.description || '',
              textToImagePrompt: scene.textToImagePrompt || '',
              imageToVideoPrompt: scene.imageToVideoPrompt || '',
              cameraShot: scene.cameraShot || 'medium',
              imageUrl: scene.imageUrl,
              videoUrl: scene.videoUrl,
              audioUrl: scene.audioUrl,
              duration: scene.duration || 6,
              dialogue: scene.dialogue || [],
            },
          });
        }
      });

      return Promise.all(operations);
    });

    // Transform results for response
    const transformedScenes = updatedScenes.map((scene) => ({
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
    }));

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    // Invalidate projects cache for the owner
    cache.invalidate(cacheKeys.userProjects(project.userId));

    return NextResponse.json(transformedScenes);
  } catch (error) {
    console.error('Error updating scenes:', error);
    return NextResponse.json(
      { error: 'Failed to update scenes' },
      { status: 500 }
    );
  }
}
