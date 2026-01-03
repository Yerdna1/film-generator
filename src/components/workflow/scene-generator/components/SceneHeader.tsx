'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ACTION_COSTS,
  formatCostCompact,
  getImageCost,
  IMAGE_RESOLUTIONS,
  ASPECT_RATIOS,
  type ImageResolution,
  type AspectRatio,
} from '@/lib/services/real-costs';
import type { ImageProvider } from '@/types/project';

interface SceneHeaderProps {
  sceneCount: number;
  totalScenes: number;
  scenesWithImages: number;
  imageResolution: ImageResolution;
  aspectRatio: AspectRatio;
  imageProvider: ImageProvider;
  hasCharacters: boolean;
  isGeneratingScenes: boolean;
  sceneJobProgress?: number;
  sceneJobStatus?: string | null;
  isSceneJobRunning?: boolean;
  onSceneCountChange: (value: string) => void;
  onImageResolutionChange: (value: ImageResolution) => void;
  onAspectRatioChange: (value: AspectRatio) => void;
  onGenerateAllScenes: () => void;
}

const IMAGE_PROVIDER_LABELS: Record<ImageProvider, string> = {
  gemini: 'Gemini',
  modal: 'Modal Qwen',
  'modal-edit': 'Qwen-Edit',
};

export function SceneHeader({
  sceneCount,
  totalScenes,
  scenesWithImages,
  imageResolution,
  aspectRatio,
  imageProvider,
  hasCharacters,
  isGeneratingScenes,
  sceneJobProgress = 0,
  sceneJobStatus,
  isSceneJobRunning = false,
  onSceneCountChange,
  onImageResolutionChange,
  onAspectRatioChange,
  onGenerateAllScenes,
}: SceneHeaderProps) {
  const t = useTranslations();

  return (
    <>
      {/* Progress & Scene Count */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground">{t('steps.scenes.sceneCount')}:</Label>
            <Select
              value={sceneCount.toString()}
              onValueChange={onSceneCountChange}
              disabled={totalScenes > 0}
            >
              <SelectTrigger className="w-32 glass border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {[12, 24, 36, 48, 60, 120, 240, 360].map((count) => (
                  <SelectItem key={count} value={count.toString()}>
                    {count} {t('steps.scenes.scenesLabel')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Quality Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Quality:</Label>
            <Select
              value={imageResolution}
              onValueChange={(value) => onImageResolutionChange(value as ImageResolution)}
            >
              <SelectTrigger className="w-40 glass border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {(Object.entries(IMAGE_RESOLUTIONS) as [ImageResolution, { label: string; maxPixels: string; description: string }][]).map(([key, data]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{data.label}</span>
                      <span className="text-xs text-muted-foreground">{formatCostCompact(getImageCost(key))}/img</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Aspect:</Label>
            <Select
              value={aspectRatio}
              onValueChange={(value) => onAspectRatioChange(value as AspectRatio)}
            >
              <SelectTrigger className="w-44 glass border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {(Object.entries(ASPECT_RATIOS) as [AspectRatio, { label: string; description: string }][]).map(([key, data]) => (
                  <SelectItem key={key} value={key}>
                    <span className="font-medium">{data.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              {IMAGE_PROVIDER_LABELS[imageProvider]}
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              {totalScenes} / {sceneCount} {t('steps.scenes.scenesLabel')}
            </Badge>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
              {scenesWithImages} {t('steps.scenes.imagesGenerated')}
            </Badge>
          </div>
        </div>

        <Progress
          value={(totalScenes / sceneCount) * 100}
          className="h-2"
        />

        {/* Generate All Scenes Button or Progress */}
        {totalScenes === 0 && (
          <div className="flex flex-col items-center gap-3 pt-2">
            {isSceneJobRunning ? (
              <div className="w-full max-w-md space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </motion.div>
                  <span className="text-sm text-muted-foreground">
                    {sceneJobStatus === 'pending' ? 'Starting scene generation...' : 'Generating scenes with AI...'}
                  </span>
                  <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                    {sceneJobProgress}%
                  </Badge>
                </div>
                <Progress value={sceneJobProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Background job running - you can safely close this tab
                </p>
              </div>
            ) : (
              <Button
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 px-6"
                disabled={isGeneratingScenes || !hasCharacters}
                onClick={onGenerateAllScenes}
              >
                {isGeneratingScenes ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                    </motion.div>
                    {t('steps.scenes.generatingScenes')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('steps.scenes.generateWithAI')}
                    <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                      {formatCostCompact(ACTION_COSTS.scene.claude * sceneCount)}
                    </Badge>
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {!hasCharacters && totalScenes === 0 && (
          <p className="text-sm text-amber-400 text-center">
            {t('steps.scenes.addCharactersFirst')}
          </p>
        )}
      </div>
    </>
  );
}
