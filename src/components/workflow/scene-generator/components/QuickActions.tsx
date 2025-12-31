'use client';

import { useTranslations } from 'next-intl';
import { Copy, RefreshCw, Sparkles, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCostCompact, getImageCost, type ImageResolution } from '@/lib/services/real-costs';

interface QuickActionsProps {
  totalScenes: number;
  scenesWithImages: number;
  imageResolution: ImageResolution;
  isGeneratingAllImages: boolean;
  onCopyPrompts: () => void;
  onRegenerateAll: () => void;
  onGenerateAllImages: () => void;
  onStopGeneration: () => void;
  backgroundJobProgress?: number;
}

export function QuickActions({
  totalScenes,
  scenesWithImages,
  imageResolution,
  isGeneratingAllImages,
  onCopyPrompts,
  onRegenerateAll,
  onGenerateAllImages,
  onStopGeneration,
  backgroundJobProgress,
}: QuickActionsProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {/* Copy Prompts for Gemini Button */}
      <Button
        variant="outline"
        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        disabled={totalScenes === 0}
        onClick={onCopyPrompts}
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy Prompts for Gemini
        <Badge variant="outline" className="ml-2 border-purple-500/30 text-purple-400 text-[10px] px-1.5 py-0">
          FREE
        </Badge>
      </Button>
      <Button
        variant="outline"
        className="border-white/10 hover:bg-white/5"
        disabled={totalScenes === 0 || isGeneratingAllImages}
        onClick={onRegenerateAll}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('steps.scenes.regenerateAll')}
      </Button>
      {isGeneratingAllImages ? (
        <Button
          className="bg-red-600 hover:bg-red-500 text-white border-0"
          onClick={onStopGeneration}
        >
          <Square className="w-4 h-4 mr-2" />
          {backgroundJobProgress !== undefined
            ? `Processing... ${backgroundJobProgress}%`
            : `Stop (${scenesWithImages}/${totalScenes})`}
        </Button>
      ) : scenesWithImages === totalScenes ? (
        <Button
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
          disabled
        >
          <Sparkles className="w-4 h-4 mr-2" />
          All Images Generated
        </Button>
      ) : (
        <Button
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
          disabled={totalScenes === 0}
          onClick={onGenerateAllImages}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {t('steps.scenes.generateAllImages')} ({totalScenes - scenesWithImages} remaining)
          <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
            {formatCostCompact(getImageCost(imageResolution) * (totalScenes - scenesWithImages))}
          </Badge>
        </Button>
      )}
    </div>
  );
}
