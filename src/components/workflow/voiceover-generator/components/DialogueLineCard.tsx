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
  Lock,
  Clock,
  Trash2,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { DeletionRequestDialog } from '@/components/collaboration/DeletionRequestDialog';
import { RegenerationSelectionModal } from '@/components/collaboration/RegenerationSelectionModal';
import type { DialogueLineCardProps } from '../types';

export function DialogueLineCard({
  line,
  character,
  status,
  progress,
  error,
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
  onDownload,
  onDeleteAudio,
  onSelectVersion,
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
          if (onDeleteAudio) {
            onDeleteAudio();
          }
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

          {/* Audio Versions - show all available provider+language combinations */}
          {line.audioVersions && line.audioVersions.length > 1 && !isRestricted && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              {line.audioVersions.map((version) => {
                const isActive = line.audioUrl === version.audioUrl;
                const flag = version.language === 'sk' ? '🇸🇰' : '🇬🇧';
                const providerShort =
                  version.provider === 'gemini-tts' ? 'Gem' :
                  version.provider === 'openai-tts' ? 'OAI' :
                  version.provider === 'elevenlabs' ? 'Elev' : 'Mod';
                // Distinct colors: Gemini=green, OpenAI=teal, ElevenLabs=blue, Modal=violet
                const providerColor =
                  version.provider === 'gemini-tts' ? 'bg-green-500' :
                  version.provider === 'openai-tts' ? 'bg-teal-500' :
                  version.provider === 'elevenlabs' ? 'bg-blue-500' : 'bg-violet-500';
                const providerBorder =
                  version.provider === 'gemini-tts' ? 'border-green-500/50 text-green-400' :
                  version.provider === 'openai-tts' ? 'border-teal-500/50 text-teal-400' :
                  version.provider === 'elevenlabs' ? 'border-blue-500/50 text-blue-400' : 'border-violet-500/50 text-violet-400';
                return (
                  <Badge
                    key={`${version.provider}_${version.language}`}
                    variant={isActive ? 'default' : 'outline'}
                    className={`text-[10px] px-2 py-0.5 cursor-pointer transition-all ${
                      isActive
                        ? `${providerColor} text-white`
                        : `${providerBorder} hover:bg-white/10`
                    }`}
                    title={`Play ${version.provider} (${version.language}) - Click to switch`}
                    onClick={() => onSelectVersion?.(version.audioUrl, version.provider)}
                  >
                    {flag} {providerShort}
                  </Badge>
                );
              })}
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
          ) : status === 'error' ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400" title={error}>
              <AlertCircle className="w-3 h-3" />
              <span className="text-[10px] max-w-[120px] truncate">{error || 'Error'}</span>
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
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-emerald-400"
                  onClick={onDownload}
                  title="Download audio"
                >
                  <Download className="w-3 h-3" />
                </Button>
              )}
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${hasPendingDeletion ? 'text-orange-400' : 'text-muted-foreground hover:text-red-400'}`}
                  onClick={() => canDeleteDirectly ? setShowDeleteConfirm(true) : setShowDeletionRequest(true)}
                  disabled={hasPendingDeletion}
                  title="Delete audio"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground/50">—</span>
          )}
        </div>
      </div>
    </>
  );
}
