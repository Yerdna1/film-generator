import { callExternalApi } from '@/lib/providers/api-wrapper';
import { getProviderConfig } from '@/lib/providers';
import { uploadMediaToS3 } from '@/lib/api';
import { spendCredits, getImageCreditCost, trackRealCostOnly } from '@/lib/services/credits';
import { getImageCost, type ImageResolution } from '@/lib/services/real-costs';
import { buildKieRequestBody, buildModalRequestBody, buildModalEditRequestBody, calculateKieRealCost } from './request-builders';
import { pollKieTask } from './kie-polling';

export interface WrapperGenerationOptions {
  userId: string | undefined;
  projectId: string | undefined;
  provider: string;
  prompt: string;
  aspectRatio: string;
  resolution: ImageResolution;
  referenceImages: Array<{ name: string; imageUrl: string }>;
  creditUserId: string | undefined;
  realCostUserId: string | undefined;
  isRegeneration?: boolean;
  sceneId?: string;
  endpoint?: string;
  requestModel?: string;
}

interface ApiResponse {
  status: number;
  data?: any;
  error?: string;
}

/**
 * Handle KIE provider response
 */
async function handleKieResponse(
  response: ApiResponse,
  userId: string | undefined
): Promise<string> {
  // KIE createTask returns the response in data field with taskId
  const responseData = response.data;
  const taskId = responseData?.data?.taskId;

  if (!taskId) {
    console.error('[Image API] KIE response structure issue:', {
      hasResponseData: !!responseData,
      responseDataType: typeof responseData,
      responseDataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
      hasNestedData: !!responseData?.data,
      nestedDataType: typeof responseData?.data,
      nestedDataKeys: responseData?.data && typeof responseData.data === 'object' ? Object.keys(responseData.data) : null,
      fullResponse: JSON.stringify(responseData, null, 2),
    });
    throw new Error('KIE AI did not return a task ID');
  }

  console.log(`[KIE] Task created: ${taskId}, polling for completion...`);

  return pollKieTask(taskId, userId);
}

/**
 * Handle Modal provider response
 */
function handleModalResponse(response: ApiResponse): string {
  if (response.data.image) {
    return response.data.image.startsWith('data:')
      ? response.data.image
      : `data:image/png;base64,${response.data.image}`;
  } else if (response.data.imageUrl) {
    return response.data.imageUrl;
  }
  throw new Error('Modal did not return an image');
}

/**
 * Generate image using centralized API wrapper
 */
export async function generateWithWrapper(options: WrapperGenerationOptions): Promise<{
  imageUrl: string;
  cost: number;
  storage: string;
}> {
  console.log(`[${options.provider}] Generating image with wrapper`);

  const {
    userId,
    projectId,
    provider,
    prompt,
    aspectRatio,
    resolution,
    referenceImages,
    creditUserId,
    realCostUserId,
    isRegeneration = false,
    sceneId,
    endpoint,
    requestModel
  } = options;

  // Build request body based on provider
  let requestBody: any;
  let kieModelId: string | undefined; // Track KIE model for cost calculation
  const randomSeed = Math.floor(Math.random() * 2147483647);

  switch (provider) {
    case 'modal':
      requestBody = buildModalRequestBody(prompt, aspectRatio, resolution, referenceImages, randomSeed);
      break;

    case 'modal-edit':
      requestBody = buildModalEditRequestBody(prompt, aspectRatio, referenceImages, randomSeed);
      break;

    case 'kie':
      // Get model from config
      const config = await getProviderConfig({
        userId: userId || 'system',
        type: 'image'
      });

      // Use request model if provided, otherwise use config model
      kieModelId = requestModel || config.model || 'nano-banana-pro-2k';

      // KIE uses createTask with model and input structure - use model name as-is
      requestBody = buildKieRequestBody(prompt, aspectRatio, kieModelId, referenceImages);
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  // Make the API call using wrapper
  const response: ApiResponse = await callExternalApi({
    userId: userId || 'system',
    projectId,
    type: 'image',
    body: requestBody,
    endpoint,
    showLoadingMessage: true,
    loadingMessage: `Generating image using ${provider}...`,
  });

  console.log(`[Image API] ${provider} response:`, {
    status: response.status,
    hasData: !!response.data,
    dataType: typeof response.data,
    error: response.error,
    dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : null,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  // Get image URL based on provider
  let imageUrl: string;
  if (provider === 'kie') {
    imageUrl = await handleKieResponse(response, userId);
  } else if (provider === 'modal' || provider === 'modal-edit') {
    imageUrl = handleModalResponse(response);
  } else {
    throw new Error(`${provider} did not return an image`);
  }

  // Calculate costs
  let realCost = 0.09; // Default cost
  if (provider === 'kie' && kieModelId) {
    realCost = calculateKieRealCost(kieModelId);
  }

  const creditCost = getImageCreditCost(resolution);
  const actionType = isRegeneration ? 'regeneration' : 'generation';

  if (creditUserId) {
    await spendCredits(
      creditUserId,
      creditCost,
      'image',
      `${provider} image ${actionType} (${resolution.toUpperCase()})`,
      projectId,
      provider as any,
      { isRegeneration, sceneId },
      realCost
    );
  } else if (realCostUserId) {
    await trackRealCostOnly(
      realCostUserId,
      realCost,
      'image',
      `${provider} image ${actionType} (${resolution.toUpperCase()}) - prepaid`,
      projectId,
      provider as any,
      { isRegeneration, sceneId, prepaidRegeneration: true }
    );
  }

  // Upload to S3
  const uploadedImageUrl = await uploadMediaToS3(imageUrl, 'image', projectId);

  return { imageUrl: uploadedImageUrl, cost: realCost, storage: !uploadedImageUrl.startsWith('data:') ? 's3' : 'base64' };
}
