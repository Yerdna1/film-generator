import { useState, useEffect, useCallback } from 'react';
import type { DeletionRequest, RegenerationRequest, PromptEditRequest } from '@/types/collaboration';
import type { ProjectInfo } from '../types';

interface UseApprovalDataProps {
  isAdmin: boolean;
}

export const useApprovalData = ({ isAdmin }: UseApprovalDataProps) => {
  const [deletionRequests, setDeletionRequests] = useState<(DeletionRequest & { project?: ProjectInfo })[]>([]);
  const [regenerationRequests, setRegenerationRequests] = useState<(RegenerationRequest & { project?: ProjectInfo })[]>([]);
  const [promptEditRequests, setPromptEditRequests] = useState<(PromptEditRequest & { project?: ProjectInfo })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchAllRequests = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const response = await fetch('/api/admin/approvals');
      if (response.ok) {
        const data = await response.json();
        setDeletionRequests(data.deletionRequests || []);
        setRegenerationRequests(data.regenerationRequests || []);
        setPromptEditRequests(data.promptEditRequests || []);
      }
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  return {
    deletionRequests,
    regenerationRequests,
    promptEditRequests,
    isLoading,
    processingIds,
    setDeletionRequests,
    setRegenerationRequests,
    setPromptEditRequests,
    setProcessingIds,
    fetchAllRequests,
  };
};
