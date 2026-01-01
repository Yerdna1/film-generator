import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

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

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
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

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
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
    const updatedScenes = [];
    for (const scene of scenes) {
      if (scene.id) {
        // Update existing scene
        const updated = await prisma.scene.update({
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
        updatedScenes.push({
          id: updated.id,
          number: updated.number,
          title: updated.title,
          description: updated.description,
          textToImagePrompt: updated.textToImagePrompt,
          imageToVideoPrompt: updated.imageToVideoPrompt,
          cameraShot: updated.cameraShot,
          imageUrl: updated.imageUrl,
          videoUrl: updated.videoUrl,
          audioUrl: updated.audioUrl,
          duration: updated.duration,
          dialogue: updated.dialogue as object[],
        });
      } else {
        // Create new scene (no id provided)
        const created = await prisma.scene.create({
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
        updatedScenes.push({
          id: created.id,
          number: created.number,
          title: created.title,
          description: created.description,
          textToImagePrompt: created.textToImagePrompt,
          imageToVideoPrompt: created.imageToVideoPrompt,
          cameraShot: created.cameraShot,
          imageUrl: created.imageUrl,
          videoUrl: created.videoUrl,
          audioUrl: created.audioUrl,
          duration: created.duration,
          dialogue: created.dialogue as object[],
        });
      }
    }

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(updatedScenes);
  } catch (error) {
    console.error('Error updating scenes:', error);
    return NextResponse.json(
      { error: 'Failed to update scenes' },
      { status: 500 }
    );
  }
}
