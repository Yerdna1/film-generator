'use client';

import { motion } from 'framer-motion';
import { Wand2, User, FileText, Video, Mic, Image as ImageIcon, LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

type LoadingIcon = 'wand' | 'user' | 'file' | 'video' | 'mic' | 'image';

const ICONS: Record<LoadingIcon, LucideIcon> = {
  wand: Wand2,
  user: User,
  file: FileText,
  video: Video,
  mic: Mic,
  image: ImageIcon,
};

const DEFAULT_GRADIENT = 'from-purple-500 to-cyan-500';
const ICON_COLORS: Record<LoadingIcon, string> = {
  wand: 'text-purple-400',
  user: 'text-purple-400',
  file: 'text-cyan-400',
  video: 'text-pink-400',
  mic: 'text-violet-400',
  image: 'text-blue-400',
};

export interface LoadingModalProps {
  isOpen: boolean;
  icon?: LoadingIcon;
  title?: string;
  description?: string;
  model?: string;
  provider?: string;
  progress?: number; // 0-100, if undefined shows indeterminate animation
  progressLabel?: string;
  providerColor?: string; // Optional custom color for provider badge
  modelColor?: string; // Optional custom color for model badge
}

export function LoadingModal({
  isOpen,
  icon = 'wand',
  title,
  description,
  model,
  provider,
  progress,
  progressLabel,
  providerColor = 'text-purple-400',
  modelColor = 'text-cyan-400',
}: LoadingModalProps) {
  const t = useTranslations();
  const commonT = useTranslations('common');

  if (!isOpen) return null;

  const IconComponent = ICONS[icon];
  const hasProgress = typeof progress === 'number';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-8 max-w-md mx-4 border border-white/10 w-full"
      >
        <div className="flex flex-col items-center gap-4">
          {/* Rotating icon animation */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="relative"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${DEFAULT_GRADIENT} rounded-full blur-xl opacity-50`}></div>
            <IconComponent className={`w-16 h-16 ${ICON_COLORS[icon]} relative z-10`} />
          </motion.div>

          {/* Title and description */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {title || t('steps.prompt.generatingTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {description || t('steps.prompt.generatingDescription')}
            </p>
            {/* Provider and model info */}
            {(model || provider) && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-muted-foreground space-y-1">
                  {provider && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">Provider:</span>
                      <span className={providerColor}>{provider}</span>
                    </div>
                  )}
                  {model && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">Model:</span>
                      <span className={modelColor}>{model}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progressLabel || t('steps.prompt.analyzingStory')}</span>
              <span>{commonT('loadingDots')}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              {hasProgress ? (
                <motion.div
                  className={`h-full bg-gradient-to-r ${DEFAULT_GRADIENT} rounded-full`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              ) : (
                <motion.div
                  className={`h-full bg-gradient-to-r ${DEFAULT_GRADIENT} rounded-full`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }}
                />
              )}
            </div>
            {hasProgress && (
              <div className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}%
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
