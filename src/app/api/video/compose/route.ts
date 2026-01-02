// Video Composition API Route - Renders final video with VectCutAPI on Modal
// Supports: MP4 rendering, CapCut draft export, SRT subtitles

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { spendCredits, COSTS, checkBalance } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import { rateLimit } from '@/lib/services/rate-limit';
import type { Project, Scene, Caption, BackgroundMusic } from '@/types/project';

export const maxDuration = 300; // 5 minutes for long compositions

// Request types
interface ComposeRequest {
  projectId: string;
  outputFormat: 'mp4' | 'draft' | 'both';
  resolution: 'hd' | '4k';
  includeCaptions: boolean;
  includeMusic: boolean;
  aiTransitions?: boolean;
}

interface SceneData {
  id: string;
  video_url?: string;
  image_url?: string;
  duration: number;
  transition_to_next?: string;
}

interface CaptionData {
  text: string;
  start_time: number;
  end_time: number;
  font_size: number;
  font_color: string;
  background_color?: string;
  position: 'top' | 'center' | 'bottom';
}

interface MusicData {
  audio_url: string;
  volume: number;
  start_offset: number;
  fade_in: number;
  fade_out: number;
}

// Cost calculation
function calculateCompositionCost(
  sceneCount: number,
  includeMusic: boolean,
  includeCaptions: boolean,
  captionCount: number,
  resolution: 'hd' | '4k'
): { credits: number; realCost: number } {
  // Base cost per scene
  let credits = sceneCount * (COSTS.VIDEO_COMPOSITION_BASE || 5);
  let realCost = sceneCount * (ACTION_COSTS.videoComposition?.modal || 0.03);

  // Music overlay
  if (includeMusic) {
    credits += COSTS.VIDEO_COMPOSITION_MUSIC || 2;
    realCost += 0.02;
  }

  // Caption burn-in (1 credit per 10 captions)
  if (includeCaptions && captionCount > 0) {
    credits += Math.ceil(captionCount / 10) * (COSTS.VIDEO_COMPOSITION_CAPTION || 1);
    realCost += captionCount * 0.001;
  }

  // 4K resolution multiplier
  if (resolution === '4k') {
    credits *= 2;
    realCost *= 1.5;
  }

  return { credits, realCost };
}

// Convert project scenes to composition format
function prepareSceneData(scenes: Scene[], transitions?: Record<string, string>): SceneData[] {
  return scenes.map((scene, index) => ({
    id: scene.id,
    video_url: scene.videoUrl || undefined,
    image_url: scene.imageUrl || undefined,
    duration: scene.duration || 6,
    transition_to_next: transitions?.[scene.id] || (index < scenes.length - 1 ? 'fade' : undefined),
  }));
}

// Convert project captions to composition format
function prepareCaptionData(scenes: Scene[]): CaptionData[] {
  const captions: CaptionData[] = [];
  let globalTime = 0;

  for (const scene of scenes) {
    const sceneDuration = scene.duration || 6;

    if (scene.captions) {
      for (const caption of scene.captions) {
        captions.push({
          text: caption.text,
          start_time: globalTime + (caption.startTime || 0),
          end_time: globalTime + (caption.endTime || sceneDuration),
          font_size: caption.style?.fontSize === 'large' ? 48 : caption.style?.fontSize === 'small' ? 24 : 36,
          font_color: caption.style?.color || '#FFFFFF',
          background_color: caption.style?.backgroundColor || '#00000080',
          position: caption.style?.position || 'bottom',
        });
      }
    }

    globalTime += sceneDuration;
  }

  return captions;
}

// Prepare music data
function prepareMusicData(music: BackgroundMusic | undefined): MusicData | null {
  if (!music || !music.audioUrl) return null;

  return {
    audio_url: music.audioUrl,
    volume: music.volume || 0.3,
    start_offset: music.startOffset || 0,
    fade_in: 2.0,
    fade_out: 2.0,
  };
}

