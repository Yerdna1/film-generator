'use client';

import useSWR from 'swr';
import type { RegenerationRequest } from '@/types/collaboration';

export interface RegenerationRequestsData {
  requests: RegenerationRequest[];
}

const fetcher = async (url: string): Promise<RegenerationRequestsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch regeneration requests');
  }
  return res.json();
};

/**
 * Centralized hook for regeneration requests using SWR.
 * Provides deduplication and caching across components.
 */
export function useRegenerationRequests(
  projectId: string | null,
  options?: {
    enabled?: boolean;
    status?: string; // 'pending', 'approved', 'approved,generating,selecting,awaiting_final', etc.
  }
) {
  const { enabled = true, status = 'pending' } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<RegenerationRequestsData>(
    enabled && projectId
      ? `/api/projects/${projectId}/regeneration-requests?status=${status}`
      : null,
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
 * Hook specifically for pending regeneration requests (admin view).
 */
export function usePendingRegenerationRequests(
  projectId: string | null,
  options?: { enabled?: boolean }
) {
  return useRegenerationRequests(projectId, {
    ...options,
    status: 'pending',
  });
}

/**
 * Hook for approved/active regeneration requests (collaborator view).
 */
export function useApprovedRegenerationRequests(
  projectId: string | null,
  options?: { enabled?: boolean }
) {
  return useRegenerationRequests(projectId, {
    ...options,
    status: 'approved,generating,selecting,awaiting_final',
  });
}
