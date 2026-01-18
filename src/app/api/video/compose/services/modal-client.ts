// Video Composition - Modal VectCut API Client

import type { ModalRequest, ModalResponse } from '../types';

/**
 * Build the request payload for Modal VectCut API
 */
export function buildModalRequest(params: {
  projectId: string;
  projectName: string;
  scenes: unknown[];
  captions: unknown[];
  music: unknown | null;
  outputFormat: 'mp4' | 'draft' | 'both';
  resolution: 'sd' | 'hd' | '4k';
  includeCaptions: boolean;
  captionStyle?: unknown;
  transitionStyle?: string;
  transitionDuration?: number;
  audioSettings?: unknown;
  kenBurnsEffect?: boolean;
}): ModalRequest {
  const {
    projectId,
    projectName,
    scenes,
    captions,
    music,
    outputFormat,
    resolution,
    includeCaptions,
    captionStyle,
    transitionStyle,
    transitionDuration,
    audioSettings,
    kenBurnsEffect,
  } = params;

  // Get S3 config for uploads
  const s3Config = {
    s3_bucket: process.env.AWS_S3_BUCKET || null,
    s3_region: process.env.AWS_REGION || null,
    s3_access_key: process.env.AWS_ACCESS_KEY_ID || null,
    s3_secret_key: process.env.AWS_SECRET_ACCESS_KEY || null,
  };

  return {
    project_id: projectId,
    project_name: projectName,
    scenes: scenes as [],
    captions: captions as [],
    music: music as null,
    output_format: outputFormat,
    resolution,
    fps: 30,
    include_srt: includeCaptions,
    caption_style: captionStyle as {
      font_size: 'small' | 'medium' | 'large';
      font_color: string;
      bg_color: string;
      bg_alpha: number;
      position: 'top' | 'center' | 'bottom';
      shadow: boolean;
    },
    transition_style: transitionStyle || 'fade',
    transition_duration: transitionDuration || 1.0,
    audio_settings: audioSettings as {
      music_volume: number;
      fade_in: number;
      fade_out: number;
    },
    ken_burns_effect: kenBurnsEffect !== false,
    ...s3Config,
  };
}

/**
 * Call Modal VectCut API for video composition
 */
export async function callModalComposeAPI(
  endpoint: string,
  request: ModalRequest
): Promise<ModalResponse> {
  console.log(`[Compose] Starting composition for project ${request.project_id}, ${request.scenes.length} scenes`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Modal composition failed: ${errorText}`);
  }

  return await response.json();
}

/**
 * Handle Modal API response
 */
export function handleModalResponse(result: ModalResponse): {
  success: boolean;
  error?: string;
  data?: {
    videoUrl?: string;
    videoBase64?: string;
    draftUrl?: string;
    draftBase64?: string;
    srtContent?: string;
    duration?: number;
    fileSize?: number;
  };
} {
  if (result.status === 'error') {
    return {
      success: false,
      error: result.error || 'Composition failed',
    };
  }

  return {
    success: true,
    data: {
      videoUrl: result.video_url,
      videoBase64: result.video_base64,
      draftUrl: result.draft_url,
      draftBase64: result.draft_base64,
      srtContent: result.srt_content,
      duration: result.duration,
      fileSize: result.file_size,
    },
  };
}
