'use client';

import { motion } from 'framer-motion';
import {
  RefreshCw,
  Sparkles,
  Lock,
  Unlock,
  Download,
  Trash2,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';
import type { CardActionsProps } from './types';

export function CardActions({
  scene,
  status,
  isLocked,
  isVideoStale: videoStale,
  isReadOnly,
  isRestricted,
  hasPendingDeletion,
  canDeleteDirectly,
  onGenerateVideo,
  onToggleLock,
  onDeleteClick,
}: CardActionsProps) {
  const t = useTranslations('steps');
  const tCommon = useTranslations('common');

  return (
    <div className="flex gap-1.5 pt-0.5">
      {scene.videoUrl || scene.imageUrl ? (
        <>
          {!isReadOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 h-7 ${
                      isLocked
                        ? 'border-amber-500/30 text-amber-400'
                        : videoStale
                        ? 'border-orange-500/30 text-orange-400'
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                    onClick={onGenerateVideo}
                    disabled={status === 'generating' || isLocked}
                  >
                    {status === 'generating' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </motion.div>
                    ) : isLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : videoStale ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isLocked ? t('scenes.status.locked') : videoStale ? t('videos.staleWarning.badge') : t('videos.generateVideo')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Lock/Unlock button - admin only */}
          {onToggleLock && !isReadOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleLock}
                    className={`h-7 ${isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-amber-400'}`}
                  >
                    {isLocked ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isLocked ? t('scenes.unlock') : t('scenes.lock')}</p>
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
                    onClick={onDeleteClick}
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
  );
}
