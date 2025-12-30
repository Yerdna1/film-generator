import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

// GET - Fetch all projects for user (with 2-hour cache)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const cacheKey = cacheKeys.userProjects(userId);

    // Check for force refresh query param
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedProjects = cache.get<unknown[]>(cacheKey);
      if (cachedProjects) {
        console.log(`[Cache HIT] Projects for user ${userId}`);
        return NextResponse.json(cachedProjects, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }

    console.log(`[Cache MISS] Fetching projects from DB for user ${userId}`);

    const projects = await prisma.project.findMany({
      where: { userId },
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

    // Cache for 2 hours
    cache.set(cacheKey, transformedProjects, cacheTTL.LONG);
    console.log(`[Cache SET] Projects cached for 2 hours`);

    return NextResponse.json(transformedProjects, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);

    // Check if it's a database quota error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuotaError = errorMessage.includes('data transfer quota') || errorMessage.includes('quota');

    if (isQuotaError) {
      // Return empty array when database is unavailable - client will use localStorage
      return NextResponse.json([], {
        headers: {
          'X-Database-Offline': 'true',
          'X-Error': 'Database quota exceeded',
        },
      });
    }

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

    // Invalidate projects cache for this user
    cache.invalidate(cacheKeys.userProjects(session.user.id));

    return NextResponse.json(transformedProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
