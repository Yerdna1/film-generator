'use client';

import useSWR from 'swr';

export interface StatisticsData {
  stats: {
    total: number;
    byType: {
      image?: { count: number; cost: number };
      video?: { count: number; cost: number };
      voiceover?: { count: number; cost: number };
      scene?: { count: number; cost: number };
      character?: { count: number; cost: number };
      prompt?: { count: number; cost: number };
    };
  };
}

export interface CreditsBreakdown {
  images: number;
  videos: number;
  voiceovers: number;
  scenes: number;
  other: number;
}

const fetcher = async (url: string): Promise<StatisticsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch statistics');
  }
  return res.json();
};

/**
 * Centralized hook for statistics data using SWR.
 * This deduplicates requests across components and provides caching.
 */
export function useStatistics(options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<StatisticsData>(
    enabled ? '/api/statistics' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
      refreshInterval: 120000, // Refresh every 2 minutes
    }
  );

  // Extract breakdown from statistics
  const breakdown: CreditsBreakdown = {
    images: data?.stats?.byType?.image?.count || 0,
    videos: data?.stats?.byType?.video?.count || 0,
    voiceovers: data?.stats?.byType?.voiceover?.count || 0,
    scenes: data?.stats?.byType?.scene?.count || 0,
    other: (data?.stats?.byType?.character?.count || 0) + (data?.stats?.byType?.prompt?.count || 0),
  };

  return {
    data,
    breakdown,
    isLoading,
    error,
    refresh: () => mutate(),
  };
}
