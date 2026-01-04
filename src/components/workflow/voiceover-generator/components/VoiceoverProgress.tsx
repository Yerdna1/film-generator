'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Zap, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';
import { TTSPriceComparison } from './TTSPriceComparison';
import type { VoiceoverProgressProps } from '../types';

export function VoiceoverProgress({
  generatedCount,
  totalCount,
  remainingCount,
  totalCharacters,
  isGeneratingAll,
  provider,
  onGenerateAll,
  onDownloadAll,
  onDeleteAll,
}: VoiceoverProgressProps) {
  const t = useTranslations();

  const remaining = remainingCount;
  const perItemCost = provider === 'gemini-tts'
    ? ACTION_COSTS.voiceover.geminiTts
    : provider === 'modal'
      ? ACTION_COSTS.voiceover.modal
      : ACTION_COSTS.voiceover.elevenlabs;

  return (
    <>
      {/* Price Comparison Table */}
      <TTSPriceComparison
        totalCharacters={totalCharacters}
        lineCount={totalCount}
        currentProvider={provider}
      />

      {/* Progress */}
      <div className="space-y-2 mt-4">
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
          disabled={totalCount === 0 || remaining === 0 || isGeneratingAll}
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
              {remaining > 0 && (
                <Badge className="ml-2 bg-white/20 text-white text-[10px] px-1.5 py-0 border-0">
                  {remaining}
                </Badge>
              )}
              <Badge variant="outline" className="ml-1 border-white/30 text-white text-[10px] px-1.5 py-0">
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
        <Button
          variant="outline"
          className="border-red-500/50 hover:bg-red-500/20 text-red-400 hover:text-red-300"
          disabled={generatedCount === 0 || isGeneratingAll}
          onClick={onDeleteAll}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('steps.voiceover.deleteAll')}
        </Button>
      </div>
    </>
  );
}
