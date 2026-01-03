'use client';

import useSWR from 'swr';
import type { ProjectMember, ProjectInvitation } from '@/types/collaboration';

export interface ProjectMembersData {
  members: ProjectMember[];
}

export interface ProjectInvitationsData {
  invitations: ProjectInvitation[];
}

const membersFetcher = async (url: string): Promise<ProjectMembersData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch project members');
  }
  return res.json();
};

const invitationsFetcher = async (url: string): Promise<ProjectInvitationsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch invitations');
  }
  return res.json();
};

/**
 * Centralized hook for project members using SWR.
 * Provides deduplication and caching across components.
 */
export function useProjectMembers(
  projectId: string | null,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<ProjectMembersData>(
    enabled && projectId ? `/api/projects/${projectId}/members` : null,
    membersFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      refreshInterval: 120000, // Refresh every 2 minutes
    }
  );

  return {
    members: data?.members ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
    mutate,
    // Optimistic update helper
    updateMember: async (memberId: string, updates: Partial<ProjectMember>) => {
      mutate(
        (current) =>
          current
            ? {
                ...current,
                members: current.members.map((m) =>
                  m.id === memberId ? { ...m, ...updates } : m
                ),
              }
            : current,
        false
      );
    },
    removeMember: async (memberId: string) => {
      mutate(
        (current) =>
          current
            ? {
                ...current,
                members: current.members.filter((m) => m.id !== memberId),
              }
            : current,
        false
      );
    },
  };
}

/**
 * Centralized hook for project invitations using SWR.
 * Provides deduplication and caching across components.
 */
export function useProjectInvitations(
  projectId: string | null,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<ProjectInvitationsData>(
    enabled && projectId ? `/api/projects/${projectId}/invitations` : null,
    invitationsFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      refreshInterval: 120000, // Refresh every 2 minutes
    }
  );

  // Filter to only pending invitations
  const pendingInvitations = (data?.invitations ?? []).filter(
    (i) => i.status === 'pending'
  );

  return {
    invitations: data?.invitations ?? [],
    pendingInvitations,
    isLoading,
    error,
    refresh: () => mutate(),
    mutate,
    // Optimistic update helper
    removeInvitation: async (inviteId: string) => {
      mutate(
        (current) =>
          current
            ? {
                ...current,
                invitations: current.invitations.filter((i) => i.id !== inviteId),
              }
            : current,
        false
      );
    },
  };
}
