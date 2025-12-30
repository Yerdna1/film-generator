'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';
import type { VoiceoverProgressProps } from '../types';

export function VoiceoverProgress({
  generatedCount,
  totalCount,
  isGeneratingAll,
  provider,
  onGenerateAll,
  onDownloadAll,
}: VoiceoverProgressProps) {
  const t = useTranslations();

  const remaining = totalCount - generatedCount;
  const perItemCost = provider === 'gemini-tts'
    ? ACTION_COSTS.voiceover.geminiTts
    : ACTION_COSTS.voiceover.elevenlabs;

  return (
    <>
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('steps.voiceover.progress')}</span>
          <span className="text-violet-400">
            {generatedCount} / {totalCount} {t('steps.voiceover.linesGenerated')}
          </span>
        </div>
        <Progress
          value={(generatedCount / Math.max(totalCount, 1)) * 100}
          className="h-2"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-center pt-4">
        <Button
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
          disabled={totalCount === 0 || isGeneratingAll}
          onClick={onGenerateAll}
        >
          {isGeneratingAll ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
              </motion.div>
              {t('steps.voiceover.generating')}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              {t('steps.voiceover.generateAll')}
              <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                {remaining > 0
                  ? formatCostCompact(perItemCost * remaining)
                  : `${formatCostCompact(perItemCost)}/ea`}
              </Badge>
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="border-white/10 hover:bg-white/5"
          disabled={generatedCount === 0}
          onClick={onDownloadAll}
        >
          <Download className="w-4 h-4 mr-2" />
          {t('steps.voiceover.downloadAll')}
        </Button>
      </div>
    </>
  );
}
