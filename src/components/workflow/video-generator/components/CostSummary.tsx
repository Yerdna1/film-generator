'use client';

import { useTranslations } from 'next-intl';
import { Coins } from 'lucide-react';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';

interface CostSummaryProps {
  scenesNeedingGeneration: number;
}

export function CostSummary({ scenesNeedingGeneration }: CostSummaryProps) {
  const t = useTranslations();

  return (
    <div className="glass rounded-xl p-4 border border-green-500/20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Coins className="w-5 h-5 text-green-400" />
          <div>
            <p className="font-medium text-green-400">{t('steps.videos.costEstimate')}</p>
            <p className="text-xs text-muted-foreground">
              {formatCostCompact(ACTION_COSTS.video.grok)} / video
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t('steps.videos.remaining')}</p>
            <p className="font-semibold text-lg">
              {scenesNeedingGeneration}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t('steps.videos.totalCost')}</p>
            <p className="font-semibold text-lg text-green-400">
              {scenesNeedingGeneration > 0
                ? formatCostCompact(scenesNeedingGeneration * ACTION_COSTS.video.grok)
                : `${formatCostCompact(ACTION_COSTS.video.grok)}/ea`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
