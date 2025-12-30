'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Coins, Video, Image as ImageIcon, Mic, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { CreditsData, CreditsBreakdown } from './types';

interface CreditsUsageCardProps {
  creditsData: CreditsData;
  breakdown: CreditsBreakdown;
}

export function CreditsUsageCard({ creditsData, breakdown }: CreditsUsageCardProps) {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mb-12"
    >
      <div className="glass rounded-2xl p-6 border border-amber-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Credits Balance */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Coins className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.creditsBalance')}</p>
              <p className="text-3xl font-bold text-amber-400">
                {creditsData.credits.balance}
                <span className="text-lg text-muted-foreground ml-1">{t('credits.points')}</span>
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t('dashboard.creditsUsed')}</span>
              <span className="text-amber-400">
                {creditsData.credits.totalSpent} / {creditsData.credits.totalEarned}
              </span>
            </div>
            <Progress
              value={(creditsData.credits.totalSpent / creditsData.credits.totalEarned) * 100}
              className="h-2"
            />
          </div>

          {/* Usage Breakdown */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-1">
                <ImageIcon className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-lg font-semibold">{breakdown.images}</p>
              <p className="text-[10px] text-muted-foreground">{t('credits.image')}</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-1">
                <Video className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-lg font-semibold">{breakdown.videos}</p>
              <p className="text-[10px] text-muted-foreground">{t('credits.video')}</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center mx-auto mb-1">
                <Mic className="w-4 h-4 text-violet-400" />
              </div>
              <p className="text-lg font-semibold">{breakdown.voiceovers}</p>
              <p className="text-[10px] text-muted-foreground">{t('credits.voiceover')}</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto mb-1">
                <FileText className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-lg font-semibold">{breakdown.scenes}</p>
              <p className="text-[10px] text-muted-foreground">{t('credits.scene')}</p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {creditsData.transactions && creditsData.transactions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-xs text-muted-foreground mb-3">{t('credits.recentActivity')}</p>
            <div className="flex flex-wrap gap-2">
              {creditsData.transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="glass rounded-lg px-3 py-1.5 text-xs flex items-center gap-2"
                >
                  {tx.type === 'video' && <Video className="w-3 h-3 text-orange-400" />}
                  {tx.type === 'image' && <ImageIcon className="w-3 h-3 text-purple-400" />}
                  {tx.type === 'voiceover' && <Mic className="w-3 h-3 text-violet-400" />}
                  {tx.type === 'scene' && <FileText className="w-3 h-3 text-green-400" />}
                  <span className="text-muted-foreground truncate max-w-[100px]">
                    {tx.description || tx.type}
                  </span>
                  <span className={tx.amount < 0 ? 'text-red-400' : 'text-green-400'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
