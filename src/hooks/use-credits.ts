'use client';

import useSWR from 'swr';
import { COSTS } from '@/lib/services/credits';

export interface CreditsData {
  credits: {
    balance: number;
    totalSpent: number;
    totalEarned: number;
  };
  costs: typeof COSTS;
  transactions?: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
  }>;
}

const fetcher = async (url: string): Promise<CreditsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch credits');
  }
  return res.json();
};

/**
 * Centralized hook for credits data using SWR.
 * This deduplicates requests across components and provides caching.
 */
export function useCredits(options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<CreditsData>(
    enabled ? '/api/credits?history=true&limit=10' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      refreshInterval: 60000, // Refresh every minute in background
    }
  );

  // Force refresh bypasses server cache by fetching with refresh=true
  const forceRefresh = async () => {
    const freshData = await fetcher('/api/credits?history=true&limit=10&refresh=true');
    mutate(freshData, false); // Update SWR cache without revalidation
  };

  return {
    data,
    isLoading,
    error,
    refresh: forceRefresh,
  };
}

/**
 * Trigger a global refresh of credits data.
 * Can be called from anywhere to update credits across all components.
 */
export function refreshCredits() {
  // Dispatch event for any legacy listeners
  window.dispatchEvent(new CustomEvent('credits-updated'));
}
