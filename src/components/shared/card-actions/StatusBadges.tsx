'use client';

import { motion } from 'framer-motion';
import { Clock, Lock, Sparkles, RefreshCw, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RegenerationRequest } from '@/types/collaboration';

export interface StatusBadgesProps {
  isLocked?: boolean;
  hasPendingRegeneration?: boolean;
  hasPendingDeletion?: boolean;
  approvedRegeneration?: RegenerationRequest | null;
  onRegenerationClick?: () => void;
  lockedLabel?: string;
  pendingLabel?: string;
  deletePendingLabel?: string;
  clickToRegenerateLabel?: string;
  clickToSelectLabel?: string;
  awaitingApprovalLabel?: string;
}

export function StatusBadges({
  isLocked,
  hasPendingRegeneration,
  hasPendingDeletion,
  approvedRegeneration,
  onRegenerationClick,
  lockedLabel = 'Locked',
  pendingLabel = 'Pending',
  deletePendingLabel = 'Delete Pending',
  clickToRegenerateLabel = 'CLICK TO REGENERATE',
  clickToSelectLabel = 'CLICK TO SELECT BEST',
  awaitingApprovalLabel = 'Awaiting Approval',
}: StatusBadgesProps) {
  return (
    <>
      {isLocked && (
        <Badge className="bg-amber-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
          <Lock className="w-2.5 h-2.5" />
          {lockedLabel}
        </Badge>
      )}

      {hasPendingRegeneration && (
        <Badge className="bg-cyan-500/80 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {pendingLabel}
        </Badge>
      )}

      {approvedRegeneration?.status === 'approved' && (
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Badge
            className="bg-emerald-500 text-white border-2 border-emerald-300 text-[10px] px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-emerald-400 hover:scale-110 transition-all shadow-lg shadow-emerald-500/50"
            onClick={(e) => {
              e.stopPropagation();
              onRegenerationClick?.();
            }}
          >
            <Sparkles className="w-3 h-3" />
            <span className="font-bold">{clickToRegenerateLabel}</span>
            <span className="bg-white/20 px-1 rounded">
              {approvedRegeneration.maxAttempts - approvedRegeneration.attemptsUsed}x
            </span>
          </Badge>
        </motion.div>
      )}

      {approvedRegeneration?.status === 'generating' && (
        <Badge className="bg-blue-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          Generating...
        </Badge>
      )}

      {approvedRegeneration?.status === 'selecting' && (
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Badge
            className="bg-amber-500 text-white border-2 border-amber-300 text-[10px] px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-amber-400 hover:scale-110 transition-all shadow-lg shadow-amber-500/50"
            onClick={(e) => {
              e.stopPropagation();
              onRegenerationClick?.();
            }}
          >
            <Play className="w-3 h-3" />
            <span className="font-bold">{clickToSelectLabel}</span>
          </Badge>
        </motion.div>
      )}

      {approvedRegeneration?.status === 'awaiting_final' && (
        <Badge className="bg-purple-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {awaitingApprovalLabel}
        </Badge>
      )}

      {hasPendingDeletion && (
        <Badge className="bg-orange-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
          <Trash2 className="w-2.5 h-2.5" />
          {deletePendingLabel}
        </Badge>
      )}
    </>
  );
}

/**
 * Get card background class based on status
 */
export function getCardStatusBackground(params: {
  isLocked?: boolean;
  approvedRegeneration?: RegenerationRequest | null;
  hasPendingRegeneration?: boolean;
  hasPendingDeletion?: boolean;
}): string {
  const { isLocked, approvedRegeneration, hasPendingRegeneration, hasPendingDeletion } = params;

  if (isLocked) {
    return 'bg-amber-900/40 border-amber-500/50 ring-1 ring-amber-500/30';
  }
  if (approvedRegeneration?.status === 'approved') {
    return 'bg-emerald-900/60 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20';
  }
  if (approvedRegeneration?.status === 'generating') {
    return 'bg-blue-900/60 border-blue-400 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20';
  }
  if (approvedRegeneration?.status === 'selecting') {
    return 'bg-amber-900/60 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20';
  }
  if (approvedRegeneration?.status === 'awaiting_final') {
    return 'bg-purple-900/60 border-purple-400 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/20';
  }
  if (hasPendingRegeneration) {
    return 'bg-cyan-900/50 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20';
  }
  if (hasPendingDeletion) {
    return 'bg-orange-900/50 border-orange-400 ring-2 ring-orange-400/40 shadow-lg shadow-orange-500/20';
  }
  return 'glass border-white/10';
}
