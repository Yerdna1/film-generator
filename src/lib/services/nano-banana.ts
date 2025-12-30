// Nano Banana Image Generation Service
// Uses Google Gemini 2.0 Flash for high-quality image generation
// Supports 21:9 cinematic aspect ratio and 4K resolution

export interface NanoBananaResponse {
  imageUrl?: string;
  taskId?: string;
  status?: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
  cost?: number;
}

export interface NanoBananaConfig {
  apiKey: string;
}

// Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

export type AspectRatio = '1:1' | '16:9' | '21:9' | '4:3' | '9:16';
export type Quality = 'standard' | 'hd' | '4k';

// Map aspect ratios to Imagen format
const aspectRatioMap: Record<AspectRatio, string> = {
  '1:1': '1:1',
  '16:9': '16:9',
  '21:9': '21:9',
  '4:3': '4:3',
  '9:16': '9:16',
};

// Generate image using Gemini 2.0 Flash with Imagen
export async function generateImage(
  prompt: string,
  config: NanoBananaConfig,
  options?: {
    aspectRatio?: AspectRatio;
    quality?: Quality;
    style?: string;
    negativePrompt?: string;
  }
): Promise<NanoBananaResponse> {
  try {
    // Enhance prompt for better quality
    const enhancedPrompt = options?.style
      ? `${options.style} style: ${prompt}`
      : prompt;

    const fullPrompt = options?.negativePrompt
      ? `${enhancedPrompt}. Avoid: ${options.negativePrompt}`
      : enhancedPrompt;

    // Try Imagen 3.0 first (best quality)
    const imagenResponse = await generateWithImagen(fullPrompt, config, options);
    if (imagenResponse.imageUrl) {
      return imagenResponse;
    }

    // Fallback to Gemini 2.0 Flash native image generation
    const geminiResponse = await generateWithGemini2Flash(fullPrompt, config);
    return geminiResponse;

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Generate using Imagen 3.0 (via Gemini API)
async function generateWithImagen(
  prompt: string,
  config: NanoBananaConfig,
  options?: {
    aspectRatio?: AspectRatio;
    quality?: Quality;
  }
): Promise<NanoBananaResponse> {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models/imagen-3.0-generate-001:predict?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatioMap[options?.aspectRatio || '16:9'],
            // Higher sample quality for HD/4K
            sampleImageSize: options?.quality === '4k' ? 1024 : options?.quality === 'hd' ? 768 : 512,
            personGeneration: 'allow_adult',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Imagen error:', error);
      return { error: error.error?.message || 'Imagen generation failed' };
    }

    const data = await response.json();
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;

    if (imageBase64) {
      return {
        imageUrl: `data:image/png;base64,${imageBase64}`,
        status: 'complete',
        cost: 0.04,
      };
    }

    return { error: 'No image generated from Imagen' };
  } catch (error) {
    console.error('Imagen request failed:', error);
    return { error: error instanceof Error ? error.message : 'Imagen request failed' };
  }
}

// Generate using Gemini 2.0 Flash with native image output
async function generateWithGemini2Flash(
  prompt: string,
  config: NanoBananaConfig
): Promise<NanoBananaResponse> {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models/gemini-2.0-flash-exp:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a high-quality cinematic image: ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            responseMimeType: 'image/png',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini 2.0 Flash error:', error);
      return { error: error.error?.message || 'Gemini generation failed' };
    }

    const data = await response.json();

    // Check for inline image data
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return {
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          status: 'complete',
          cost: 0.02,
        };
      }
    }

    return { error: 'No image generated from Gemini 2.0 Flash' };
  } catch (error) {
    console.error('Gemini 2.0 Flash request failed:', error);
    return { error: error instanceof Error ? error.message : 'Gemini request failed' };
  }
}

// Check async task status (if using async generation)
export async function checkImageStatus(
  taskId: string,
  config: NanoBananaConfig
): Promise<NanoBananaResponse> {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}/operations/${taskId}?key=${config.apiKey}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to check status' };
    }

    const data = await response.json();

    if (data.done) {
      const imageBase64 = data.response?.predictions?.[0]?.bytesBase64Encoded;
      if (imageBase64) {
        return {
          taskId,
          status: 'complete',
          imageUrl: `data:image/png;base64,${imageBase64}`,
        };
      }
    }

    return {
      taskId,
      status: data.done ? 'complete' : 'processing',
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Batch generate images with rate limiting
export async function batchGenerateImages(
  prompts: string[],
  config: NanoBananaConfig,
  options?: {
    aspectRatio?: AspectRatio;
    quality?: Quality;
  },
  onProgress?: (completed: number, total: number) => void
): Promise<NanoBananaResponse[]> {
  const results: NanoBananaResponse[] = [];
  const batchSize = 2; // Process 2 at a time to avoid rate limits

  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((prompt) => generateImage(prompt, config, options))
    );
    results.push(...batchResults);

    // Report progress
    if (onProgress) {
      onProgress(results.length, prompts.length);
    }

    // Delay between batches to respect rate limits
    if (i + batchSize < prompts.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// Cost estimation (based on Gemini pricing)
export function estimateCost(imageCount: number, quality: Quality = 'standard'): number {
  const costPerImage = quality === '4k' ? 0.04 : quality === 'hd' ? 0.03 : 0.02;
  return imageCount * costPerImage;
}
