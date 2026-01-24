import type { ImageResolution } from '@/lib/services/real-costs';

/**
 * Build request body for KIE provider
 */
export function buildKieRequestBody(
  prompt: string,
  aspectRatio: string,
  kieModelId: string,
  referenceImages: Array<{ name: string; imageUrl: string }>,
  resolution: string = '2k'
): any {
  return {
    model: kieModelId,
    input: {
      prompt: prompt,
      aspect_ratio: aspectRatio,
      resolution: resolution.toUpperCase(), // KIE API expects "1K", "2K", "4K"
      // Additional parameters based on model type
      ...(kieModelId.includes('ideogram') && { render_text: true }),
      ...(kieModelId.includes('flux') && { guidance_scale: 7.5 }),
    },
  };
}

/**
 * Build request body for Modal provider
 */
export function buildModalRequestBody(
  prompt: string,
  aspectRatio: string,
  resolution: ImageResolution,
  referenceImages: Array<{ name: string; imageUrl: string }>,
  randomSeed: number
): any {
  return {
    prompt,
    aspect_ratio: aspectRatio,
    resolution,
    seed: randomSeed,
  };
}

/**
 * Build request body for Modal-Edit provider
 */
export function buildModalEditRequestBody(
  prompt: string,
  aspectRatio: string,
  referenceImages: Array<{ name: string; imageUrl: string }>,
  randomSeed: number
): any {
  if (referenceImages.length === 0) {
    throw new Error('Modal-Edit requires reference images');
  }
  return {
    prompt,
    aspect_ratio: aspectRatio,
    reference_images: referenceImages.map(ref => ref.imageUrl),
    seed: randomSeed,
  };
}

/**
 * Calculate real cost based on KIE model
 */
export function calculateKieRealCost(kieModelId: string): number {
  if (kieModelId.includes('nano-banana')) {
    return 0.09; // Both 1K and 2K are 18 credits
  } else if (kieModelId.includes('4k')) {
    return 0.12; // 4K is 24 credits
  } else if (kieModelId.includes('seedream')) {
    return 0.10; // Seedream 4.5
  } else if (kieModelId.includes('grok')) {
    return 0.02;
  } else if (kieModelId.includes('flux')) {
    if (kieModelId.includes('kontext')) {
      return 0.20; // Flux Kontext models are more expensive
    } else {
      return 0.15; // Flux Pro
    }
  }
  return 0.09; // Default cost
}
