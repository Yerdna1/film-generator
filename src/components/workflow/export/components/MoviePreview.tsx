'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  Video,
  Image as ImageIcon,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  Music,
  Wand2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  transitionVariants,
  captionAnimations,
  captionFontSizes,
  transitionLabels,
  DEFAULT_TRANSITION_TYPE,
  DEFAULT_TRANSITION_DURATION,
} from '@/lib/constants/video-editor';
import { useProjectStore } from '@/lib/stores/project-store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { formatTime } from '../utils/file-helpers';
import type { Project, TransitionType, Caption } from '@/types/project';

interface MoviePreviewProps {
  project: Project;
  isPlaying: boolean;
  currentIndex: number;
  progress: number;
  volume: number;
  isMuted: boolean;
  musicVolumeDb: number;
  currentCaption: Caption | null;
  currentMovieTime: number;
  totalDuration: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  musicRef: React.RefObject<HTMLAudioElement | null>;
  onTogglePlayPause: () => void;
  onGoToNext: () => void;
  onGoToPrevious: () => void;
  onJumpToFirst: () => void;
  onJumpToLast: () => void;
  onJumpToScene: (index: number) => void;
  onSeek: (value: number[]) => void;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
  onMusicVolumeDbChange: (value: number[]) => void;
  onVideoEnded: () => void;
  onVideoTimeUpdate: () => void;
  onVideoCanPlay: () => void;
  getVideoUrl: (url: string) => string;
  compact?: boolean;
}

