// Grok Imagine API Route - Image-to-Video Generation via Kie.ai
// Uses kie.ai API for Grok Imagine image-to-video generation
// Docs: https://docs.kie.ai/market/grok-imagine/image-to-video
//
// API Limitations (as of 2025):
// - Duration: Fixed 6 seconds (not configurable)
// - Resolution: Matches input image (use high-res images for quality)
// - Audio: Auto-generated ambient audio (no dialogue/voiceover)
// - Modes: 'fun', 'normal', 'spicy' (spicy only works with Grok-generated images)
// - FPS: Not configurable via API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { uploadBase64ToS3, uploadVideoToS3, isS3Configured } from '@/lib/services/s3-upload';
import { spendCredits, COSTS, checkBalance } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';

const KIE_API_URL = 'https://api.kie.ai';

export const maxDuration = 120; // Allow up to 2 minutes for video generation

interface VideoGenerationRequest {
  imageUrl: string;
  prompt: string;
  projectId?: string;
  mode?: 'fun' | 'normal' | 'spicy';
  seed?: number;
}

// Enhance I2V prompt with motion speed hints to avoid slow-mo effect
function enhancePromptForMotion(prompt: string): string {
  // If prompt doesn't already have speed/motion hints, add them
  const hasSpeedHint = /\b(quickly|fast|rapid|swift|dynamic|energetic|slow|gentle|smooth)\b/i.test(prompt);

  if (!hasSpeedHint) {
    // Add natural motion speed hint
    return `${prompt}. Natural movement speed, dynamic motion, fluid animation.`;
  }

  return prompt;
}

// Helper function to download video and convert to base64
async function downloadVideoAsBase64(videoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.error('Failed to download video:', response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Detect content type from response or default to mp4
    const contentType = response.headers.get('content-type') || 'video/mp4';

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error downloading video:', error);
    return null;
  }
}

