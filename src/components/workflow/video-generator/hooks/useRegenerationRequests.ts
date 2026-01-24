import { useState, useEffect, useCallback, useMemo } from 'react';
import type { RegenerationRequest, DeletionRequest } from '@/types/collaboration';

export function useRegenerationRequests(projectId: string) {
  // Regeneration requests state
  const [regenerationRequests, setRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [approvedRegenerationRequests, setApprovedRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [showRequestRegenDialog, setShowRequestRegenDialog] = useState(false);

  // Deletion requests state
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);

  // Fetch regeneration requests for this project
  const fetchRegenerationRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests?status=pending`);
      if (response.ok) {
        const data = await response.json();
        setRegenerationRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch regeneration requests:', error);
    }
  }, [projectId]);

  // Fetch approved/active regeneration requests for collaborators
  const fetchApprovedRegenerationRequests = useCallback(async () => {
    try {
      // Fetch requests in 'approved', 'generating', 'selecting', or 'awaiting_final' status
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests?status=approved,generating,selecting,awaiting_final`);
      if (response.ok) {
        const data = await response.json();
        setApprovedRegenerationRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch approved regeneration requests:', error);
    }
  }, [projectId]);

  // Fetch deletion requests for this project
  const fetchDeletionRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/deletion-requests?status=pending`);
      if (response.ok) {
        const data = await response.json();
        setDeletionRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch deletion requests:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRegenerationRequests();
    fetchApprovedRegenerationRequests();
    fetchDeletionRequests();
  }, [fetchRegenerationRequests, fetchApprovedRegenerationRequests, fetchDeletionRequests]);

  // Create a set of scene IDs with pending video regeneration requests
  const pendingVideoRegenSceneIds = useMemo(() => {
    return new Set(
      regenerationRequests
        .filter(r => r.targetType === 'video' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [regenerationRequests]);

  // Create a set of scene IDs with pending deletion requests
  const pendingDeletionSceneIds = useMemo(() => {
    return new Set(
      deletionRequests
        .filter(r => r.targetType === 'video' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [deletionRequests]);

  // Create a map of scene ID to approved regeneration request
  const approvedRegenBySceneId = useMemo(() => {
    const map = new Map<string, RegenerationRequest>();
    for (const req of approvedRegenerationRequests) {
      if (req.targetType === 'video') {
        map.set(req.targetId, req);
      }
    }
    return map;
  }, [approvedRegenerationRequests]);

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

      // Refresh approved requests to get updated status
      await fetchApprovedRegenerationRequests();
    } catch (error) {
      console.error('Failed to use regeneration attempt:', error);
      throw error; // Re-throw so modal can show error
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

      // Refresh approved requests
      await fetchApprovedRegenerationRequests();
    } catch (error) {
      console.error('Failed to select regeneration:', error);
      throw error;
    }
  }, [projectId, fetchApprovedRegenerationRequests]);

  return {
    // State
    regenerationRequests,
    approvedRegenerationRequests,
    deletionRequests,
    showRequestRegenDialog,
    setShowRequestRegenDialog,

    // Computed
    pendingVideoRegenSceneIds,
    pendingDeletionSceneIds,
    approvedRegenBySceneId,

    // Actions
    fetchRegenerationRequests,
    fetchApprovedRegenerationRequests,
    fetchDeletionRequests,
    handleUseRegenerationAttempt,
    handleSelectRegeneration,
  };
}
