'use client';

import { useTranslations } from 'next-intl';
import { AnimatePresence } from 'framer-motion';
import { Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestCard } from './RequestCard';
import { type ApprovalSectionProps, deletionTargetIcons } from './types';
import type { DeletionRequest } from '@/types/collaboration';

interface DeletionRequestsSectionProps extends ApprovalSectionProps {
  requests: DeletionRequest[];
  mutate: (updater: (current: { requests: DeletionRequest[] } | undefined) => { requests: DeletionRequest[] } | undefined, revalidate: boolean) => void;
}

export function DeletionRequestsSection({
  projectId,
  requests,
  mutate,
  processingId,
  setProcessingId,
  reviewNotes,
  setReviewNotes,
  showNoteInput,
  setShowNoteInput,
  formatDate,
}: DeletionRequestsSectionProps) {
  const t = useTranslations();

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  if (pendingRequests.length === 0) return null;

  const handleDeletionAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/projects/${projectId}/deletion-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          reviewNote: reviewNotes[requestId] || undefined,
        }),
      });

      if (response.ok) {
        mutate(
          (current) => current ? { requests: current.requests.filter((r) => r.id !== requestId) } : current,
          false
        );
        setShowNoteInput(null);
      }
    } catch (e) {
      console.error('Failed to process deletion request:', e);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold">{t('collaborationModals.approvalPanel.deletionRequests')}</h3>
        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
          {pendingRequests.length}
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {pendingRequests.map((request) => {
            const Icon = deletionTargetIcons[request.targetType] || Trash2;
            const isProcessing = processingId === request.id;

            return (
              <RequestCard
                key={request.id}
                id={request.id}
                colorClass="orange"
                icon={<Icon className="w-5 h-5 text-orange-400" />}
                title={
                  <>
                    <span className="font-medium">
                      {t('collaborationModals.approvalPanel.deleteType', { type: request.targetType })}
                    </span>
                    {request.targetName && (
                      <span className="text-muted-foreground">"{request.targetName}"</span>
                    )}
                  </>
                }
                requesterName={request.requester?.name}
                requesterImage={request.requester?.image}
                createdAt={request.createdAt}
                reason={request.reason}
                isProcessing={isProcessing}
                showNoteInput={showNoteInput === request.id}
                reviewNote={reviewNotes[request.id] || ''}
                formatDate={formatDate}
                onShowNote={() => setShowNoteInput(request.id)}
                onNoteChange={(note) => setReviewNotes((prev) => ({ ...prev, [request.id]: note }))}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletionAction(request.id, 'rejected')}
                      disabled={isProcessing}
                      className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-1" />
                          {t('approvals.reject')}
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleDeletionAction(request.id, 'approved')}
                      disabled={isProcessing}
                      className="bg-red-600 hover:bg-red-500 text-white"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          {t('collaborationModals.approvalPanel.approveDelete')}
                        </>
                      )}
                    </Button>
                  </>
                }
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
