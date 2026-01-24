'use client';

import { motion } from 'framer-motion';
import { Play, Lock, Sparkles, ImageIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTranslations } from 'next-intl';
import type { VideoPreviewProps } from './types';

export function VideoPreview({
  scene,
  isPlaying,
  isRestricted,
  isFirstVideo,
  cachedVideoUrl,
  status,
  progress,
  onPlay,
  onPause,
}: VideoPreviewProps) {
  const t = useTranslations('steps');

  return (
    <div className="relative aspect-video bg-black/30">
      {scene.videoUrl && !isRestricted ? (
        <video
          src={cachedVideoUrl || scene.videoUrl}
          className="w-full h-full object-cover"
          poster={scene.imageUrl}
          controls
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
    </div>
  );
}
