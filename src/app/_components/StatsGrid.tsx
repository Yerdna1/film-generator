'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Film, Clock, Sparkles, Layers, Coins, Video, Image as ImageIcon, Mic, FileText } from 'lucide-react';
import type { ProjectStats, CreditsData, CreditsBreakdown } from './types';

interface StatsGridProps {
  stats: ProjectStats;
  creditsData?: CreditsData | null;
  breakdown?: CreditsBreakdown;
}

export function StatsGrid({ stats, creditsData, breakdown }: StatsGridProps) {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass rounded-xl p-4 sm:p-6 mt-8 sm:mt-12 mb-4 sm:mb-8"
    >
      {/* Project Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
            <Film className="w-5 h-5 sm:w-4 sm:h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-xl sm:text-xl font-bold">{stats.total}</p>
            <p className="text-xs sm:text-[10px] text-muted-foreground">{t('dashboard.stats.projects')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 sm:w-4 sm:h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-xl sm:text-xl font-bold">{stats.inProgress}</p>
            <p className="text-xs sm:text-[10px] text-muted-foreground">{t('dashboard.stats.inProgress')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 sm:w-4 sm:h-4 text-green-400" />
          </div>
          <div>
            <p className="text-xl sm:text-xl font-bold">{stats.completed}</p>
            <p className="text-xs sm:text-[10px] text-muted-foreground">{t('dashboard.stats.completed')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 sm:w-4 sm:h-4 text-pink-400" />
          </div>
          <div>
            <p className="text-xl sm:text-xl font-bold">{stats.totalScenes}</p>
            <p className="text-xs sm:text-[10px] text-muted-foreground">{t('dashboard.stats.scenes')}</p>
          </div>
        </div>

        {/* Credits Balance */}
        {creditsData && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 sm:w-4 sm:h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xl sm:text-xl font-bold text-amber-400">{creditsData.credits.balance.toLocaleString()}</p>
              <p className="text-xs sm:text-[10px] text-muted-foreground">{t('credits.points')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Usage Breakdown - only show if we have breakdown data */}
      {breakdown && breakdown.images > 0 && (
        <div className="border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{breakdown.images}</p>
                <p className="text-[10px] text-muted-foreground">{t('credits.image')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{breakdown.videos}</p>
                <p className="text-[10px] text-muted-foreground">{t('credits.video')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{breakdown.voiceovers}</p>
                <p className="text-[10px] text-muted-foreground">{t('credits.voiceover')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{breakdown.scenes}</p>
                <p className="text-[10px] text-muted-foreground">{t('credits.scene')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
