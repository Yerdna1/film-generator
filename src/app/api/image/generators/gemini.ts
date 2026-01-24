import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { uploadMediaToS3 } from '@/lib/api';
import { spendCredits, getImageCreditCost, trackRealCostOnly } from '@/lib/services/credits';
import { getImageCost, type ImageResolution } from '@/lib/services/real-costs';

export interface GeminiGenerationOptions {
  prompt: string;
  aspectRatio: string;
  resolution: ImageResolution;
  projectId: string | undefined;
  referenceImages: Array<{ name: string; imageUrl: string }>;
  apiKey: string;
  creditUserId: string | undefined;
  realCostUserId: string | undefined;
  isRegeneration?: boolean;
  sceneId?: string;
}

interface ProcessedImage {
  name: string;
  base64Data: string;
  mimeType: string;
}

/**
 * Process a reference image for Gemini generation
 */
async function processReferenceImage(ref: { name: string; imageUrl: string }): Promise<ProcessedImage | null> {
  try {
    let base64Data: string;
    let mimeType: string;

    if (ref.imageUrl.startsWith('data:')) {
      const matches = ref.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        [, mimeType, base64Data] = matches;
        return { name: ref.name, base64Data, mimeType };
      }
      return null;
    } else if (ref.imageUrl.startsWith('http')) {
      const imageResponse = await fetch(ref.imageUrl);
      if (!imageResponse.ok) return null;
      const arrayBuffer = await imageResponse.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
      mimeType = imageResponse.headers.get('content-type') || 'image/png';
      return { name: ref.name, base64Data, mimeType };
    }
    return null;
  } catch (error) {
    console.error(`[Reference] Error processing image for ${ref.name}:`, error);
    return null;
  }
}

/**
 * Generate image using Gemini (special case - uses AI SDK)
 */
export async function generateWithGemini(options: GeminiGenerationOptions): Promise<{
  imageUrl: string;
  cost: number;
  storage: string;
}> {
  const {
    prompt,
    aspectRatio,
    resolution,
    projectId,
    referenceImages,
    apiKey,
    creditUserId,
    realCostUserId,
    isRegeneration = false,
    sceneId,
  } = options;

  const google = createGoogleGenerativeAI({ apiKey });

  // Build message content with optional reference images
  const messageContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: string; mimeType?: string }
  > = [];

  if (referenceImages && referenceImages.length > 0) {
    messageContent.push({
      type: 'text',
      text: `REFERENCE IMAGES FOR VISUAL CONSISTENCY - Use these exact character appearances in the generated scene:\n${referenceImages.map(r => `- ${r.name}`).join('\n')}\n\n`,
    });

    // Process reference images in parallel for better performance
    const imagePromises = referenceImages
      .filter(ref => ref.imageUrl)
      .map(processReferenceImage);

    const processedImages = (await Promise.all(imagePromises)).filter(Boolean);

    for (const img of processedImages) {
      if (img) {
        messageContent.push({ type: 'image', image: img.base64Data, mimeType: img.mimeType });
        messageContent.push({ type: 'text', text: `(Above: ${img.name} - use this EXACT character appearance)` });
      }
    }
  }

  messageContent.push({ type: 'text', text: prompt });

  const result = await generateText({
    model: google('gemini-3-pro-image-preview'),
    messages: [{ role: 'user', content: messageContent }],
    providerOptions: {
      google: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
      },
    },
  });

  const generatedImage = result.files?.[0];
  if (!generatedImage?.base64) {
    throw new Error('No image was generated');
  }

  const mimeType = (generatedImage as any).mimeType || (generatedImage as any).mediaType || 'image/png';
  const base64DataUrl = `data:${mimeType};base64,${generatedImage.base64}`;

  const realCost = getImageCost(resolution);
  const creditCost = getImageCreditCost(resolution);
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (creditUserId) {
    // Normal case: deduct credits and track real cost
    await spendCredits(
      creditUserId,
      creditCost,
      'image',
      `Gemini image ${actionType} (${resolution.toUpperCase()})`,
      projectId,
      'gemini',
      { isRegeneration, sceneId },
      realCost
    );
  } else if (realCostUserId) {
    // Collaborator regeneration: only track real cost (credits already prepaid by admin)
    await trackRealCostOnly(
      realCostUserId,
      realCost,
      'image',
      `Gemini image ${actionType} (${resolution.toUpperCase()}) - prepaid`,
      projectId,
      'gemini',
      { isRegeneration, sceneId, prepaidRegeneration: true }
    );
  }

  const imageUrl = await uploadMediaToS3(base64DataUrl, 'image', projectId);

  return { imageUrl, cost: realCost, storage: !imageUrl.startsWith('data:') ? 's3' : 'base64' };
}