// POST - Start video composition job
export async function POST(request: NextRequest) {
  // Rate limit composition to prevent abuse (5 requests/min)
  const rateLimitResult = await rateLimit(request, 'composition');
  if (rateLimitResult) return rateLimitResult;

  try {
    const body: ComposeRequest = await request.json();
    const { projectId, outputFormat, resolution, includeCaptions, includeMusic, aiTransitions } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project with scenes
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        scenes: { orderBy: { number: 'asc' } },
        characters: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check ownership or membership
    if (project.userId !== session.user.id) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: session.user.id } },
      });
      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Parse project data
    const scenes = project.scenes as unknown as Scene[];
    const settings = project.settings as { backgroundMusic?: BackgroundMusic };

    if (scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes to compose' }, { status: 400 });
    }

    // Check if any scenes have media
    const hasMedia = scenes.some(s => s.videoUrl || s.imageUrl);
    if (!hasMedia) {
      return NextResponse.json({ error: 'No scene images or videos available' }, { status: 400 });
    }

    // Calculate costs
    const captionCount = scenes.reduce((sum, s) => sum + (s.captions?.length || 0), 0);
    const { credits, realCost } = calculateCompositionCost(
      scenes.length,
      includeMusic && !!settings?.backgroundMusic,
      includeCaptions,
      captionCount,
      resolution
    );

    // Check credit balance
    const balanceCheck = await checkBalance(session.user.id, credits);
    if (!balanceCheck.hasEnough) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: balanceCheck.required,
        balance: balanceCheck.balance,
        needsPurchase: true,
      }, { status: 402 });
    }

    // Get user's VectCut endpoint
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId: project.userId },
    });

    const vectcutEndpoint = userApiKeys?.modalVectcutEndpoint;
    if (!vectcutEndpoint) {
      return NextResponse.json({
        error: 'VectCut endpoint not configured. Please add your Modal endpoint URL in Settings.',
      }, { status: 400 });
    }

    // Create composition job
    const job = await prisma.videoCompositionJob.create({
      data: {
        projectId,
        userId: session.user.id,
        status: 'processing',
        outputFormat,
        resolution,
        includeMusic: includeMusic && !!settings?.backgroundMusic,
        includeCaptions,
        creditsCost: credits,
        realCost,
        startedAt: new Date(),
      },
    });

    // Prepare composition request
    const sceneData = prepareSceneData(scenes);
    const captionData = includeCaptions ? prepareCaptionData(scenes) : [];
    const musicData = includeMusic ? prepareMusicData(settings?.backgroundMusic) : null;

    // Get S3 config for uploads
    const s3Config = {
      s3_bucket: process.env.AWS_S3_BUCKET || null,
      s3_region: process.env.AWS_REGION || null,
      s3_access_key: process.env.AWS_ACCESS_KEY_ID || null,
      s3_secret_key: process.env.AWS_SECRET_ACCESS_KEY || null,
    };

    // Call Modal endpoint
    console.log(`[Compose] Starting composition for project ${projectId}, ${scenes.length} scenes`);

    const modalRequest = {
      project_id: projectId,
      project_name: project.name,
      scenes: sceneData,
      captions: captionData,
      music: musicData,
      output_format: outputFormat,
      resolution,
      fps: 30,
      include_srt: includeCaptions,
      ...s3Config,
    };

    try {
      const response = await fetch(vectcutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modalRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal composition failed: ${errorText}`);
      }

      const result = await response.json();

      if (result.status === 'error') {
        // Update job with error
        await prisma.videoCompositionJob.update({
          where: { id: job.id },
          data: {
            status: 'error',
            errorMessage: result.error,
            completedAt: new Date(),
          },
        });

        return NextResponse.json({
          jobId: job.id,
          status: 'error',
          error: result.error,
        });
      }

      // Deduct credits on success
      await spendCredits(
        session.user.id,
        credits,
        'video',
        `Video composition (${scenes.length} scenes)`,
        projectId,
        'modal-vectcut',
        { outputFormat, resolution, sceneCount: scenes.length },
        realCost
      );

      // Update job with results
      await prisma.videoCompositionJob.update({
        where: { id: job.id },
        data: {
          status: 'complete',
          progress: 100,
          videoUrl: result.video_url || null,
          draftUrl: result.draft_url || null,
          srtUrl: result.srt_content ? `data:text/plain;base64,${Buffer.from(result.srt_content).toString('base64')}` : null,
          duration: result.duration || 0,
          fileSize: result.file_size || 0,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        jobId: job.id,
        status: 'complete',
        videoUrl: result.video_url,
        videoBase64: result.video_base64,
        draftUrl: result.draft_url,
        draftBase64: result.draft_base64,
        srtContent: result.srt_content,
        duration: result.duration,
        fileSize: result.file_size,
        cost: { credits, realCost },
      });

    } catch (fetchError) {
      console.error('[Compose] Modal fetch error:', fetchError);

      // Update job with error
      await prisma.videoCompositionJob.update({
        where: { id: job.id },
        data: {
          status: 'error',
          errorMessage: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        jobId: job.id,
        status: 'error',
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Video composition error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Check composition job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const projectId = searchParams.get('projectId');

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (jobId) {
      // Get specific job
      const job = await prisma.videoCompositionJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      if (job.userId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        phase: job.phase,
        videoUrl: job.videoUrl,
        draftUrl: job.draftUrl,
        srtUrl: job.srtUrl,
        duration: job.duration,
        fileSize: job.fileSize,
        error: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      });
    }

    if (projectId) {
      // Get latest job for project
      const job = await prisma.videoCompositionJob.findFirst({
        where: { projectId, userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!job) {
        return NextResponse.json({ status: 'none' });
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        phase: job.phase,
        videoUrl: job.videoUrl,
        draftUrl: job.draftUrl,
        srtUrl: job.srtUrl,
        duration: job.duration,
        fileSize: job.fileSize,
        error: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      });
    }

    return NextResponse.json({ error: 'Job ID or Project ID required' }, { status: 400 });

  } catch (error) {
    console.error('Composition status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/video/compose/estimate - Get cost estimate without starting job
export async function OPTIONS(request: NextRequest) {
  // Return CORS headers for preflight
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
