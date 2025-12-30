// Grok AI API Service
// Image-to-video generation

export interface GrokResponse {
  videoUrl?: string;
  taskId?: string;
  status?: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface GrokConfig {
  apiKey: string;
}

// Note: Grok's image-to-video API may require different endpoints
// This is a placeholder implementation that should be updated with actual API details
const GROK_API_URL = 'https://api.x.ai/v1';

export async function generateVideo(
  imageUrl: string,
  prompt: string,
  config: GrokConfig,
  options?: {
    duration?: number; // in seconds, default 6
    fps?: number;
  }
): Promise<GrokResponse> {
  try {
    // Convert base64 image if needed
    let imageData = imageUrl;
    if (imageUrl.startsWith('data:')) {
      imageData = imageUrl.split(',')[1];
    }

    const response = await fetch(`${GROK_API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-vision',
        prompt: prompt,
        image: imageData,
        duration: options?.duration || 6,
        fps: options?.fps || 24,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to generate video' };
    }

    const data = await response.json();

    // If async generation, return task ID
    if (data.task_id) {
      return { taskId: data.task_id, status: 'processing' };
    }

    // If immediate result
    if (data.video_url) {
      return { videoUrl: data.video_url, status: 'complete' };
    }

    return { error: 'Unexpected response format' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function checkVideoStatus(
  taskId: string,
  config: GrokConfig
): Promise<GrokResponse> {
  try {
    const response = await fetch(`${GROK_API_URL}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to check status' };
    }

    const data = await response.json();

    return {
      taskId,
      status: data.status,
      videoUrl: data.video_url,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Alternative: Use Grok.com/imagine web interface
// This generates a prompt formatted for manual use
export function formatGrokPrompt(
  sceneDescription: string,
  dialogue: Array<{ character: string; text: string }>
): string {
  const dialogueText = dialogue
    .map((d) => `${d.character}: "${d.text}"`)
    .join('\n');

  return `${sceneDescription}

Animation style: Smooth, cinematic movement
Duration: 6 seconds
Characters show subtle movements and facial expressions matching dialogue.

Dialogue:
${dialogueText}`;
}
