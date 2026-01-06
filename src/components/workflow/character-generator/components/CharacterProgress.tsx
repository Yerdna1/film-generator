'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getImageCost, formatCostCompact } from '@/lib/services/real-costs';
import type { CharacterProgressProps } from '../types';

export function CharacterProgress({
  characters,
  isGeneratingAll,
  imageResolution,
  onGenerateAll,
}: CharacterProgressProps) {
  const t = useTranslations();

  if (characters.length === 0) return null;

  return (
    <div className="flex justify-center pb-4">
      <Button
        size="lg"
        className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/20 px-8 py-6"
        disabled={isGeneratingAll}
        onClick={onGenerateAll}
      >
        {isGeneratingAll ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-5 h-5 mr-2" />
            </motion.div>
            <span className="text-lg">{t('steps.characters.generating')}</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 mr-2" />
            <span className="text-lg">{t('steps.characters.generateAll')}</span>
            <Badge variant="outline" className="ml-2 border-white/30 text-white text-xs px-2 py-1">
              {formatCostCompact(getImageCost(imageResolution) * characters.length)}
            </Badge>
          </>
        )}
      </Button>
    </div>
  );
}
