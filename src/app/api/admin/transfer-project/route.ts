import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, newUserId } = await request.json();

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        scenes: true,
        characters: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const info = {
      projectName: project.name,
      currentOwner: project.userId,
      newOwner: newUserId,
      characters: project.characters.length,
      scenes: project.scenes.length,
      scenesWithImages: project.scenes.filter(s => s.imageUrl).length,
    };

    // Transfer ownership
    await prisma.project.update({
      where: { id: projectId },
      data: { userId: newUserId }
    });

    return NextResponse.json({
      success: true,
      message: 'Project transferred successfully',
      ...info
    });
  } catch (error) {
    console.error('Error transferring project:', error);
    return NextResponse.json(
      { error: 'Failed to transfer project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
