'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Image as ImageIcon, RefreshCw, Zap, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getImageCost, formatCostCompact } from '@/lib/services/real-costs';
import type { CharacterProgressProps } from '../types';

export function CharacterProgress({
  characters,
  charactersWithImages,
  isGeneratingAll,
  imageResolution,
  onGenerateAll,
  onShowPromptsDialog,
}: CharacterProgressProps) {
  const t = useTranslations();

  if (characters.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            <span className="font-medium">{t('steps.characters.progress')}</span>
          </div>
          <Badge variant="outline" className="border-purple-500/30 text-purple-400">
            {charactersWithImages} / {characters.length} {t('steps.characters.imagesGenerated')}
          </Badge>
        </div>
      </div>
      <Progress
        value={(charactersWithImages / characters.length) * 100}
        className="h-2"
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-center pt-2">
        {/* Copy Prompts for Gemini Button */}
        <Button
          variant="outline"
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          disabled={characters.length === 0}
          onClick={onShowPromptsDialog}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Prompts for Gemini
          <Badge variant="outline" className="ml-2 border-purple-500/30 text-purple-400 text-[10px] px-1.5 py-0">
            FREE
          </Badge>
        </Button>
        <Button
          className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
          disabled={characters.length === 0 || isGeneratingAll}
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
              {t('steps.characters.generating')}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              {t('steps.characters.generateAll')}
              <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                {formatCostCompact(getImageCost(imageResolution) * characters.length)}
              </Badge>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
