'use client';

import useSWR from 'swr';
import type { DeletionRequest } from '@/types/collaboration';

export interface DeletionRequestsData {
  requests: DeletionRequest[];
}

const fetcher = async (url: string): Promise<DeletionRequestsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch deletion requests');
  }
  return res.json();
};

/**
 * Centralized hook for deletion requests using SWR.
 * Provides deduplication and caching across components.
 */
export function useDeletionRequests(
  projectId: string | null,
  options?: {
    enabled?: boolean;
    status?: string; // 'pending', 'approved', 'rejected', or undefined for all
  }
) {
  const { enabled = true, status = 'pending' } = options ?? {};

  const url = status
    ? `/api/projects/${projectId}/deletion-requests?status=${status}`
    : `/api/projects/${projectId}/deletion-requests`;

  const { data, error, isLoading, mutate } = useSWR<DeletionRequestsData>(
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
 * Hook specifically for pending deletion requests.
 */
export function usePendingDeletionRequests(
  projectId: string | null,
  options?: { enabled?: boolean }
) {
  return useDeletionRequests(projectId, {
    ...options,
    status: 'pending',
  });
}
