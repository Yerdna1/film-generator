import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

// POST - Create new character
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
      name,
      description,
      visualDescription,
      personality,
      masterPrompt,
      imageUrl,
      voiceId,
      voiceName,
    } = body;

    const character = await prisma.character.create({
      data: {
        projectId,
        name: name || 'New Character',
        description: description || '',
        visualDescription: visualDescription || '',
        personality: personality || '',
        masterPrompt: masterPrompt || '',
        imageUrl,
        voiceId,
        voiceName,
      },
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    );
  }
}
