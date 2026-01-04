'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  useCardActions,
  CardActionModals,
  StatusBadges,
} from '@/components/shared/card-actions';
import {
  Play,
  Pause,
  RefreshCw,
  Download,
  User,
  Lock,
  Volume2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  // Use shared card actions hook
  const cardActions = useCardActions({
    canDeleteDirectly,
    approvedRegeneration,
    onUseRegenerationAttempt,
    onSelectRegeneration,
  });

  // Determine if this dialogue is restricted
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
      {/* Shared modals */}
      <CardActionModals
        projectId={projectId}
        targetType="audio"
        targetId={line.id}
        targetName={`Audio: "${line.text.substring(0, 30)}..."`}
        showDeleteConfirm={cardActions.showDeleteConfirm}
        showDeletionRequest={cardActions.showDeletionRequest}
        showRegenerationModal={cardActions.showRegenerationModal}
        showLockedModal={cardActions.showLockedModal}
        setShowDeleteConfirm={cardActions.setShowDeleteConfirm}
        setShowDeletionRequest={cardActions.setShowDeletionRequest}
        setShowRegenerationModal={cardActions.setShowRegenerationModal}
        setShowLockedModal={cardActions.setShowLockedModal}
        approvedRegeneration={approvedRegeneration}
        onDelete={onDeleteAudio}
        onDeletionRequested={onDeletionRequested}
        onRegenerationAttempt={async () => {
          if (approvedRegeneration) {
            await cardActions.handleRegenerationAttempt(approvedRegeneration.id);
          }
        }}
        onRegenerationSelect={async (selectedUrl) => {
          if (approvedRegeneration) {
            await cardActions.handleRegenerationSelect(approvedRegeneration.id, selectedUrl);
          }
        }}
      />

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

          {/* Status badges using shared component */}
          {(hasPendingRegeneration || hasPendingDeletion || approvedRegeneration) && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <StatusBadges
                hasPendingRegeneration={hasPendingRegeneration}
                hasPendingDeletion={hasPendingDeletion}
                approvedRegeneration={approvedRegeneration}
                onRegenerationClick={() => cardActions.setShowRegenerationModal(true)}
                pendingLabel="Pending"
                deletePendingLabel="Delete"
              />
            </div>
          )}

          {/* Audio Versions */}
          {line.audioVersions && line.audioVersions.length > 1 && !isRestricted && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              {line.audioVersions.map((version) => {
                const isActive = line.audioUrl === version.audioUrl;
                const flag = version.language === 'sk' ? '\u{1F1F8}\u{1F1F0}' : '\u{1F1EC}\u{1F1E7}';
                const providerShort =
                  version.provider === 'gemini-tts' ? 'Gem' :
                  version.provider === 'openai-tts' ? 'OAI' :
                  version.provider === 'elevenlabs' ? 'Elev' : 'Mod';
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

          {/* Audio element */}
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
                  onClick={cardActions.handleDeleteClick}
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
