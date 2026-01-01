// Export project as JSON metadata
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch project with all related data
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        characters: {
          orderBy: { createdAt: 'asc' },
        },
        scenes: {
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Build export data
    const exportData = {
      name: project.name,
      style: project.style,
      masterPrompt: project.masterPrompt,
      story: typeof project.story === 'object' && project.story !== null
        ? (project.story as { content?: string }).content
        : undefined,
      characters: project.characters.map((char) => ({
        name: char.name,
        description: char.description,
        visualDescription: char.visualDescription,
        imageUrl: char.imageUrl,
        voiceId: char.voiceId,
        voiceName: char.voiceName,
      })),
      scenes: project.scenes.map((scene) => ({
        number: scene.number,
        title: scene.title,
        description: scene.description,
        textToImagePrompt: scene.textToImagePrompt,
        imageToVideoPrompt: scene.imageToVideoPrompt,
        cameraShot: scene.cameraShot,
        dialogue: scene.dialogue,
        imageUrl: scene.imageUrl,
        videoUrl: scene.videoUrl,
        audioUrl: scene.audioUrl,
        duration: scene.duration,
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export project' },
      { status: 500 }
    );
  }
}
