'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, Zap, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';
import type { VideoMode } from '../types';

interface VideoQuickActionsProps {
  videoMode: VideoMode;
  onVideoModeChange: (mode: VideoMode) => void;
  scenesWithImages: number;
  scenesNeedingGeneration: number;
  isGeneratingAll: boolean;
  onGenerateAll: () => void;
  onStopGeneration: () => void;
}

export function VideoQuickActions({
  videoMode,
  onVideoModeChange,
  scenesWithImages,
  scenesNeedingGeneration,
  isGeneratingAll,
  onGenerateAll,
  onStopGeneration,
}: VideoQuickActionsProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap gap-4 justify-center items-center">
      {/* Mode Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('steps.videos.mode')}:</span>
        <Select value={videoMode} onValueChange={(v) => onVideoModeChange(v as VideoMode)}>
          <SelectTrigger className="w-32 border-white/10 bg-white/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">{t('steps.videos.modeNormal')}</SelectItem>
            <SelectItem value="fun">{t('steps.videos.modeFun')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="border-white/10 hover:bg-white/5"
        disabled={scenesWithImages === 0}
        onClick={() => window.open('https://grok.x.ai', '_blank')}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {t('steps.videos.openGrok')}
      </Button>
      {isGeneratingAll ? (
        <Button
          className="bg-red-600 hover:bg-red-500 text-white border-0"
          onClick={onStopGeneration}
        >
          <Square className="w-4 h-4 mr-2" />
          Stop
        </Button>
      ) : (
        <Button
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-0"
          disabled={scenesWithImages === 0}
          onClick={onGenerateAll}
        >
          <Zap className="w-4 h-4 mr-2" />
          {t('steps.videos.generateAll')}
          <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
            {scenesNeedingGeneration > 0
              ? formatCostCompact(scenesNeedingGeneration * ACTION_COSTS.video.grok)
              : `${formatCostCompact(ACTION_COSTS.video.grok)}/ea`}
          </Badge>
        </Button>
      )}
    </div>
  );
}
