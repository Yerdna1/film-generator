'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Video,
  Play,
  RefreshCw,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  MessageSquare,
  Clock,
  Lock,
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
import type { Scene } from '@/types/project';
import type { VideoStatus } from '../types';

interface SceneVideoCardProps {
  scene: Scene;
  index: number;
  status: VideoStatus;
  progress: number;
  isPlaying: boolean;
  cachedVideoUrl?: string;
  isSelected?: boolean;
  hasPendingRegeneration?: boolean;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
  isFirstVideo?: boolean;
  onToggleSelect?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onGenerateVideo: () => void;
  buildFullI2VPrompt: (scene: Scene) => string;
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
  status,
  progress,
  isPlaying,
  cachedVideoUrl,
  isSelected,
  hasPendingRegeneration = false,
  isReadOnly = false,
  isAuthenticated = true,
  isFirstVideo = false,
  onToggleSelect,
  onPlay,
  onPause,
  onGenerateVideo,
  buildFullI2VPrompt,
}: SceneVideoCardProps) {
  const t = useTranslations();

  // Determine if this video is restricted (non-first video for unauthenticated users)
  const isRestricted = !isAuthenticated && scene.videoUrl && !isFirstVideo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 12) * 0.05 }}
    >
      <Card className="glass border-white/10 overflow-hidden">
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
            /* For restricted videos, show only the thumbnail image */
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
              <p className="text-sm text-white mb-2">{t('steps.videos.generatingVideo')}</p>
              <div className="w-32">
                <Progress value={progress} className="h-1" />
              </div>
              <span className="text-xs text-white/60 mt-1">{progress}%</span>
            </div>
          )}

          {/* Play Button Overlay (for completed videos) */}
          {scene.videoUrl && !isPlaying && (
            isRestricted ? (
              /* Sign-in required overlay for restricted videos */
              <a
                href="/auth/register"
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer hover:bg-black/70 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                  <Lock className="w-5 h-5 text-white/70" />
                </div>
                <p className="text-xs text-white/80 text-center px-2">
                  You need to sign in to see more
                </p>
                <span className="text-xs text-orange-400 mt-1 underline">
                  Sign up free
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

          {/* Scene Number Badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <Badge className="bg-black/60 text-white border-0">
              {t('steps.scenes.sceneLabel')} {scene.number || index + 1}
            </Badge>
            {hasPendingRegeneration && (
              <Badge className="bg-cyan-500/80 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                Pending
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
              <span className="ml-1 capitalize">{status}</span>
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

          {/* I2V Prompt - single line with ellipsis */}
          <p className="text-[10px] text-muted-foreground/70 truncate" title={scene.imageToVideoPrompt}>
            {scene.imageToVideoPrompt}
          </p>

          {/* Dialogue - compact inline */}
          {scene.dialogue && scene.dialogue.length > 0 && (
            <div className="flex items-center gap-1 text-[10px]">
              <MessageSquare className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="text-purple-300 truncate">
                {scene.dialogue.map(d => d.characterName).join(', ')}
              </span>
            </div>
          )}

          {/* Actions - compact */}
          <div className="flex gap-1.5 pt-0.5">
            {scene.imageUrl ? (
              <>
                {/* Generate button - only for editors */}
                {!isReadOnly && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 border-white/10 hover:bg-white/5"
                          onClick={onGenerateVideo}
                          disabled={status === 'generating'}
                        >
                          {status === 'generating' ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </motion.div>
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('steps.videos.generateVideo')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Download button - only visible for authenticated users or first video */}
                {scene.videoUrl && !isRestricted && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 border-white/10 hover:bg-white/5 ${isReadOnly ? 'flex-1' : ''}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('common.download')}</p>
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
                <Upload className="w-3 h-3 mr-1" />
                {t('steps.videos.needsImage')}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
