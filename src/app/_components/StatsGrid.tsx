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
      className="glass rounded-xl p-4 mb-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Project Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Projects</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.inProgress}</p>
              <p className="text-[10px] text-muted-foreground">In Progress</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.completed}</p>
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.totalScenes}</p>
              <p className="text-[10px] text-muted-foreground">Scenes</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        {creditsData && <div className="hidden lg:block w-px h-12 bg-white/10" />}

        {/* Credits Balance */}
        {creditsData && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-400">{creditsData.credits.balance.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{t('credits.points')}</p>
            </div>
          </div>
        )}

        {/* Divider */}
        {breakdown && <div className="hidden lg:block w-px h-12 bg-white/10" />}

        {/* Usage Breakdown */}
        {breakdown && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{breakdown.images}</p>
                <p className="text-[10px] text-muted-foreground">{t('credits.image')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{breakdown.videos}</p>
                <p className="text-[10px] text-muted-foreground">{t('credits.video')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Mic className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{breakdown.voiceovers}</p>
                <p className="text-[10px] text-muted-foreground">{t('credits.voiceover')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{breakdown.scenes}</p>
                <p className="text-[10px] text-muted-foreground">{t('credits.scene')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
