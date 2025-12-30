import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

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

    const scene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        ...(number !== undefined && { number }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(textToImagePrompt !== undefined && { textToImagePrompt }),
        ...(imageToVideoPrompt !== undefined && { imageToVideoPrompt }),
        ...(cameraShot !== undefined && { cameraShot }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(audioUrl !== undefined && { audioUrl }),
        ...(duration !== undefined && { duration }),
        ...(dialogue !== undefined && { dialogue }),
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
    });
  } catch (error) {
    console.error('Error updating scene:', error);
    return NextResponse.json(
      { error: 'Failed to update scene' },
      { status: 500 }
    );
  }
}

// DELETE - Delete scene
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

    await prisma.scene.delete({
      where: { id: sceneId },
    });

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return NextResponse.json(
      { error: 'Failed to delete scene' },
      { status: 500 }
    );
  }
}
