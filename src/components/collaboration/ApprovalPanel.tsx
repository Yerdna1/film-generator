'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import NextImage from 'next/image';
import {
  Shield,
  Check,
  X,
  Clock,
  Trash2,
  Film,
  Image as ImageIcon,
  Video,
  User,
  Loader2,
  MessageSquare,
  RefreshCw,
  FileText,
  Undo2,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DeletionRequest, RegenerationRequest, PromptEditRequest } from '@/types/collaboration';

// Extended type for RegenerationRequest with batchId
interface RegenerationRequestWithBatch extends RegenerationRequest {
  batchId?: string | null;
}

// Grouped batch type
interface BatchGroup {
  batchId: string;
  requests: RegenerationRequestWithBatch[];
  targetType: 'image' | 'video';
  requester: RegenerationRequest['requester'];
  reason?: string | null;
  createdAt: string;
}

interface ApprovalPanelProps {
  projectId: string;
  canApprove: boolean;
}

const deletionTargetIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  project: Film,
  scene: ImageIcon,
  character: User,
  video: Video,
};

const regenerationTargetIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Video,
};

// Field labels for display
const fieldLabels: Record<string, string> = {
  textToImagePrompt: 'Text-to-Image Prompt',
  imageToVideoPrompt: 'Image-to-Video Prompt',
  description: 'Description',
};

export function ApprovalPanel({ projectId, canApprove }: ApprovalPanelProps) {
  const t = useTranslations();
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [regenerationRequests, setRegenerationRequests] = useState<RegenerationRequestWithBatch[]>([]);
  const [promptEditRequests, setPromptEditRequests] = useState<PromptEditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // Group regeneration requests by batchId
  const { batchGroups, singleRequests } = useMemo(() => {
    const batches = new Map<string, RegenerationRequestWithBatch[]>();
    const singles: RegenerationRequestWithBatch[] = [];

    for (const request of regenerationRequests) {
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
    for (const [batchId, requests] of batches) {
      if (requests.length > 0) {
        groups.push({
          batchId,
          requests,
          targetType: requests[0].targetType as 'image' | 'video',
          requester: requests[0].requester,
          reason: requests[0].reason,
          createdAt: requests[0].createdAt,
        });
      }
    }

    // Sort groups by date (newest first)
    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { batchGroups: groups, singleRequests: singles };
  }, [regenerationRequests]);

  const toggleBatchExpanded = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const fetchRequests = useCallback(async () => {
    try {
      const [deletionRes, regenerationRes, promptEditRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/deletion-requests`),
        fetch(`/api/projects/${projectId}/regeneration-requests?status=pending`),
        fetch(`/api/projects/${projectId}/prompt-edits?status=pending`),
      ]);

      if (deletionRes.ok) {
        const data = await deletionRes.json();
        setDeletionRequests(data.requests);
      }

      if (regenerationRes.ok) {
        const data = await regenerationRes.json();
        setRegenerationRequests(data.requests);
      }

      if (promptEditRes.ok) {
        const data = await promptEditRes.json();
        setPromptEditRequests(data.requests);
      }
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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
        setDeletionRequests((prev) => prev.filter((r) => r.id !== requestId));
        setShowNoteInput(null);
      }
    } catch (e) {
      console.error('Failed to process deletion request:', e);
    } finally {
      setProcessingId(null);
    }
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
        setRegenerationRequests((prev) => prev.filter((r) => r.id !== requestId));
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
        // Remove all requests with this batchId
        setRegenerationRequests((prev) => prev.filter((r) => r.batchId !== batchId));
        setShowNoteInput(null);
        setExpandedBatches(prev => {
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
        setPromptEditRequests((prev) => prev.filter((r) => r.id !== requestId));
        setShowNoteInput(null);
        setExpandedDiff(null);
      }
    } catch (e) {
      console.error('Failed to process prompt edit request:', e);
    } finally {
      setProcessingId(null);
    }
  };

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

  const pendingDeletions = deletionRequests.filter((r) => r.status === 'pending');
  const pendingRegenerations = regenerationRequests.filter((r) => r.status === 'pending');
  const pendingPromptEdits = promptEditRequests.filter((r) => r.status === 'pending');
  // For display, count batches as 1 item + single requests
  const pendingBatchCount = batchGroups.filter(b => b.requests.some(r => r.status === 'pending')).length;
  const pendingSingleCount = singleRequests.filter(r => r.status === 'pending').length;
  const totalPending = pendingDeletions.length + pendingBatchCount + pendingSingleCount + pendingPromptEdits.length;

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

  return (
    <div className="space-y-6">
      {/* Regeneration Requests Section */}
      {pendingRegenerations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold">{t('collaborationModals.approvalPanel.regenerationRequests')}</h3>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
              {pendingRegenerations.length}
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {/* Batch Groups */}
              {batchGroups.map((batch) => {
                const Icon = regenerationTargetIcons[batch.targetType] || RefreshCw;
                const isProcessing = processingBatchId === batch.batchId;
                const isExpanded = expandedBatches.has(batch.batchId);
                const pendingInBatch = batch.requests.filter(r => r.status === 'pending');

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
                    {/* Batch Header - Collapsible */}
                    <div
                      className="p-4 cursor-pointer hover:bg-cyan-500/10 transition-colors"
                      onClick={() => toggleBatchExpanded(batch.batchId)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Batch icon */}
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
                                {/* Scene thumbnail */}
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

              {/* Single Requests (no batch) */}
              {singleRequests.filter(r => r.status === 'pending').map((request) => {
                const Icon = regenerationTargetIcons[request.targetType] || RefreshCw;
                const isProcessing = processingId === request.id;

                return (
                  <motion.div
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Scene thumbnail */}
                      <div className="relative w-16 h-9 rounded overflow-hidden bg-black/30 flex-shrink-0">
                        {request.scene?.imageUrl ? (
                          <NextImage
                            src={request.scene.imageUrl}
                            alt={request.scene?.title || 'Scene'}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 p-0.5 bg-cyan-500/80 rounded-tl">
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {t('collaborationModals.approvalPanel.regenerateType', { type: request.targetType })}
                          </span>
                          {request.targetName && (
                            <span className="text-muted-foreground truncate">
                              "{request.targetName}"
                            </span>
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

                        {request.reason && (
                          <div className="mt-2 p-2 bg-white/5 rounded text-sm text-muted-foreground">
                            "{request.reason}"
                          </div>
                        )}
                      </div>
                    </div>

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
                    <div className="flex items-center gap-2 pt-1">
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
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Prompt Edit Requests Section */}
      {pendingPromptEdits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">{t('collaborationModals.approvalPanel.promptEdits')}</h3>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
              {pendingPromptEdits.length}
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pendingPromptEdits.map((request) => {
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
      )}

      {/* Deletion Requests Section */}
      {pendingDeletions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold">{t('collaborationModals.approvalPanel.deletionRequests')}</h3>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
              {pendingDeletions.length}
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pendingDeletions.map((request) => {
                const Icon = deletionTargetIcons[request.targetType] || Trash2;
                const isProcessing = processingId === request.id;

                return (
                  <motion.div
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{t('collaborationModals.approvalPanel.deleteType', { type: request.targetType })}</span>
                          {request.targetName && (
                            <span className="text-muted-foreground">"{request.targetName}"</span>
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

                        {request.reason && (
                          <div className="mt-2 p-2 bg-white/5 rounded text-sm text-muted-foreground">
                            "{request.reason}"
                          </div>
                        )}
                      </div>
                    </div>

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
                    <div className="flex items-center gap-2 pt-1">
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
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
