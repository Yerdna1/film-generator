'use client';

import useSWR from 'swr';
import type { PromptEditRequest } from '@/types/collaboration';

export interface PromptEditRequestsData {
  requests: PromptEditRequest[];
}

const fetcher = async (url: string): Promise<PromptEditRequestsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch prompt edit requests');
  }
  return res.json();
};

/**
 * Centralized hook for prompt edit requests using SWR.
 * Provides deduplication and caching across components.
 */
export function usePromptEditRequests(
  projectId: string | null,
  options?: {
    enabled?: boolean;
    status?: string; // 'pending', 'approved', 'rejected', or undefined for all
  }
) {
  const { enabled = true, status = 'pending' } = options ?? {};

  const url = status
    ? `/api/projects/${projectId}/prompt-edits?status=${status}`
    : `/api/projects/${projectId}/prompt-edits`;

  const { data, error, isLoading, mutate } = useSWR<PromptEditRequestsData>(
    enabled && projectId ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      refreshInterval: 60000, // Refresh every 60 seconds
    }
  );

  return {
    requests: data?.requests ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
    mutate,
  };
}

/**
 * Hook specifically for pending prompt edit requests.
 */
export function usePendingPromptEditRequests(
  projectId: string | null,
  options?: { enabled?: boolean }
) {
  return usePromptEditRequests(projectId, {
    ...options,
    status: 'pending',
  });
}
