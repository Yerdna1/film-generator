'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Check,
  X,
  Clock,
  Loader2,
  MessageSquare,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type ApprovalSectionProps, fieldLabels } from './types';
import type { PromptEditRequest } from '@/types/collaboration';

interface PromptEditRequestsSectionProps extends ApprovalSectionProps {
  requests: PromptEditRequest[];
  mutate: (updater: (current: { requests: PromptEditRequest[] } | undefined) => { requests: PromptEditRequest[] } | undefined, revalidate: boolean) => void;
}

export function PromptEditRequestsSection({
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
}: PromptEditRequestsSectionProps) {
  const t = useTranslations();
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  if (pendingRequests.length === 0) return null;

  const handlePromptEditAction = async (requestId: string, action: 'approve' | 'reject' | 'revert') => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/projects/${projectId}/prompt-edits/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNote: reviewNotes[requestId] || undefined,
        }),
      });

      if (response.ok) {
        mutate(
          (current) => current ? { requests: current.requests.filter((r) => r.id !== requestId) } : current,
          false
        );
        setShowNoteInput(null);
        setExpandedDiff(null);
      }
    } catch (e) {
      console.error('Failed to process prompt edit request:', e);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold">{t('collaborationModals.approvalPanel.promptEdits')}</h3>
        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
          {pendingRequests.length}
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {pendingRequests.map((request) => {
            const isProcessing = processingId === request.id;
            const isExpanded = expandedDiff === request.id;

            return (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{fieldLabels[request.fieldName] || request.fieldName}</span>
                      {request.sceneName && (
                        <span className="text-muted-foreground">Scene: "{request.sceneName}"</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={request.requester?.image || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {request.requester?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{request.requester?.name || t('common.unknown')}</span>
                      <span>·</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(request.createdAt)}</span>
                    </div>

                    {/* Toggle diff view */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedDiff(isExpanded ? null : request.id)}
                      className="mt-2 text-purple-400 hover:text-purple-300 h-7 px-2"
                    >
                      {isExpanded ? t('collaborationModals.approvalPanel.hideChanges') : t('collaborationModals.approvalPanel.showChanges')}
                    </Button>
                  </div>
                </div>

                {/* Before/After Diff */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* Before - Red */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                        <X className="w-3 h-3" />
                        {t('approvals.before')}
                      </div>
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg max-h-32 overflow-y-auto">
                        <pre className="text-xs text-red-200 whitespace-pre-wrap font-mono break-words">
                          {request.oldValue || t('approvals.empty')}
                        </pre>
                      </div>
                    </div>

                    {/* After - Green */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-green-400">
                        <Check className="w-3 h-3" />
                        {t('approvals.after')}
                      </div>
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg max-h-32 overflow-y-auto">
                        <pre className="text-xs text-green-200 whitespace-pre-wrap font-mono break-words">
                          {request.newValue || t('approvals.empty')}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Review note input */}
                {showNoteInput === request.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2"
                  >
                    <Textarea
                      value={reviewNotes[request.id] || ''}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                      }
                      placeholder={t('collaborationModals.approvalPanel.addNotePlaceholder')}
                      className="bg-white/5 border-white/10 min-h-[60px] text-sm"
                    />
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {showNoteInput !== request.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNoteInput(request.id)}
                      className="text-muted-foreground"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {t('collaborationModals.approvalPanel.addNote')}
                    </Button>
                  )}

                  <div className="flex-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePromptEditAction(request.id, 'revert')}
                    disabled={isProcessing}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Undo2 className="w-4 h-4 mr-1" />
                        {t('approvals.revert')}
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handlePromptEditAction(request.id, 'approve')}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-500 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        {t('approvals.accept')}
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
