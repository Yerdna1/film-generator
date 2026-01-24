'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Sparkles, StopCircle } from 'lucide-react';
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
} from '@/lib/services/real-costs';
import type { ImageProvider, AspectRatio } from '@/types/project';

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
  onGenerateAllScenes: () => void;
  onStopSceneGeneration?: () => void;
}

const IMAGE_PROVIDER_LABELS: Record<ImageProvider, string> = {
  gemini: 'Gemini',
  modal: 'Modal Qwen',
  'modal-edit': 'Qwen-Edit',
  kie: 'Kie.ai',
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
  onGenerateAllScenes,
  onStopSceneGeneration,
}: SceneHeaderProps) {
  const t = useTranslations();

  // Hide the header card completely if scenes exist (as requested by user)
  if (totalScenes > 0) {
    return null;
  }

  return (
    <>
      {/* Progress & Scene Count - Settings from Step1 */}
      <div className="glass rounded-2xl p-6 space-y-4">
        {/* Stats removed as requested */}

        {/* Progress bar removed as requested */}

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
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Background job running - you can safely close this tab
                  </p>
                  {onStopSceneGeneration && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onStopSceneGeneration}
                      className="flex items-center gap-2"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop Generation
                    </Button>
                  )}
                  {sceneJobStatus === 'pending' && sceneJobProgress === 0 && (
                    <p className="text-xs text-amber-400 text-center mt-2">
                      If generation doesn't start within 30 seconds, try stopping and restarting.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <Button
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white border-0 font-medium animate-pulse-border-red px-6"
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
