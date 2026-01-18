import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

// PUT - Update character
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId, characterId } = await params;

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
      name,
      description,
      visualDescription,
      personality,
      masterPrompt,
      imageUrl,
      voiceId,
      voiceName,
    } = body;

    // Check if character exists first
    const existingCharacter = await prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!existingCharacter) {
      return NextResponse.json(
        { error: 'Character not found. It may have been deleted or not yet saved.' },
        { status: 404 }
      );
    }

    // Verify character belongs to this project
    if (existingCharacter.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Character does not belong to this project' },
        { status: 403 }
      );
    }

    const character = await prisma.character.update({
      where: { id: characterId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(visualDescription !== undefined && { visualDescription }),
        ...(personality !== undefined && { personality }),
        ...(masterPrompt !== undefined && { masterPrompt }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(voiceId !== undefined && { voiceId }),
        ...(voiceName !== undefined && { voiceName }),
      },
    });

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      id: character.id,
      name: character.name,
      description: character.description,
      visualDescription: character.visualDescription,
      personality: character.personality,
      masterPrompt: character.masterPrompt,
      imageUrl: character.imageUrl,
      voiceId: character.voiceId,
      voiceName: character.voiceName,
    });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json(
      { error: 'Failed to update character' },
      { status: 500 }
    );
  }
}

// DELETE - Delete character
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId, characterId } = await params;

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

    await prisma.character.delete({
      where: { id: characterId },
    });

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json(
      { error: 'Failed to delete character' },
      { status: 500 }
    );
  }
}
