/**
 * KIE.ai specific utilities
 */

import { getEndpointUrl, getProviderHeaders } from '@/lib/constants/api-endpoints';

/**
 * Helper function for KIE task polling
 */
export async function pollKieTask(
  taskId: string,
  apiKey: string,
  maxPolls: number = 60,
  pollInterval: number = 2000
): Promise<any> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const statusUrl = `${getEndpointUrl('kie', 'taskStatus')}?taskId=${taskId}`;
    const headers = getProviderHeaders('kie', apiKey);

    const response = await fetch(statusUrl, {
      headers,
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      throw new Error(data.msg || data.message || 'Failed to check KIE task status');
    }

    const taskData = data.data;
    const state = taskData?.state;

    if (state === 'success') {
      return taskData;
    } else if (state === 'fail') {
      const failReason = taskData?.fail_reason || taskData?.resultJson?.error || 'Unknown error';
      throw new Error(`KIE task failed: ${failReason}`);
    } else if (state !== 'waiting' && state !== 'queuing' && state !== 'generating') {
      throw new Error(`Unknown KIE task state: ${state}`);
    }
  }

  throw new Error('KIE task timed out');
}