'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import NextImage from 'next/image';
import {
  RefreshCw,
  Check,
  X,
  Clock,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RequestCard } from './RequestCard';
import {
  type RegenerationRequestWithBatch,
  type BatchGroup,
  type ApprovalSectionProps,
  regenerationTargetIcons,
} from './types';

interface RegenerationRequestsSectionProps extends ApprovalSectionProps {
  requests: RegenerationRequestWithBatch[];
  mutate: (updater: (current: { requests: RegenerationRequestWithBatch[] } | undefined) => { requests: RegenerationRequestWithBatch[] } | undefined, revalidate: boolean) => void;
}

export function RegenerationRequestsSection({
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
}: RegenerationRequestsSectionProps) {
  const t = useTranslations();
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // Group regeneration requests by batchId
  const { batchGroups, singleRequests } = useMemo(() => {
    const batches = new Map<string, RegenerationRequestWithBatch[]>();
    const singles: RegenerationRequestWithBatch[] = [];

    for (const request of requests) {
      if (request.batchId) {
        if (!batches.has(request.batchId)) {
          batches.set(request.batchId, []);
        }
        batches.get(request.batchId)!.push(request);
      } else {
        singles.push(request);
      }
    }

    const groups: BatchGroup[] = [];
    for (const [batchId, batchRequests] of batches) {
      if (batchRequests.length > 0) {
        groups.push({
          batchId,
          requests: batchRequests,
          targetType: batchRequests[0].targetType as 'image' | 'video',
          requester: batchRequests[0].requester,
          reason: batchRequests[0].reason,
          createdAt: batchRequests[0].createdAt,
        });
      }
    }

    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { batchGroups: groups, singleRequests: singles };
  }, [requests]);

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  if (pendingRequests.length === 0) return null;

  const toggleBatchExpanded = (batchId: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const handleRegenerationAction = async (requestId: string, approved: boolean) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          note: reviewNotes[requestId] || undefined,
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
      console.error('Failed to process regeneration request:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchAction = async (batchId: string, approved: boolean) => {
    setProcessingBatchId(batchId);
    try {
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          approved,
          note: reviewNotes[`batch_${batchId}`] || undefined,
        }),
      });

      if (response.ok) {
        mutate(
          (current) => current ? { requests: current.requests.filter((r) => r.batchId !== batchId) } : current,
          false
        );
        setShowNoteInput(null);
        setExpandedBatches((prev) => {
          const next = new Set(prev);
          next.delete(batchId);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to process batch regeneration request:', e);
    } finally {
      setProcessingBatchId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold">{t('collaborationModals.approvalPanel.regenerationRequests')}</h3>
        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
          {pendingRequests.length}
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {/* Batch Groups */}
          {batchGroups.map((batch) => {
            const Icon = regenerationTargetIcons[batch.targetType] || RefreshCw;
            const isProcessing = processingBatchId === batch.batchId;
            const isExpanded = expandedBatches.has(batch.batchId);
            const pendingInBatch = batch.requests.filter((r) => r.status === 'pending');

            if (pendingInBatch.length === 0) return null;

            return (
              <motion.div
                key={batch.batchId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg overflow-hidden"
              >
                {/* Batch Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-cyan-500/10 transition-colors"
                  onClick={() => toggleBatchExpanded(batch.batchId)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5 text-cyan-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className="font-medium text-cyan-400">
                          {t('collaborationModals.approvalPanel.itemsRequested', { count: pendingInBatch.length, type: batch.targetType })}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs">
                          {t('collaborationModals.approvalPanel.batch')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={batch.requester?.image || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {batch.requester?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{batch.requester?.name || t('common.unknown')}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(batch.createdAt)}</span>
                      </div>

                      {batch.reason && (
                        <div className="mt-2 p-2 bg-white/5 rounded text-sm text-muted-foreground">
                          "{batch.reason}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch Actions */}
                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-cyan-500/10">
                    {showNoteInput !== `batch_${batch.batchId}` && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNoteInput(`batch_${batch.batchId}`);
                        }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBatchAction(batch.batchId, false);
                      }}
                      disabled={isProcessing}
                      className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-1" />
                          {t('collaborationModals.approvalPanel.rejectAll')}
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBatchAction(batch.batchId, true);
                      }}
                      disabled={isProcessing}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          {t('collaborationModals.approvalPanel.approveAll', { count: pendingInBatch.length })}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Review note input for batch */}
                  {showNoteInput === `batch_${batch.batchId}` && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-3 mt-3 border-t border-cyan-500/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Textarea
                        value={reviewNotes[`batch_${batch.batchId}`] || ''}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({ ...prev, [`batch_${batch.batchId}`]: e.target.value }))
                        }
                        placeholder={t('collaborationModals.approvalPanel.addBatchNotePlaceholder')}
                        className="bg-white/5 border-white/10 min-h-[60px] text-sm"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Expanded Items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-cyan-500/20 bg-black/20"
                    >
                      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                        {pendingInBatch.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center gap-3 p-2 rounded bg-white/5"
                          >
                            <div className="relative w-12 h-7 rounded overflow-hidden bg-black/30 flex-shrink-0">
                              {request.scene?.imageUrl ? (
                                <NextImage
                                  src={request.scene.imageUrl}
                                  alt={request.scene?.title || 'Scene'}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-3 h-3 text-muted-foreground/50" />
                                </div>
                              )}
                              <div className="absolute bottom-0 right-0 p-0.5 bg-cyan-500/80 rounded-tl">
                                <Icon className="w-2 h-2 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {request.targetName || `Scene ${request.scene?.number || t('common.unknown')}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Single Requests */}
          {singleRequests
            .filter((r) => r.status === 'pending')
            .map((request) => {
              const Icon = regenerationTargetIcons[request.targetType] || RefreshCw;
              const isProcessing = processingId === request.id;

              return (
                <RequestCard
                  key={request.id}
                  id={request.id}
                  colorClass="cyan"
                  icon={<Icon className="w-5 h-5 text-cyan-400" />}
                  title={
                    <>
                      <span className="font-medium">
                        {t('collaborationModals.approvalPanel.regenerateType', { type: request.targetType })}
                      </span>
                      {request.targetName && (
                        <span className="text-muted-foreground truncate">"{request.targetName}"</span>
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
                        onClick={() => handleRegenerationAction(request.id, false)}
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
                        onClick={() => handleRegenerationAction(request.id, true)}
                        disabled={isProcessing}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            {t('collaborationModals.approvalPanel.approveAndRegenerate')}
                          </>
                        )}
                      </Button>
                    </>
                  }
                >
                  {/* Scene thumbnail */}
                  {request.scene?.imageUrl && (
                    <div className="relative w-16 h-9 rounded overflow-hidden bg-black/30 flex-shrink-0 mt-2">
                      <NextImage
                        src={request.scene.imageUrl}
                        alt={request.scene?.title || 'Scene'}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                </RequestCard>
              );
            })}
        </AnimatePresence>
      </div>
    </div>
  );
}
