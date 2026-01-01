'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Check,
  X,
  Clock,
  Trash2,
  Film,
  Image,
  Video,
  User,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DeletionRequest } from '@/types/collaboration';

interface ApprovalPanelProps {
  projectId: string;
  canApprove: boolean;
}

const targetIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  project: Film,
  scene: Image,
  character: User,
  video: Video,
};

export function ApprovalPanel({ projectId, canApprove }: ApprovalPanelProps) {
  const t = useTranslations();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/deletion-requests`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (e) {
      console.error('Failed to fetch deletion requests:', e);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
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
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setShowNoteInput(null);
      }
    } catch (e) {
      console.error('Failed to process request:', e);
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

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  if (!canApprove) return null;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('approvals.noRequests')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold">{t('approvals.title')}</h3>
        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
          {pendingRequests.length}
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {pendingRequests.map((request) => {
            const Icon = targetIcons[request.targetType] || Trash2;
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
                      <span className="font-medium">Delete {request.targetType}</span>
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
                      <span>{request.requester?.name || 'Unknown'}</span>
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
                      placeholder="Add a note (optional)..."
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
                      Add Note
                    </Button>
                  )}

                  <div className="flex-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction(request.id, 'rejected')}
                    disabled={isProcessing}
                    className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleAction(request.id, 'approved')}
                    disabled={isProcessing}
                    className="bg-red-600 hover:bg-red-500 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Approve Delete
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
