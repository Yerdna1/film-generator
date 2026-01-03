'use client';

import useSWR from 'swr';
import type { Notification } from '@/types/collaboration';

export interface NotificationsData {
  notifications: Notification[];
  unreadCount: number;
}

const fetcher = async (url: string): Promise<NotificationsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return res.json();
};

/**
 * Centralized hook for notifications data using SWR.
 * This deduplicates requests across components and provides caching.
 */
export function useNotifications(options?: { enabled?: boolean; limit?: number }) {
  const { enabled = true, limit = 20 } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<NotificationsData>(
    enabled ? `/api/notifications?limit=${limit}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      refreshInterval: 60000, // Poll every 60 seconds
    }
  );

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    refresh: () => mutate(),
    // Optimistic updates
    markAsRead: async (id: string) => {
      // Optimistically update the cache
      mutate(
        (current) =>
          current
            ? {
                ...current,
                notifications: current.notifications.map((n) =>
                  n.id === id ? { ...n, read: true } : n
                ),
                unreadCount: Math.max(0, current.unreadCount - 1),
              }
            : current,
        false
      );
      // Make the actual request
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    },
    markAllAsRead: async () => {
      // Optimistically update the cache
      mutate(
        (current) =>
          current
            ? {
                ...current,
                notifications: current.notifications.map((n) => ({ ...n, read: true })),
                unreadCount: 0,
              }
            : current,
        false
      );
      // Make the actual request
      await fetch('/api/notifications/read-all', { method: 'PUT' });
    },
  };
}
