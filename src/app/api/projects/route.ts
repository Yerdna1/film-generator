import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

// GET - Fetch all projects for user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        characters: true,
        scenes: {
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform to match frontend Project type
    const transformedProjects = projects.map((project) => ({
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
    }));

    return NextResponse.json(transformedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, style, settings, story, voiceSettings } = body;

    const project = await prisma.project.create({
      data: {
        name: name || 'New Project',
        userId: session.user.id,
        style: style || 'disney-pixar',
        settings: settings || {
          sceneCount: 12,
          characterCount: 2,
          aspectRatio: '16:9',
          resolution: 'hd',
          voiceLanguage: 'sk',
          voiceProvider: 'gemini-tts',
        },
        story: story || {
          title: '',
          concept: '',
          genre: 'adventure',
          tone: 'heartfelt',
          setting: '',
        },
        voiceSettings: voiceSettings || {
          language: 'sk',
          provider: 'gemini-tts',
          characterVoices: {},
        },
      },
      include: {
        characters: true,
        scenes: true,
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
      characters: [],
      scenes: [],
    };

    return NextResponse.json(transformedProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
