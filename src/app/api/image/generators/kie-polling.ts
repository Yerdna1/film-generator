import { getProviderConfig } from '@/lib/providers';

const KIE_API_URL = 'https://api.kie.ai';

interface KieStatusResponse {
  code: number;
  data: {
    state: string;
    resultJson?: string;
    imageUrl?: string;
    image_url?: string;
    resultUrl?: string;
    fail_reason?: string;
  };
}

/**
 * Safely extract error from resultJson string
 */
function extractErrorFromResultJson(resultJson?: string): string | undefined {
  if (!resultJson) return undefined;
  try {
    const result = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
    return result.error;
  } catch {
    return undefined;
  }
}

/**
 * Poll KIE task for completion
 */
export async function pollKieTask(
  taskId: string,
  userId: string | undefined
): Promise<string> {
  // Get API key from config for polling
  const configForPolling = await getProviderConfig({
    userId: userId || 'system',
    type: 'image'
  });

  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusResponse = await fetch(`${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${configForPolling.apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check KIE status: ${statusResponse.statusText}`);
    }

    const statusData: KieStatusResponse = await statusResponse.json();

    // Check if we have the expected response structure
    if (statusData.code !== 200) {
      const resultJsonError = extractErrorFromResultJson(statusData.data?.resultJson);
      throw new Error(statusData.data?.fail_reason || resultJsonError || 'Failed to check task status');
    }

    const taskData = statusData.data;
    const state = taskData?.state;

    console.log(`[KIE] Status: ${state}, attempt ${attempts + 1}/${maxAttempts}`);

    if (state === 'success') {
      // Extract image URL from resultJson
      let imageUrl: string | undefined;
      if (taskData.resultJson) {
        try {
          const result = typeof taskData.resultJson === 'string'
            ? JSON.parse(taskData.resultJson)
            : taskData.resultJson;
          imageUrl = result.resultUrls?.[0] || result.imageUrl || result.image_url || result.url;
          if (!imageUrl && result.images?.length > 0) {
            imageUrl = result.images[0];
          }
        } catch (e) {
          console.error('[KIE] Failed to parse resultJson:', e);
        }
      }

      // Fallback to direct URL fields
      if (!imageUrl) {
        imageUrl = taskData.imageUrl || taskData.image_url || taskData.resultUrl;
      }

      if (!imageUrl) {
        throw new Error('KIE completed but no image URL in result');
      }
      return imageUrl;
    }

    if (state === 'fail') {
      const resultJsonError = extractErrorFromResultJson(taskData.resultJson);
      const failReason = taskData.fail_reason || resultJsonError || 'Unknown error';
      throw new Error(`KIE task failed: ${failReason}`);
    }

    attempts++;
  }

  throw new Error('KIE task timed out');
}
