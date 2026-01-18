// Video Composition - POST Handler

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { spendCredits } from '@/lib/services/credits';
import { rateLimit } from '@/lib/services/rate-limit';
import { calculateCompositionCost } from '../utils/cost-calculator';
import { prepareSceneData, prepareCaptionData, prepareMusicData } from '../utils/data-preparers';
import { validateComposeRequest, checkProjectAccess, validateProjectScenes, checkUserCredits, checkVectCutEndpoint } from '../utils/validators';
import { buildModalRequest, callModalComposeAPI, handleModalResponse } from '../services/modal-client';
import { createCompositionJob, updateJobSuccess, updateJobError } from '../services/job-manager';
import type { ComposeRequest, CompositionResult } from '../types';

export const maxDuration = 300; // 5 minutes for long compositions

/**
 * POST handler for video composition
 * Starts a new composition job and returns the result
 */
export async function POST(request: NextRequest) {
  // Rate limit composition to prevent abuse (5 requests/min)
  const rateLimitResult = await rateLimit(request, 'composition');
  if (rateLimitResult) return rateLimitResult;

  try {
    const body: ComposeRequest = await request.json();
    const {
      projectId,
      outputFormat,
      resolution,
      includeCaptions,
      includeMusic,
      includeVoiceovers = true,
      replaceVideoAudio = false,
      aiTransitions,
      captionStyle,
      transitionStyle,
      transitionDuration,
      audioSettings,
      kenBurnsEffect,
    } = body;

    // Validate request
    const validation = validateComposeRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check project access
    const accessCheck = await checkProjectAccess(projectId, session.user.id);
    if (!accessCheck.hasAccess) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.error === 'Project not found' ? 404 : 403 });
    }

    // Validate project scenes
    const sceneValidation = await validateProjectScenes(projectId);
    if (!sceneValidation.valid) {
      return NextResponse.json({ error: sceneValidation.error }, { status: 400 });
    }

    const { scenes, hasMusic, captionCount } = sceneValidation;

    // Ensure scenes is not undefined
    if (!scenes) {
      return NextResponse.json({ error: 'No scenes found' }, { status: 400 });
    }

    // Calculate costs
    const cost = calculateCompositionCost(
      scenes.length,
      includeMusic && !!hasMusic,
      includeCaptions,
      captionCount || 0,
      resolution
    );

    // Check credits
    const creditCheck = await checkUserCredits(session.user.id, cost);
    if (!creditCheck.hasEnough) {
      return NextResponse.json(
        {
          error: creditCheck.error,
          required: creditCheck.required,
          balance: creditCheck.balance,
          needsPurchase: true,
        },
        { status: 402 }
      );
    }

    // Check VectCut endpoint
    const endpointCheck = await checkVectCutEndpoint(session.user.id);
    if (!endpointCheck.hasEndpoint) {
      return NextResponse.json({ error: endpointCheck.error }, { status: 400 });
    }

    // Create composition job
    const job = await createCompositionJob({
      projectId,
      userId: session.user.id,
      outputFormat,
      resolution,
      includeMusic: includeMusic && !!hasMusic,
      includeCaptions,
      cost,
    });

    // Prepare composition data
    const sceneData = prepareSceneData(scenes, undefined, includeVoiceovers, replaceVideoAudio);
    const captionData = includeCaptions ? prepareCaptionData(scenes) : [];
    const musicData = (includeMusic && hasMusic) ? prepareMusicData(undefined) : null;

    // Get project name (use projectId as fallback)
    const projectName = projectId;

    // Build and send Modal request
    const modalRequest = buildModalRequest({
      projectId,
      projectName,
      scenes: sceneData,
      captions: captionData,
      music: musicData,
      outputFormat,
      resolution,
      includeCaptions,
      captionStyle,
      transitionStyle,
      transitionDuration,
      audioSettings,
      kenBurnsEffect,
    });

    try {
      const result = await callModalComposeAPI(endpointCheck.endpoint!, modalRequest);
      const response = handleModalResponse(result);

      if (!response.success) {
        await updateJobError(job.id, response.error!);
        return NextResponse.json({
          jobId: job.id,
          status: 'error',
          error: response.error,
        });
      }

      // Deduct credits on success
      await spendCredits(
        session.user.id,
        cost.credits,
        'video',
        `Video composition (${scenes.length} scenes)`,
        projectId,
        'modal-vectcut',
        { outputFormat, resolution, sceneCount: scenes.length },
        cost.realCost
      );

      // Update job with results
      await updateJobSuccess({
        jobId: job.id,
        projectId,
        videoUrl: response.data?.videoUrl,
        draftUrl: response.data?.draftUrl,
        srtContent: response.data?.srtContent,
        duration: response.data?.duration,
        fileSize: response.data?.fileSize,
      });

      const resultData: CompositionResult = {
        jobId: job.id,
        status: 'complete',
        videoUrl: response.data?.videoUrl,
        videoBase64: response.data?.videoBase64,
        draftUrl: response.data?.draftUrl,
        draftBase64: response.data?.draftBase64,
        srtContent: response.data?.srtContent,
        duration: response.data?.duration,
        fileSize: response.data?.fileSize,
        cost,
      };

      return NextResponse.json(resultData);
    } catch (fetchError) {
      console.error('[Compose] Modal fetch error:', fetchError);

      await updateJobError(
        job.id,
        fetchError instanceof Error ? fetchError.message : 'Unknown error'
      );

      return NextResponse.json(
        {
          jobId: job.id,
          status: 'error',
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Video composition error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
