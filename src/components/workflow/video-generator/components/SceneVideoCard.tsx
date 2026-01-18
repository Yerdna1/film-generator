'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  useCardActions,
  CardActionModals,
  StatusBadges,
  getCardStatusBackground,
} from '@/components/shared/card-actions';
import {
  Video,
  Play,
  RefreshCw,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  MessageSquare,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { CopyButton } from '@/components/shared/CopyButton';
import { StaleVideoWarningModal } from '@/components/shared/StaleVideoWarningModal';
import type { Scene } from '@/types/project';
import type { RegenerationRequest } from '@/types/collaboration';
import type { VideoStatus } from '../types';
import { useState } from 'react';

interface SceneVideoCardProps {
  scene: Scene;
  index: number;
  projectId: string;
  status: VideoStatus;
  progress: number;
  isPlaying: boolean;
  cachedVideoUrl?: string;
  isSelected?: boolean;
  hasPendingRegeneration?: boolean;
  hasPendingDeletion?: boolean;
  approvedRegeneration?: RegenerationRequest | null;
  canDeleteDirectly?: boolean;
  isAdmin?: boolean;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
  isFirstVideo?: boolean;
  onToggleSelect?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onGenerateVideo: () => void;
  buildFullI2VPrompt: (scene: Scene) => string;
  onDeletionRequested?: () => void;
  onUseRegenerationAttempt?: (requestId: string) => Promise<void>;
  onSelectRegeneration?: (requestId: string, selectedUrl: string) => Promise<void>;
  onToggleLock?: () => void;
}

const getStatusColor = (status: VideoStatus) => {
  switch (status) {
    case 'complete':
      return 'text-green-400 border-green-500/30';
    case 'generating':
      return 'text-amber-400 border-amber-500/30';
    case 'error':
      return 'text-red-400 border-red-500/30';
    default:
      return 'text-muted-foreground border-white/10';
  }
};

const getStatusIcon = (status: VideoStatus) => {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'generating':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="w-4 h-4" />
        </motion.div>
      );
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Video className="w-4 h-4" />;
  }
};