export function MoviePreview({
  project,
  isPlaying,
  currentIndex,
  progress,
  volume,
  isMuted,
  musicVolumeDb,
  currentCaption,
  currentMovieTime,
  totalDuration,
  videoRef,
  musicRef,
  onTogglePlayPause,
  onGoToNext,
  onGoToPrevious,
  onJumpToFirst,
  onJumpToLast,
  onJumpToScene,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onMusicVolumeDbChange,
  onVideoEnded,
  onVideoTimeUpdate,
  onVideoCanPlay,
  getVideoUrl,
  compact = false,
}: MoviePreviewProps) {
  const t = useTranslations();
  const { updateScene } = useProjectStore();
  const totalScenes = project.scenes.length;
  const currentScene = project.scenes[currentIndex];
  const hasVideo = currentScene?.videoUrl;
  const hasImage = currentScene?.imageUrl;

  const getSceneTransition = useCallback(
    (sceneIndex: number) => {
      const scene = project.scenes[sceneIndex];
      return scene?.transition?.type || 'fade';
    },
    [project.scenes]
  );

  const getTransitionDuration = useCallback(
    (sceneIndex: number) => {
      const scene = project.scenes[sceneIndex];
      return (scene?.transition?.duration || 500) / 1000;
    },
    [project.scenes]
  );

  const handleTransitionChange = useCallback(
    (sceneId: string, transitionType: TransitionType) => {
      updateScene(project.id, sceneId, {
        transition: { type: transitionType, duration: DEFAULT_TRANSITION_DURATION },
      });
    },
    [project.id, updateScene]
  );

  const applyTransitionToAll = useCallback(
    (transitionType: TransitionType = DEFAULT_TRANSITION_TYPE) => {
      project.scenes.forEach((scene) => {
        updateScene(project.id, scene.id, {
          transition: { type: transitionType, duration: DEFAULT_TRANSITION_DURATION },
        });
      });
    },
    [project.id, project.scenes, updateScene]
  );

  const clearAllTransitions = useCallback(() => {
    project.scenes.forEach((scene) => {
      updateScene(project.id, scene.id, {
        transition: { type: 'none', duration: 0 },
      });
    });
  }, [project.id, project.scenes, updateScene]);

  if (totalScenes === 0) return null;

  return (
    <Card className={cn("glass border-white/10 border-purple-500/20", compact && "border-0 shadow-none bg-transparent")}>
      {!compact && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-400" />
              {t('steps.export.moviePreview')}
            </CardTitle>
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              {totalScenes} {t('steps.export.scenes')}
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-2", compact && "p-0 space-y-1")}>
        {/* Background Music Audio Element (hidden) */}
        {project.backgroundMusic && (
          <audio ref={musicRef} src={project.backgroundMusic.audioUrl} loop preload="auto" />
        )}

        {/* Video/Image Display */}
        <div className={cn(
          "relative bg-black overflow-hidden mx-auto",
          compact ? "aspect-video rounded max-h-[200px]" : "aspect-video rounded-xl max-h-[400px]"
        )}>
          <AnimatePresence mode="wait">
            {hasVideo ? (
              <motion.video
                key={`video-${currentIndex}`}
                ref={videoRef}
                src={getVideoUrl(currentScene.videoUrl!)}
                poster={currentScene.imageUrl || undefined}
                className="w-full h-full object-contain"
                playsInline
                preload="auto"
                autoPlay={isPlaying}
                onEnded={onVideoEnded}
                onTimeUpdate={onVideoTimeUpdate}
                onCanPlay={onVideoCanPlay}
                onLoadedData={onVideoCanPlay}
                onCanPlayThrough={onVideoCanPlay}
                initial={transitionVariants[getSceneTransition(currentIndex > 0 ? currentIndex - 1 : 0)].exit}
                animate={transitionVariants[getSceneTransition(currentIndex)].animate}
                exit={transitionVariants[getSceneTransition(currentIndex)].exit}
                transition={{ duration: getTransitionDuration(currentIndex) }}
              />
            ) : hasImage ? (
              <motion.img
                key={`image-${currentIndex}`}
                src={currentScene.imageUrl!}
                alt={currentScene.title}
                className="w-full h-full object-contain"
                initial={transitionVariants[getSceneTransition(currentIndex > 0 ? currentIndex - 1 : 0)].exit}
                animate={transitionVariants[getSceneTransition(currentIndex)].animate}
                exit={transitionVariants[getSceneTransition(currentIndex)].exit}
                transition={{ duration: getTransitionDuration(currentIndex) }}
              />
            ) : (
              <motion.div
                key={`empty-${currentIndex}`}
                className="w-full h-full flex flex-col items-center justify-center text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ImageIcon className="w-16 h-16 mb-2 opacity-30" />
                <p className="text-sm">{t('steps.export.noMedia')}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Caption overlay */}
          <AnimatePresence>
            {currentCaption && (
              <motion.div
                key={currentCaption.id}
                className={cn(
                  'absolute left-0 right-0 px-4 text-center z-10',
                  currentCaption.style.position === 'top' && 'top-4',
                  currentCaption.style.position === 'center' && 'top-1/2 -translate-y-1/2',
                  currentCaption.style.position === 'bottom' && 'bottom-20'
                )}
                initial={captionAnimations[currentCaption.animation]?.initial || { opacity: 0 }}
                animate={captionAnimations[currentCaption.animation]?.animate || { opacity: 1 }}
                exit={captionAnimations[currentCaption.animation]?.exit || { opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span
                  className={cn(
                    'px-4 py-2 rounded-lg inline-block max-w-[80%]',
                    currentCaption.style.textShadow && 'drop-shadow-lg'
                  )}
                  style={{
                    fontSize: captionFontSizes[currentCaption.style.fontSize],
                    color: currentCaption.style.color,
                    backgroundColor: currentCaption.style.backgroundColor,
                    fontFamily:
                      currentCaption.style.fontFamily === 'serif'
                        ? 'Georgia, serif'
                        : currentCaption.style.fontFamily === 'mono'
                        ? 'monospace'
                        : 'inherit',
                  }}
                >
                  {currentCaption.text}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scene overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-white text-sm font-medium">
              {currentIndex + 1}. {currentScene?.title || `Scene ${currentIndex + 1}`}
            </p>
            {currentScene?.description && (
              <p className="text-white/70 text-xs line-clamp-1 mt-1">{currentScene.description}</p>
            )}
          </div>

          {/* Media type indicator */}
          {hasVideo && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-green-500/80 text-white">
                <Video className="w-3 h-3 mr-1" />
                Video
              </Badge>
            </div>
          )}
          {!hasVideo && hasImage && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-amber-500/80 text-white">
                <ImageIcon className="w-3 h-3 mr-1" />
                Image
              </Badge>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className={cn("flex items-center justify-center", compact ? "gap-1" : "gap-2")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onJumpToFirst}
            disabled={currentIndex === 0}
            className="text-muted-foreground hover:text-white"
            title={t('steps.export.firstScene')}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onGoToPrevious}
            disabled={currentIndex === 0}
            className="text-muted-foreground hover:text-white"
            title={t('steps.export.previousScene')}
          >
            <Rewind className="w-4 h-4" />
          </Button>

          <Button
            variant="default"
            size={compact ? "sm" : "lg"}
            onClick={onTogglePlayPause}
            className={cn(
              isPlaying ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600',
              compact ? "min-w-[90px]" : "min-w-[120px]"
            )}
          >
            {isPlaying ? (
              <>
                <Pause className={compact ? "w-4 h-4 mr-1" : "w-5 h-5 mr-2"} />
                {compact ? t('steps.export.pauseMovie').split(' ')[0] : t('steps.export.pauseMovie')}
              </>
            ) : (
              <>
                <Play className={compact ? "w-4 h-4 mr-1" : "w-5 h-5 mr-2"} />
                {compact ? t('steps.export.playMovie').split(' ')[0] : t('steps.export.playMovie')}
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onGoToNext}
            disabled={currentIndex === totalScenes - 1}
            className="text-muted-foreground hover:text-white"
            title={t('steps.export.nextScene')}
          >
            <FastForward className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onJumpToLast}
            disabled={currentIndex === totalScenes - 1}
            className="text-muted-foreground hover:text-white"
            title={t('steps.export.lastScene')}
          >
            <SkipForward className="w-4 h-4" />
          </Button>

          {/* Volume Control */}
          <div className={cn("flex items-center gap-2", compact ? "ml-2" : "ml-4")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              className={cn("text-muted-foreground hover:text-white", compact && "h-8 w-8")}
              title={isMuted ? t('steps.export.unmute') : t('steps.export.mute')}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.05}
              onValueChange={onVolumeChange}
              className={cn("cursor-pointer", compact ? "w-16" : "w-24")}
            />
          </div>

          {/* Music Volume Control (dB scale) */}
          {project.backgroundMusic && (
            <div className={cn("flex items-center gap-2 border-l border-white/10", compact ? "ml-1 pl-2" : "ml-2 pl-4")}>
              <Music className="w-4 h-4 text-purple-400" />
              <Slider
                value={[musicVolumeDb]}
                min={-30}
                max={0}
                step={1}
                onValueChange={onMusicVolumeDbChange}
                className={cn("cursor-pointer", compact ? "w-16" : "w-24")}
              />
              {!compact && (
                <span className="text-xs text-muted-foreground w-12 font-mono">
                  {musicVolumeDb > -30 ? `${musicVolumeDb > 0 ? '+' : ''}${Math.round(musicVolumeDb)}dB` : '-∞'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Time display and progress */}
        <div className={cn("space-y-2", compact && "space-y-1")}>
          <div className={cn("flex items-center justify-between text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
            <span>{formatTime(currentMovieTime)}</span>
            <span>
              {compact ? `${currentIndex + 1}/${totalScenes}` : `Scene ${currentIndex + 1} / ${totalScenes}`}
            </span>
            <span>{formatTime(totalDuration)}</span>
          </div>
          <Slider
            value={[currentMovieTime]}
            max={totalDuration}
            step={0.1}
            onValueChange={onSeek}
            className="cursor-pointer"
          />
        </div>

        {/* Quick transition actions - hidden in compact mode */}
        {!compact && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{t('steps.export.transitions')}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyTransitionToAll('swoosh')}
                className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                title={t('steps.export.applySwooshAll')}
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Swoosh All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllTransitions}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                title={t('steps.export.clearAllTransitions')}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Scene thumbnails with transition selectors - hidden in compact mode (shown in timeline) */}
        {!compact && (
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {project.scenes.map((scene, index) => (
              <div key={scene.id} className="flex items-center flex-shrink-0">
                {/* Scene thumbnail */}
                <button
                  onClick={() => onJumpToScene(index)}
                  className={`flex-shrink-0 w-16 h-10 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-purple-500 ring-2 ring-purple-500/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                  title={`${index + 1}. ${scene.title}`}
                >
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                </button>

                {/* Transition selector (between scenes) */}
                {index < project.scenes.length - 1 && (
                  <Select
                    value={getSceneTransition(index)}
                    onValueChange={(value: TransitionType) => handleTransitionChange(scene.id, value)}
                  >
                    <SelectTrigger className="w-8 h-6 px-1 mx-0.5 bg-white/5 border-white/10 hover:border-purple-500/50 text-[9px]">
                      <SelectValue>
                        <span className="truncate">{transitionLabels[getSceneTransition(index)].slice(0, 2)}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[140px]">
                      {(Object.keys(transitionLabels) as TransitionType[]).map((type) => (
                        <SelectItem key={type} value={type} className="text-xs">
                          {transitionLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