// POST - Create video generation task
export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt, mode = 'normal', seed }: VideoGenerationRequest = await request.json();

    // Get API key from user's database settings only
    const session = await auth();
    let apiKey: string | undefined;

    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      apiKey = userApiKeys?.kieApiKey || undefined;

      // Pre-check credit balance before starting generation
      const balanceCheck = await checkBalance(session.user.id, COSTS.VIDEO_GENERATION);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json({
          error: 'Insufficient credits',
          required: balanceCheck.required,
          balance: balanceCheck.balance,
          needsPurchase: true,
        }, { status: 402 });
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Kie.ai API key not configured. Please add your API key in Settings.' },
        { status: 500 }
      );
    }

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'Image URL and prompt are required' },
        { status: 400 }
      );
    }

    // For base64 images, upload to S3 first to get a public URL
    let publicImageUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      console.log('Uploading base64 image to S3...');
      const uploadResult = await uploadBase64ToS3(imageUrl, 'film-generator/scenes');

      if (!uploadResult.success || !uploadResult.url) {
        return NextResponse.json(
          {
            error: uploadResult.error || 'Failed to upload image to S3',
            tip: 'Check your AWS credentials in Settings or upload image manually to Grok.',
          },
          { status: 500 }
        );
      }

      publicImageUrl = uploadResult.url;
      console.log('Image uploaded to S3:', publicImageUrl);
    }

    // Enhance prompt with motion hints to prevent slow-mo effect
    const enhancedPrompt = enhancePromptForMotion(prompt);
    console.log('Enhanced prompt:', enhancedPrompt);

    // Note: 'spicy' mode only works with task_id (Grok-generated images)
    // For external image_urls, spicy auto-switches to normal
    const effectiveMode = mode === 'spicy' ? 'normal' : mode;
    if (mode === 'spicy') {
      console.log('Note: Spicy mode not supported for external images, using normal mode');
    }

    // Build request body for kie.ai Grok Imagine API
    const requestBody: {
      model: string;
      input: {
        image_urls: string[];
        prompt: string;
        mode: string;
        seed?: number;
      };
    } = {
      model: 'grok-imagine/image-to-video',
      input: {
        image_urls: [publicImageUrl],
        prompt: enhancedPrompt,
        mode: effectiveMode,
      },
    };

    // Add seed if provided for reproducible results
    if (seed !== undefined) {
      requestBody.input.seed = seed;
    }

    const response = await fetch(`${KIE_API_URL}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      console.error('Kie.ai API error:', data);
      return NextResponse.json(
        { error: data.msg || data.message || 'Failed to create video generation task' },
        { status: response.status }
      );
    }

    // Return task ID for polling
    return NextResponse.json({
      taskId: data.data.taskId,
      status: 'processing',
      message: 'Video generation started. Poll for status.',
    });
  } catch (error) {
    console.error('Grok route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check video generation status and download video
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const download = searchParams.get('download') !== 'false'; // Default to true

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get API key from user's database settings only
    const session = await auth();
    let apiKey: string | undefined;

    if (session?.user?.id) {
      const userApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });
      apiKey = userApiKeys?.kieApiKey || undefined;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Kie.ai API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      return NextResponse.json(
        { error: data.msg || data.message || 'Failed to check status' },
        { status: response.status }
      );
    }

    const taskData = data.data;

    // Map kie.ai states to our states
    const stateMapping: Record<string, string> = {
      'waiting': 'processing',
      'queuing': 'processing',
      'generating': 'processing',
      'success': 'complete',
      'fail': 'error',
    };

    const status = stateMapping[taskData.state] || taskData.state;

    // Parse result JSON to get video URL
    let externalVideoUrl: string | undefined;
    let videoUrl: string | undefined;

    if (taskData.resultJson) {
      try {
        const result = JSON.parse(taskData.resultJson);
        externalVideoUrl = result.resultUrls?.[0];
      } catch {
        console.error('Failed to parse resultJson:', taskData.resultJson);
      }
    }

    // If video is complete and download is enabled, download and upload to S3 or convert to base64
    if (status === 'complete' && externalVideoUrl && download) {
      console.log('Downloading video from:', externalVideoUrl);
      const base64Video = await downloadVideoAsBase64(externalVideoUrl);

      if (base64Video) {
        // Upload to S3 if configured
        if (isS3Configured()) {
          console.log('[S3] Uploading video to S3...');
          const uploadResult = await uploadVideoToS3(base64Video, projectId || undefined);
          if (uploadResult.success && uploadResult.url) {
            videoUrl = uploadResult.url;
            console.log('[S3] Video uploaded successfully:', uploadResult.url);
          } else {
            console.warn('[S3] Upload failed, falling back to base64:', uploadResult.error);
            videoUrl = base64Video;
          }
        } else {
          videoUrl = base64Video;
          console.log('Video downloaded and converted to base64, size:', Math.round(base64Video.length / 1024), 'KB');
        }
      } else {
        // Fall back to external URL if download fails
        videoUrl = externalVideoUrl;
        console.warn('Failed to download video, using external URL (expires in 24h)');
      }
    } else if (externalVideoUrl) {
      // Return external URL if not downloading
      videoUrl = externalVideoUrl;
    }

    // Track cost when video is complete
    const realCost = ACTION_COSTS.video.grok;
    if (status === 'complete' && session?.user?.id) {
      await spendCredits(
        session.user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Grok video generation',
        projectId || undefined,
        'grok'
      );
    }

    return NextResponse.json({
      taskId,
      status,
      videoUrl,
      externalVideoUrl, // Also return the original URL in case needed
      failMessage: taskData.failMsg || undefined,
      cost: status === 'complete' ? realCost : undefined,
      storage: videoUrl && !videoUrl.startsWith('data:') && !videoUrl.startsWith('http://') ? 's3' : (videoUrl?.startsWith('data:') ? 'base64' : 'external'),
    });
  } catch (error) {
    console.error('Grok status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
