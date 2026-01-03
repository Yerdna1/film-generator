'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  RefreshCw,
  Download,
  User,
  Sparkles,
  CheckCircle2,
  Lock,
  Clock,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { DeletionRequestDialog } from '@/components/collaboration/DeletionRequestDialog';
import { RegenerationSelectionModal } from '@/components/collaboration/RegenerationSelectionModal';
import type { DialogueLineCardProps } from '../types';

export function DialogueLineCard({
  line,
  character,
  status,
  progress,
  isPlaying,
  provider,
  projectId,
  sceneId,
  isReadOnly = false,
  isAuthenticated = true,
  isFirstDialogue = false,
  canDeleteDirectly = true,
  hasPendingRegeneration = false,
  hasPendingDeletion = false,
  approvedRegeneration = null,
  onTogglePlay,
  onGenerate,
  onAudioRef,
  onAudioEnded,
  onDeletionRequested,
  onUseRegenerationAttempt,
  onSelectRegeneration,
}: DialogueLineCardProps) {
  const t = useTranslations();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletionRequest, setShowDeletionRequest] = useState(false);
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Determine if this dialogue is restricted (non-first dialogue for unauthenticated users)
  const isRestricted = !isAuthenticated && !isFirstDialogue;

  // Determine card background based on status
  const getCardBackground = () => {
    if (approvedRegeneration?.status === 'approved') {
      return 'bg-emerald-900/40 border-emerald-400/50';
    }
    if (approvedRegeneration?.status === 'generating') {
      return 'bg-blue-900/40 border-blue-400/50';
    }
    if (approvedRegeneration?.status === 'selecting') {
      return 'bg-amber-900/40 border-amber-400/50';
    }
    if (approvedRegeneration?.status === 'awaiting_final') {
      return 'bg-purple-900/40 border-purple-400/50';
    }
    if (hasPendingRegeneration) {
      return 'bg-cyan-900/30 border-cyan-400/40';
    }
    if (hasPendingDeletion) {
      return 'bg-orange-900/30 border-orange-400/40';
    }
    return 'glass';
  };

  return (
    <>
      {/* Admin: Direct delete confirmation */}
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={() => {
          // Audio deletion would need implementation
        }}
        itemName={`Audio for ${character?.name || line.characterName}`}
      />
      {/* Collaborator: Request deletion dialog */}
      <DeletionRequestDialog
        projectId={projectId}
        targetType="audio"
        targetId={line.id}
        targetName={`Audio: "${line.text.substring(0, 30)}..."`}
        open={showDeletionRequest}
        onOpenChange={setShowDeletionRequest}
        onRequestSent={onDeletionRequested}
      />
      {/* Regeneration Selection Modal */}
      {approvedRegeneration && onUseRegenerationAttempt && onSelectRegeneration && (
        <RegenerationSelectionModal
          open={showRegenerationModal}
          onOpenChange={setShowRegenerationModal}
          request={approvedRegeneration}
          onRegenerate={async () => {
            setIsRegenerating(true);
            try {
              await onUseRegenerationAttempt(approvedRegeneration.id);
            } finally {
              setIsRegenerating(false);
            }
          }}
          onSelect={async (selectedUrl) => {
            await onSelectRegeneration(approvedRegeneration.id, selectedUrl);
            setShowRegenerationModal(false);
          }}
        />
      )}

      <div className={`rounded-lg p-2 flex items-center gap-2 relative overflow-hidden border ${getCardBackground()} ${isRestricted ? 'select-none' : ''}`}>
        {/* Blur overlay for restricted content */}
        {isRestricted && (
          <a
            href="/auth/register"
            className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center hover:bg-black/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-1">
              <Lock className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-[10px] text-white/80">Sign in to listen</p>
          </a>
        )}

        {/* Character Avatar */}
        <div className="flex-shrink-0">
          {character?.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={character.name}
              className={`w-8 h-8 rounded object-cover ${isRestricted ? 'blur-sm' : ''}`}
            />
          ) : (
            <div className={`w-8 h-8 rounded bg-violet-500/20 flex items-center justify-center ${isRestricted ? 'blur-sm' : ''}`}>
              <User className="w-4 h-4 text-violet-400" />
            </div>
          )}
        </div>

        {/* Dialogue Content */}
        <div className={`flex-1 min-w-0 ${isRestricted ? 'blur-sm' : ''}`}>
          <p className="text-sm truncate">
            <span className="font-semibold text-violet-400">
              {character?.name || line.characterName}:
            </span>
            <span className="text-muted-foreground ml-1">"{line.text}"</span>
          </p>
          {/* Status badges - only show if there are any */}
          {(hasPendingRegeneration || hasPendingDeletion || approvedRegeneration) && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {hasPendingRegeneration && (
                <Badge className="bg-cyan-500/80 text-white border-0 text-[10px] px-1 py-0 flex items-center gap-0.5">
                  <Clock className="w-2 h-2" />
                  Pending
                </Badge>
              )}
              {approvedRegeneration?.status === 'approved' && (
                <Badge
                  className="bg-emerald-500 text-white border-0 text-[10px] px-1 py-0 flex items-center gap-0.5 cursor-pointer hover:bg-emerald-400"
                  onClick={() => setShowRegenerationModal(true)}
                >
                  <Sparkles className="w-2 h-2" />
                  Regen ({approvedRegeneration.maxAttempts - approvedRegeneration.attemptsUsed}x)
                </Badge>
              )}
              {approvedRegeneration?.status === 'generating' && (
                <Badge className="bg-blue-500/90 text-white border-0 text-[10px] px-1 py-0 flex items-center gap-0.5">
                  <RefreshCw className="w-2 h-2 animate-spin" />
                  Gen...
                </Badge>
              )}
              {approvedRegeneration?.status === 'selecting' && (
                <Badge
                  className="bg-amber-500 text-white border-0 text-[10px] px-1 py-0 flex items-center gap-0.5 cursor-pointer hover:bg-amber-400"
                  onClick={() => setShowRegenerationModal(true)}
                >
                  <Play className="w-2 h-2" />
                  Select
                </Badge>
              )}
              {approvedRegeneration?.status === 'awaiting_final' && (
                <Badge className="bg-purple-500/90 text-white border-0 text-[10px] px-1 py-0 flex items-center gap-0.5">
                  <Clock className="w-2 h-2" />
                  Awaiting
                </Badge>
              )}
              {hasPendingDeletion && (
                <Badge className="bg-orange-500/90 text-white border-0 text-[10px] px-1 py-0 flex items-center gap-0.5">
                  <Trash2 className="w-2 h-2" />
                  Delete
                </Badge>
              )}
            </div>
          )}

          {/* Only load audio for non-restricted content */}
          {line.audioUrl && !isRestricted && (
            <audio
              ref={onAudioRef}
              src={line.audioUrl}
              onEnded={onAudioEnded}
            />
          )}
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-2 flex-shrink-0 ${isRestricted ? 'blur-sm' : ''}`}>
          {status === 'generating' ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-3 h-3" />
              </motion.div>
              <span className="text-[10px]">{progress}%</span>
            </div>
          ) : status === 'complete' || line.audioUrl ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3 ml-0.5" />
                )}
              </Button>
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${hasPendingDeletion ? 'text-orange-400' : 'text-muted-foreground hover:text-red-400'}`}
                  onClick={() => canDeleteDirectly ? setShowDeleteConfirm(true) : setShowDeletionRequest(true)}
                  disabled={hasPendingDeletion}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground/50">—</span>
          )}
        </div>
      </div>
    </>
  );
}
