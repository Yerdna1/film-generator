'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Loader2 } from 'lucide-react';
import {
  usePendingRegenerationRequests,
  usePendingDeletionRequests,
  usePendingPromptEditRequests,
} from '@/hooks';
import {
  RegenerationRequestsSection,
  PromptEditRequestsSection,
  DeletionRequestsSection,
  type RegenerationRequestWithBatch,
} from './approval-panel';

interface ApprovalPanelProps {
  projectId: string;
  canApprove: boolean;
}

export function ApprovalPanel({ projectId, canApprove }: ApprovalPanelProps) {
  const t = useTranslations();

  // Use SWR hooks for data fetching with deduplication
  const {
    requests: deletionRequests,
    isLoading: isDeletionLoading,
    mutate: mutateDeletionRequests,
  } = usePendingDeletionRequests(projectId, { enabled: canApprove });

  const {
    requests: regenerationRequestsRaw,
    isLoading: isRegenerationLoading,
    mutate: mutateRegenerationRequests,
  } = usePendingRegenerationRequests(projectId, { enabled: canApprove });

  const {
    requests: promptEditRequests,
    isLoading: isPromptEditLoading,
    mutate: mutatePromptEditRequests,
  } = usePendingPromptEditRequests(projectId, { enabled: canApprove });

  // Cast to extended type with batchId
  const regenerationRequests = regenerationRequestsRaw as RegenerationRequestWithBatch[];
  const isLoading = isDeletionLoading || isRegenerationLoading || isPromptEditLoading;

  // Shared state for all sections
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);

  // Date formatting utility
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return t('collaborationModals.approvalPanel.justNow');
    if (diffHours < 24) return t('collaborationModals.approvalPanel.hoursAgo', { hours: diffHours });
    if (diffDays < 7) return t('collaborationModals.approvalPanel.daysAgo', { days: diffDays });
    return date.toLocaleDateString();
  };

  // Calculate pending counts
  const pendingDeletions = deletionRequests.filter((r) => r.status === 'pending');
  const pendingRegenerations = regenerationRequests.filter((r) => r.status === 'pending');
  const pendingPromptEdits = promptEditRequests.filter((r) => r.status === 'pending');
  const totalPending = pendingDeletions.length + pendingRegenerations.length + pendingPromptEdits.length;

  if (!canApprove) return null;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (totalPending === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('approvals.noRequests')}</p>
      </div>
    );
  }

  // Shared props for all sections
  const sharedProps = {
    projectId,
    processingId,
    setProcessingId,
    reviewNotes,
    setReviewNotes,
    showNoteInput,
    setShowNoteInput,
    formatDate,
  };

  return (
    <div className="space-y-6">
      {/* Regeneration Requests Section */}
      <RegenerationRequestsSection
        {...sharedProps}
        requests={regenerationRequests}
        mutate={mutateRegenerationRequests as any}
      />

      {/* Prompt Edit Requests Section */}
      <PromptEditRequestsSection
        {...sharedProps}
        requests={promptEditRequests}
        mutate={mutatePromptEditRequests as any}
      />

      {/* Deletion Requests Section */}
      <DeletionRequestsSection
        {...sharedProps}
        requests={deletionRequests}
        mutate={mutateDeletionRequests as any}
      />
    </div>
  );
}
