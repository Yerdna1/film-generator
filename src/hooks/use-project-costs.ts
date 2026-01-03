'use client';

import useSWR from 'swr';

export interface ProjectCostsData {
  costs: Record<string, { credits: number; realCost: number }>;
  multiplier: number;
  isAdmin: boolean;
}

const fetcher = async (url: string): Promise<ProjectCostsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch project costs');
  }
  return res.json();
};

/**
 * Centralized hook for project costs data using SWR.
 * This deduplicates requests across components and provides caching.
 */
export function useProjectCosts(options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<ProjectCostsData>(
    enabled ? '/api/projects/costs' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
      refreshInterval: 120000, // Refresh every 2 minutes
    }
  );

  return {
    data,
    isLoading,
    error,
    refresh: () => mutate(),
  };
}
