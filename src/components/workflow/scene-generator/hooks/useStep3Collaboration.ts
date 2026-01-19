'use client';

import { useMemo, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Scene } from '@/types/project';
import type { RegenerationRequest } from '@/types/collaboration';
import { usePendingRegenerationRequests, useApprovedRegenerationRequests, usePendingDeletionRequests } from '@/hooks';

export function useStep3Collaboration(projectId: string, scenes: Scene[]) {
  const { updateScene } = useProjectStore();

  // Use SWR hooks for collaboration data with deduplication
  const {
    requests: regenerationRequests,
    refresh: refreshPendingRegenRequests,
  } = usePendingRegenerationRequests(projectId);

  const {
    requests: approvedRegenerationRequests,
    refresh: refreshApprovedRegenRequests,
  } = useApprovedRegenerationRequests(projectId);

  const {
    requests: deletionRequests,
    refresh: refreshDeletionRequests,
  } = usePendingDeletionRequests(projectId);

  // Create a set of scene IDs with pending image regeneration requests
  const pendingImageRegenSceneIds = useMemo(() => {
    return new Set(
      regenerationRequests
        .filter(r => r.targetType === 'image' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [regenerationRequests]);

  // Create a set of scene IDs with pending deletion requests
  const pendingDeletionSceneIds = useMemo(() => {
    return new Set(
      deletionRequests
        .filter(r => r.targetType === 'scene' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [deletionRequests]);

  // Create a map of scene ID to approved regeneration request
  const approvedRegenBySceneId = useMemo(() => {
    const map = new Map<string, RegenerationRequest>();
    for (const req of approvedRegenerationRequests) {
      if (req.targetType === 'image') {
        map.set(req.targetId, req);
      }
    }
    return map;
  }, [approvedRegenerationRequests]);

  // Refresh functions
  const fetchRegenerationRequests = useCallback(() => {
    refreshPendingRegenRequests();
  }, [refreshPendingRegenRequests]);

  const fetchDeletionRequests = useCallback(() => {
    refreshDeletionRequests();
  }, [refreshDeletionRequests]);

  const fetchApprovedRegenerationRequests = useCallback(() => {
    refreshApprovedRegenRequests();
  }, [refreshApprovedRegenRequests]);

  // Handler for using a regeneration attempt
  const handleUseRegenerationAttempt = useCallback(async (requestId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to regenerate');
      }

      await fetchApprovedRegenerationRequests();
    } catch (error) {
      console.error('Failed to use regeneration attempt:', error);
      throw error;
    }
  }, [projectId, fetchApprovedRegenerationRequests]);

  // Handler for selecting the best regeneration
  const handleSelectRegeneration = useCallback(async (requestId: string, selectedUrl: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', selectedUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit selection');
      }

      await fetchApprovedRegenerationRequests();
    } catch (error) {
      console.error('Failed to select regeneration:', error);
      throw error;
    }
  }, [projectId, fetchApprovedRegenerationRequests]);

  // Handler for toggling scene lock status (admin only)
  const handleToggleLock = useCallback(async (sceneId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/scenes/${sceneId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle lock');
      }

      const data = await response.json();
      // Update local scene state directly
      useProjectStore.setState((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                scenes: p.scenes?.map((s) => (s.id === sceneId ? { ...s, locked: data.locked } : s)),
              }
            : p
        ),
        currentProject:
          state.currentProject?.id === projectId
            ? {
                ...state.currentProject,
                scenes: state.currentProject.scenes?.map((s) =>
                  s.id === sceneId ? { ...s, locked: data.locked } : s
                ),
              }
            : state.currentProject,
      }));
    } catch (error) {
      console.error('Failed to toggle scene lock:', error);
      throw error;
    }
  }, [projectId]);

  return {
    pendingImageRegenSceneIds,
    pendingDeletionSceneIds,
    approvedRegenBySceneId,
    handleUseRegenerationAttempt,
    handleSelectRegeneration,
    handleToggleLock,
    fetchRegenerationRequests,
    fetchDeletionRequests,
  };
}
