'use client';

import useSWR from 'swr';

export interface SubscriptionData {
  subscription: {
    plan: string | null;
    status?: string;
  } | null;
  customer?: {
    id: string;
    email: string;
  } | null;
}

const fetcher = async (url: string): Promise<SubscriptionData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch subscription');
  }
  return res.json();
};

/**
 * Centralized hook for subscription/polar data using SWR.
 * This deduplicates requests across components and provides caching.
 */
export function useSubscription(options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<SubscriptionData>(
    enabled ? '/api/polar' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
      refreshInterval: 300000, // Refresh every 5 minutes in background
    }
  );

  const plan = data?.subscription?.plan || 'free';

  return {
    data,
    plan,
    isLoading,
    error,
    refresh: () => mutate(),
  };
}
