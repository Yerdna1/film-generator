import { useCallback } from 'react';
import type { DeletionRequest, RegenerationRequest, PromptEditRequest } from '@/types/collaboration';
import type { RequestType, ProjectInfo } from '../types';

interface UseApprovalActionsProps {
  setDeletionRequests: React.Dispatch<React.SetStateAction<(DeletionRequest & { project?: ProjectInfo })[]>>;
  setRegenerationRequests: React.Dispatch<React.SetStateAction<(RegenerationRequest & { project?: ProjectInfo })[]>>;
  setPromptEditRequests: React.Dispatch<React.SetStateAction<(PromptEditRequest & { project?: ProjectInfo })[]>>;
  setProcessingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  filteredDeletions: (DeletionRequest & { project?: ProjectInfo })[];
  filteredRegenerations: (RegenerationRequest & { project?: ProjectInfo })[];
  filteredPromptEdits: (PromptEditRequest & { project?: ProjectInfo })[];
}

export const useApprovalActions = ({
  setDeletionRequests,
  setRegenerationRequests,
  setPromptEditRequests,
  setProcessingIds,
  filteredDeletions,
  filteredRegenerations,
  filteredPromptEdits,
}: UseApprovalActionsProps) => {
  const withProcessing = useCallback(async (id: string, fn: () => Promise<void>) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await fn();
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [setProcessingIds]);

  const handleDeletionAction = useCallback(async (request: DeletionRequest, action: 'approved' | 'rejected') => {
    await withProcessing(request.id, async () => {
      const response = await fetch(`/api/projects/${request.projectId}/deletion-requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: action === 'approved' }),
      });
      if (response.ok) {
        setDeletionRequests(prev => prev.filter(r => r.id !== request.id));
      }
    });
  }, [withProcessing, setDeletionRequests]);

  const handleRegenerationAction = useCallback(async (request: RegenerationRequest, approved: boolean) => {
    await withProcessing(request.id, async () => {
      const response = await fetch(`/api/projects/${request.projectId}/regeneration-requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      if (response.ok) {
        setRegenerationRequests(prev => prev.filter(r => r.id !== request.id));
      }
    });
  }, [withProcessing, setRegenerationRequests]);

  const handleFinalApproval = useCallback(async (request: RegenerationRequest, action: 'final_approve' | 'final_reject') => {
    await withProcessing(request.id, async () => {
      const response = await fetch(`/api/projects/${request.projectId}/regeneration-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        setRegenerationRequests(prev => prev.filter(r => r.id !== request.id));
      }
    });
  }, [withProcessing, setRegenerationRequests]);

  const handlePromptEditAction = useCallback(async (request: PromptEditRequest, action: 'approve' | 'revert') => {
    await withProcessing(request.id, async () => {
      const response = await fetch(`/api/projects/${request.projectId}/prompt-edits/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        setPromptEditRequests(prev => prev.filter(r => r.id !== request.id));
      }
    });
  }, [withProcessing, setPromptEditRequests]);

  const handleBulkApproveByUser = useCallback(async (type: RequestType, userId: string) => {
    const requests = type === 'deletion'
      ? filteredDeletions.filter(r => r.requesterId === userId)
      : type === 'regeneration'
      ? filteredRegenerations.filter(r => r.requesterId === userId)
      : filteredPromptEdits.filter(r => r.requesterId === userId);

    for (const request of requests) {
      if (type === 'deletion') {
        await handleDeletionAction(request as DeletionRequest, 'approved');
      } else if (type === 'regeneration') {
        await handleRegenerationAction(request as RegenerationRequest, true);
      } else {
        await handlePromptEditAction(request as PromptEditRequest, 'approve');
      }
    }
  }, [filteredDeletions, filteredRegenerations, filteredPromptEdits, handleDeletionAction, handleRegenerationAction, handlePromptEditAction]);

  return {
    handleDeletionAction,
    handleRegenerationAction,
    handleFinalApproval,
    handlePromptEditAction,
    handleBulkApproveByUser,
  };
};
