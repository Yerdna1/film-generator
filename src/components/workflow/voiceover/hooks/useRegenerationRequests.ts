import { useState, useCallback, useEffect, useMemo } from 'react';
import type { RegenerationRequest, DeletionRequest } from '@/types/collaboration';

export function useRegenerationRequests(projectId: string) {
  const [regenerationRequests, setRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [approvedRegenerationRequests, setApprovedRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);

  // Fetch regeneration requests for this project
  const fetchRegenerationRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests?status=pending&type=audio`);
      if (response.ok) {
        const data = await response.json();
        setRegenerationRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch regeneration requests:', error);
    }
  }, [projectId]);

  // Fetch approved regeneration requests
  const fetchApprovedRegenerationRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests?status=approved,generating,selecting,awaiting_final&type=audio`);
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
      const response = await fetch(`/api/projects/${projectId}/deletion-requests?status=pending&type=audio`);
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

  // Create memoized sets for quick lookup
  const pendingAudioRegenLineIds = useMemo(() => {
    return new Set(
      regenerationRequests
        .filter(r => r.targetType === 'audio' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [regenerationRequests]);

  const pendingDeletionLineIds = useMemo(() => {
    return new Set(
      deletionRequests
        .filter(r => r.targetType === 'audio' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [deletionRequests]);

  const approvedRegenByLineId = useMemo(() => {
    const map = new Map<string, RegenerationRequest>();
    for (const req of approvedRegenerationRequests) {
      if (req.targetType === 'audio') {
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

  return {
    regenerationRequests,
    approvedRegenerationRequests,
    deletionRequests,
    pendingAudioRegenLineIds,
    pendingDeletionLineIds,
    approvedRegenByLineId,
    fetchDeletionRequests,
    handleUseRegenerationAttempt,
    handleSelectRegeneration,
  };
}