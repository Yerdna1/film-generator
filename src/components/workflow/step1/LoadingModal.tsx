'use client';

import { motion } from 'framer-motion';
import { Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LoadingModalProps {
  isOpen: boolean;
}

export function LoadingModal({ isOpen }: LoadingModalProps) {
  const t = useTranslations();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-8 max-w-md mx-4 border border-white/10"
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-xl opacity-50"></div>
            <Wand2 className="w-16 h-16 text-purple-400 relative z-10" />
          </motion.div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {t('steps.prompt.generatingTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('steps.prompt.generatingDescription')}
            </p>
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('steps.prompt.analyzingStory')}</span>
              <span>...</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
