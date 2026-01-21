import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';
import { getUserAccessibleProjectsSummary } from '@/lib/permissions';
import { DEFAULT_MODELS } from '@/components/workflow/api-key-modal/constants';

// GET - Fetch all projects for user (owned + shared)
// OPTIMIZED: Returns summary data only (~1KB per project vs ~50KB full)
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
        return NextResponse.json(cachedProjects, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          },
        });
      }
    }

    // Get lightweight project summaries (optimized for dashboard)
    const projects = await getUserAccessibleProjectsSummary(userId);

    // Transform dates to ISO strings
    const transformedProjects = projects.map((project) => ({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }));

    // Cache for 2 hours
    cache.set(cacheKey, transformedProjects, cacheTTL.LONG);

    return NextResponse.json(transformedProjects, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
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

    // Fetch user's saved preferences to initialize modelConfig
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId: session.user.id },
      select: {
        llmProvider: true,
        openRouterModel: true,
        imageProvider: true,
        kieImageModel: true,
        videoProvider: true,
        kieVideoModel: true,
        ttsProvider: true,
        kieTtsModel: true,
        musicProvider: true,
        kieMusicModel: true,
      },
    });

    // Build modelConfig from user's saved preferences (or use defaults)
    const modelConfig = {
      llm: {
        provider: userApiKeys?.llmProvider || 'kie',
        model: userApiKeys?.openRouterModel || 'anthropic/claude-sonnet-4',
      },
      image: {
        provider: userApiKeys?.imageProvider || 'kie',
        model: userApiKeys?.kieImageModel || DEFAULT_MODELS.kieImageModel,
        characterResolution: '2k',
        sceneResolution: '2k',
        characterAspectRatio: '1:1',
        sceneAspectRatio: '16:9',
      },
      video: {
        provider: userApiKeys?.videoProvider || 'kie',
        model: userApiKeys?.kieVideoModel || DEFAULT_MODELS.kieVideoModel,
        exportResolution: '1080p',
      },
      tts: {
        provider: userApiKeys?.ttsProvider || 'kie',
        model: userApiKeys?.kieTtsModel || DEFAULT_MODELS.kieTtsModel,
        defaultLanguage: 'en',
      },
      music: {
        provider: userApiKeys?.musicProvider || 'kie',
        model: userApiKeys?.kieMusicModel || DEFAULT_MODELS.kieMusicModel,
      },
    };

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
        modelConfig, // Initialize with user's preferences
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
      modelConfig: project.modelConfig as object,
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
