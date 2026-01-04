'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, Check, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCostCompact } from '@/lib/services/real-costs';
import type { VoiceProvider } from '@/types/project';

interface TTSPriceComparisonProps {
  totalCharacters: number;
  lineCount: number;
  currentProvider: VoiceProvider;
}

interface ProviderCost {
  id: VoiceProvider;
  name: string;
  pricingModel: string;
  totalCost: number;
  perLineCost: number;
}

// Pricing constants (from real-costs.ts)
const GEMINI_PER_1K_CHARS = 0.016;
const ELEVENLABS_PER_1K_CHARS = 1.10; // ~€1/1K chars
const MODAL_PER_LINE = 0.01;

export function TTSPriceComparison({
  totalCharacters,
  lineCount,
  currentProvider,
}: TTSPriceComparisonProps) {
  const t = useTranslations();

  const providerCosts = useMemo<ProviderCost[]>(() => {
    const geminiTotal = (totalCharacters / 1000) * GEMINI_PER_1K_CHARS;
    const elevenLabsTotal = (totalCharacters / 1000) * ELEVENLABS_PER_1K_CHARS;
    const modalTotal = lineCount * MODAL_PER_LINE;

    return [
      {
        id: 'gemini-tts' as VoiceProvider,
        name: 'Gemini TTS',
        pricingModel: '$0.016/1K chars',
        totalCost: geminiTotal,
        perLineCost: lineCount > 0 ? geminiTotal / lineCount : 0,
      },
      {
        id: 'elevenlabs' as VoiceProvider,
        name: 'ElevenLabs',
        pricingModel: '€1/1K chars',
        totalCost: elevenLabsTotal,
        perLineCost: lineCount > 0 ? elevenLabsTotal / lineCount : 0,
      },
      {
        id: 'modal' as VoiceProvider,
        name: 'Modal',
        pricingModel: '$0.01/line',
        totalCost: modalTotal,
        perLineCost: MODAL_PER_LINE,
      },
    ];
  }, [totalCharacters, lineCount]);

  const cheapestProvider = useMemo(() => {
    return providerCosts.reduce((min, p) => (p.totalCost < min.totalCost ? p : min));
  }, [providerCosts]);

  if (lineCount === 0) {
    return null;
  }

  return (
    <div className="glass rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium">{t('steps.voiceover.priceComparison')}</span>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {lineCount} {t('steps.voiceover.lines')} &middot; {totalCharacters.toLocaleString()} {t('steps.voiceover.characters')}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {providerCosts.map((provider) => {
          const isSelected = provider.id === currentProvider;
          const isCheapest = provider.id === cheapestProvider.id;

          return (
            <div
              key={provider.id}
              className={`rounded-lg p-3 text-center transition-all ${
                isSelected
                  ? 'bg-violet-500/20 border border-violet-400/50 ring-1 ring-violet-400/30'
                  : 'bg-white/5 border border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-xs font-medium">{provider.name}</span>
                {isSelected && <Check className="w-3 h-3 text-violet-400" />}
              </div>

              <div className="text-lg font-bold text-white">
                {formatCostCompact(provider.totalCost)}
              </div>

              <div className="text-[10px] text-muted-foreground mb-1">
                {provider.pricingModel}
              </div>

              {isCheapest && (
                <Badge className="bg-emerald-500/80 text-white border-0 text-[9px] px-1.5 py-0">
                  <Sparkles className="w-2 h-2 mr-0.5" />
                  {t('steps.voiceover.cheapest')}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
