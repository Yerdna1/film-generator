'use client';

import { Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import type { useVideoComposer, Resolution } from '../../export/hooks';
import { TransitionSettings } from './TransitionSettings';
import { CaptionSettings } from './CaptionSettings';
import { AudioSettings } from './AudioSettings';

interface VideoCompositionOptionsProps {
  videoComposer: ReturnType<typeof useVideoComposer>;
  stats: {
    totalDuration: number;
  };
}

export function VideoCompositionOptions({
  videoComposer,
  stats,
}: VideoCompositionOptionsProps) {
  const t = useTranslations();

  return (
    <>
      {/* Output Format */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{t('steps.export.outputFormat')}</label>
        <Select value={videoComposer.options.outputFormat} onValueChange={videoComposer.setOutputFormat}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4 (H.264)</SelectItem>
            <SelectItem value="mov">MOV (ProRes)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resolution */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{t('steps.export.resolution')}</label>
        <Select value={videoComposer.options.resolution} onValueChange={(value) => videoComposer.setResolution(value as Resolution)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hd">HD (1280×720)</SelectItem>
            <SelectItem value="4k">4K (3840×2160)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-muted-foreground">{t('steps.export.options')}</label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <Switch
            checked={videoComposer.options.includeVoiceovers}
            onCheckedChange={videoComposer.setIncludeVoiceovers}
            className="data-[state=checked]:bg-cyan-500"
          />
          <span className="text-sm group-hover:text-foreground transition-colors">
            {t('steps.export.includeVoiceovers')}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <Switch
            checked={videoComposer.options.includeCaptions}
            onCheckedChange={videoComposer.setIncludeCaptions}
            className="data-[state=checked]:bg-yellow-500"
          />
          <span className="text-sm group-hover:text-foreground transition-colors">
            {t('steps.export.includeCaptions')}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <Switch
            checked={videoComposer.options.includeMusic}
            onCheckedChange={videoComposer.setIncludeMusic}
            className="data-[state=checked]:bg-purple-500"
          />
          <span className="text-sm group-hover:text-foreground transition-colors">
            {t('steps.export.includeBackgroundMusic')}
          </span>
        </label>
      </div>

      {/* Additional Options based on selections */}
      <TransitionSettings videoComposer={videoComposer} />
      {videoComposer.options.includeCaptions && <CaptionSettings videoComposer={videoComposer} />}
      {videoComposer.options.includeMusic && <AudioSettings videoComposer={videoComposer} />}

      {/* Cost Estimate */}
      <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
        <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
          {t('steps.export.estimatedCost')}: ${videoComposer.estimatedCost.realCost.toFixed(2)} • {Math.ceil(stats.totalDuration)}s
        </p>
      </div>

      {/* Render Button */}
      <Button
        onClick={videoComposer.startComposition}
        size="sm"
        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white"
        disabled={videoComposer.compositionState.isComposing}
      >
        <Clapperboard className="w-4 h-4 mr-2" />
        {t('steps.export.renderVideo')}
      </Button>
    </>
  );
}