export function SceneVideoCard({
  scene,
  index,
  projectId,
  status,
  progress,
  isPlaying,
  cachedVideoUrl,
  isSelected,
  hasPendingRegeneration = false,
  hasPendingDeletion = false,
  approvedRegeneration = null,
  canDeleteDirectly = true,
  isAdmin = false,
  isReadOnly = false,
  isAuthenticated = true,
  isFirstVideo = false,
  onToggleSelect,
  onPlay,
  onPause,
  onGenerateVideo,
  buildFullI2VPrompt,
  onDeletionRequested,
  onUseRegenerationAttempt,
  onSelectRegeneration,
  onToggleLock,
}: SceneVideoCardProps) {
  const t = useTranslations('steps');
  const tCommon = useTranslations('common');
  const [showStaleWarning, setShowStaleWarning] = useState(false);

  // Use shared card actions hook
  const cardActions = useCardActions({
    isLocked: scene.locked,
    canDeleteDirectly,
    approvedRegeneration,
    onToggleLock,
    onUseRegenerationAttempt,
    onSelectRegeneration,
  });

  // Determine if this video is restricted
  const isRestricted = !isAuthenticated && scene.videoUrl && !isFirstVideo;

  // Determine if video is stale
  const isVideoStale = !!(
    scene.videoUrl &&
    scene.imageUpdatedAt &&
    scene.videoGeneratedFromImageAt &&
    new Date(scene.imageUpdatedAt) > new Date(scene.videoGeneratedFromImageAt)
  );

  // Handle generate video with stale check
  const handleGenerateVideo = () => {
    if (cardActions.handleLockedAction()) return;
    if (isVideoStale) {
      setShowStaleWarning(true);
    } else {
      onGenerateVideo();
    }
  };

  // Get card background based on status
  const cardBackground = getCardStatusBackground({
    isLocked: scene.locked,
    approvedRegeneration,
    hasPendingRegeneration,
    hasPendingDeletion,
  });

  return (
    <>
      {/* Shared modals */}
      <CardActionModals
        projectId={projectId}
        targetType="video"
        targetId={scene.id}
        targetName={`${scene.title} video`}
        showDeleteConfirm={cardActions.showDeleteConfirm}
        showDeletionRequest={cardActions.showDeletionRequest}
        showRegenerationModal={cardActions.showRegenerationModal}
        showLockedModal={cardActions.showLockedModal}
        setShowDeleteConfirm={cardActions.setShowDeleteConfirm}
        setShowDeletionRequest={cardActions.setShowDeletionRequest}
        setShowRegenerationModal={cardActions.setShowRegenerationModal}
        setShowLockedModal={cardActions.setShowLockedModal}
        approvedRegeneration={approvedRegeneration}
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

      {/* Stale Video Warning Modal */}
      <StaleVideoWarningModal
        isOpen={showStaleWarning}
        onClose={() => setShowStaleWarning(false)}
        onConfirm={onGenerateVideo}
        sceneName={scene.title}
        imageUpdatedAt={scene.imageUpdatedAt}
        videoGeneratedAt={scene.videoGeneratedFromImageAt}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index % 12) * 0.05 }}
      >
        <Card className={`overflow-hidden ${cardBackground}`}>
          {/* Video/Image Preview */}
          <div className="relative aspect-video bg-black/30">
            {scene.videoUrl && !isRestricted ? (
              <video
                src={cachedVideoUrl || scene.videoUrl}
                className="w-full h-full object-cover"
                poster={scene.imageUrl}
                controls={isPlaying}
                preload="metadata"
                onPlay={onPlay}
                onPause={onPause}
              />
            ) : scene.imageUrl ? (
              <img
                key={scene.imageUrl}
                src={scene.imageUrl}
                alt={scene.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}

            {/* Status Overlay */}
            {status === 'generating' && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 mb-3"
                >
                  <Sparkles className="w-full h-full text-orange-400" />
                </motion.div>
                <p className="text-sm text-white mb-2">{t('videos.generatingVideo')}</p>
                <div className="w-32">
                  <Progress value={progress} className="h-1" />
                </div>
                <span className="text-xs text-white/60 mt-1">{progress}%</span>
              </div>
            )}

            {/* Play Button Overlay */}
            {scene.videoUrl && !isPlaying && (
              isRestricted ? (
                <a
                  href="/auth/register"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer hover:bg-black/70 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                    <Lock className="w-5 h-5 text-white/70" />
                  </div>
                  <p className="text-xs text-white/80 text-center px-2">
                    {t('videos.signInToSeeMore')}
                  </p>
                  <span className="text-xs text-orange-400 mt-1 underline">
                    {t('videos.signUpFree')}
                  </span>
                </a>
              ) : (
                <button
                  onClick={onPlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </button>
              )
            )}

            {/* Scene Number Badge + Status Badges */}
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <Badge className="bg-black/60 text-white border-0">
                {t('scenes.sceneLabel')} {scene.number || index + 1}
              </Badge>
              <StatusBadges
                isLocked={scene.locked}
                hasPendingRegeneration={hasPendingRegeneration}
                hasPendingDeletion={hasPendingDeletion}
                approvedRegeneration={approvedRegeneration}
                onRegenerationClick={() => cardActions.setShowRegenerationModal(true)}
                lockedLabel={t('scenes.status.locked')}
              />
              {isVideoStale && !scene.locked && (
                <Badge className="bg-orange-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5" title={t('videos.staleWarning.badge')}>
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {t('videos.staleWarning.badge')}
                </Badge>
              )}
            </div>

            {/* Status Badge */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {onToggleSelect && scene.imageUrl && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggleSelect}
                    className="h-5 w-5 border-2 border-white/50 bg-black/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                </div>
              )}
              <Badge variant="outline" className={`${getStatusColor(status)} bg-black/60`}>
                {getStatusIcon(status)}
              </Badge>
            </div>
          </div>

          <CardContent className="p-2 space-y-1.5">
            {/* Title row with copy button */}
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-medium text-sm truncate flex-1">{scene.title}</h3>
              <CopyButton text={buildFullI2VPrompt(scene)} size="icon" className="h-5 w-5 shrink-0" />
            </div>

            {/* Meta info */}
            <p className="text-[10px] text-muted-foreground">
              {scene.duration || 6}s • {scene.cameraShot}
            </p>

            {/* I2V Prompt */}
            <p className="text-[10px] text-muted-foreground/70 truncate" title={scene.imageToVideoPrompt}>
              {scene.imageToVideoPrompt}
            </p>

            {/* Dialogue */}
            {scene.dialogue && scene.dialogue.length > 0 && (
              <div className="flex items-center gap-1 text-[10px]">
                <MessageSquare className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="text-purple-300 truncate">
                  {scene.dialogue.map(d => d.characterName).join(', ')}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-1.5 pt-0.5">
              {scene.imageUrl ? (
                <>
                  {!isReadOnly && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex-1 h-7 ${
                              scene.locked
                                ? 'border-amber-500/30 text-amber-400'
                                : isVideoStale
                                ? 'border-orange-500/30 text-orange-400'
                                : 'border-white/10 hover:bg-white/5'
                            }`}
                            onClick={handleGenerateVideo}
                            disabled={status === 'generating'}
                          >
                            {status === 'generating' ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </motion.div>
                            ) : scene.locked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : isVideoStale ? (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{scene.locked ? t('scenes.status.locked') : isVideoStale ? t('videos.staleWarning.badge') : t('videos.generateVideo')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Lock/Unlock button - admin only */}
                  {isAdmin && onToggleLock && !isReadOnly && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cardActions.handleToggleLock}
                            disabled={cardActions.isTogglingLock}
                            className={`h-7 ${scene.locked ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-amber-400'}`}
                          >
                            {cardActions.isTogglingLock ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : scene.locked ? (
                              <Unlock className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{scene.locked ? t('scenes.unlock') : t('scenes.lock')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Download button */}
                  {scene.videoUrl && !isRestricted && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-white/10 hover:bg-white/5"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tCommon('download')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Delete video button */}
                  {!isReadOnly && scene.videoUrl && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cardActions.handleDeleteClick}
                            className={`h-7 ${hasPendingDeletion ? 'text-orange-400' : 'text-muted-foreground hover:text-red-400'}`}
                            disabled={hasPendingDeletion}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{hasPendingDeletion ? t('videos.deletePending') : canDeleteDirectly ? t('videos.deleteVideo') : t('videos.requestDeletion')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              ) : !isReadOnly ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 border-amber-500/30 text-amber-400 text-xs"
                  disabled
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {t('videos.needsImage')}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
