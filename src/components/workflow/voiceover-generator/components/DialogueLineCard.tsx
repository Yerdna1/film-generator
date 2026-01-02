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

      <div className={`rounded-lg p-3 flex items-start gap-3 relative overflow-hidden border ${getCardBackground()} ${isRestricted ? 'select-none' : ''}`}>
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
              className={`w-10 h-10 rounded-lg object-cover ${isRestricted ? 'blur-sm' : ''}`}
            />
          ) : (
            <div className={`w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center ${isRestricted ? 'blur-sm' : ''}`}>
              <User className="w-5 h-5 text-violet-400" />
            </div>
          )}
        </div>

        {/* Dialogue Content */}
        <div className={`flex-1 min-w-0 ${isRestricted ? 'blur-sm' : ''}`}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-violet-400">
              {character?.name || line.characterName}
            </span>
            {character?.voiceName && (
              <Badge variant="outline" className="text-xs border-white/10">
                {character.voiceName}
              </Badge>
            )}
            {line.audioUrl && line.ttsProvider && (
              <Badge
                className={`text-xs border-0 ${
                  line.ttsProvider === 'elevenlabs'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-green-500/20 text-green-400'
                }`}
              >
                {line.ttsProvider === 'elevenlabs' ? '🇬🇧 ElevenLabs' : '🇸🇰 Gemini TTS'}
              </Badge>
            )}
            {/* Status badges */}
            {hasPendingRegeneration && (
              <Badge className="bg-cyan-500/80 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                Pending
              </Badge>
            )}
            {approvedRegeneration?.status === 'approved' && (
              <Badge
                className="bg-emerald-500 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5 cursor-pointer hover:bg-emerald-400"
                onClick={() => setShowRegenerationModal(true)}
              >
                <Sparkles className="w-2.5 h-2.5" />
                Click to Regenerate ({approvedRegeneration.maxAttempts - approvedRegeneration.attemptsUsed}x)
              </Badge>
            )}
            {approvedRegeneration?.status === 'generating' && (
              <Badge className="bg-blue-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Generating...
              </Badge>
            )}
            {approvedRegeneration?.status === 'selecting' && (
              <Badge
                className="bg-amber-500 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5 cursor-pointer hover:bg-amber-400"
                onClick={() => setShowRegenerationModal(true)}
              >
                <Play className="w-2.5 h-2.5" />
                Select Best
              </Badge>
            )}
            {approvedRegeneration?.status === 'awaiting_final' && (
              <Badge className="bg-purple-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                Awaiting Approval
              </Badge>
            )}
            {hasPendingDeletion && (
              <Badge className="bg-orange-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                <Trash2 className="w-2.5 h-2.5" />
                Delete Pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">"{line.text}"</p>

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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
              <span className="text-xs">{progress}%</span>
            </div>
          ) : status === 'complete' || line.audioUrl ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="w-4 h-4" />
              </Button>
              {/* Delete button for audio */}
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${hasPendingDeletion ? 'text-orange-400' : 'text-muted-foreground hover:text-red-400'}`}
                  onClick={() => canDeleteDirectly ? setShowDeleteConfirm(true) : setShowDeletionRequest(true)}
                  disabled={hasPendingDeletion}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </>
          ) : !isReadOnly ? (
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 hover:bg-white/5"
              onClick={onGenerate}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('steps.voiceover.generate')}
              <span className="ml-1 text-[10px] opacity-70">
                {formatCostCompact(
                  provider === 'gemini-tts'
                    ? ACTION_COSTS.voiceover.geminiTts
                    : ACTION_COSTS.voiceover.elevenlabs
                )}
              </span>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">No audio</span>
          )}
        </div>
      </div>
    </>
  );
}
