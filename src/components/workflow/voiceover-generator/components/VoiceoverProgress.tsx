'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Zap, Trash2, PlayCircle, Square } from 'lucide-react';
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
  isPlayingAll,
  provider,
  language,
  availableVersions,
  onGenerateAll,
  onDownloadAll,
  onDeleteAll,
  onPlayAll,
  onStopPlayback,
  onSwitchAllToProvider,
}: VoiceoverProgressProps) {
  const t = useTranslations();

  const remaining = remainingCount;
  const perItemCost = provider === 'gemini-tts'
    ? ACTION_COSTS.voiceover.geminiTts
    : provider === 'modal'
      ? ACTION_COSTS.voiceover.modal
      : provider === 'openai-tts'
        ? ACTION_COSTS.voiceover.openaiTts
        : ACTION_COSTS.voiceover.elevenlabs;

  // Helper to get provider display info
  const getProviderInfo = (p: string) => {
    const map: Record<string, { short: string; color: string }> = {
      'gemini-tts': { short: 'Gemini', color: 'bg-green-500' },
      'openai-tts': { short: 'OpenAI', color: 'bg-emerald-500' },
      'elevenlabs': { short: 'ElevenLabs', color: 'bg-blue-500' },
      'modal': { short: 'Modal', color: 'bg-violet-500' },
    };
    return map[p] || { short: p, color: 'bg-gray-500' };
  };

  const currentVersionKey = `${provider}_${language}`;

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
        {/* Play All Dialogues */}
        <Button
          variant="outline"
          className={isPlayingAll
            ? "border-amber-500/50 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            : "border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400"}
          disabled={generatedCount === 0}
          onClick={isPlayingAll ? onStopPlayback : onPlayAll}
        >
          {isPlayingAll ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              {t('steps.voiceover.stopPlayback')}
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-2" />
              {t('steps.voiceover.playAll')}
            </>
          )}
        </Button>

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

      {/* Available Versions - Switch & Play by Provider */}
      {availableVersions.length > 1 && (
        <div className="glass rounded-xl p-4 mt-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium">{t('steps.voiceover.compareVersions')}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {t('steps.voiceover.clickToSwitch')}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableVersions.map((v) => {
              const info = getProviderInfo(v.provider);
              const flag = v.language === 'sk' ? '🇸🇰' : '🇬🇧';
              const versionKey = `${v.provider}_${v.language}`;
              const isActive = versionKey === currentVersionKey;

              return (
                <Button
                  key={versionKey}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={isActive
                    ? `${info.color} text-white border-0`
                    : 'border-white/20 hover:bg-white/10'}
                  onClick={() => {
                    onSwitchAllToProvider(v.provider, v.language);
                    onPlayAll();
                  }}
                >
                  <PlayCircle className="w-3 h-3 mr-1.5" />
                  {flag} {info.short}
                  <Badge className="ml-1.5 bg-white/20 text-white text-[9px] px-1 py-0 border-0">
                    {v.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
