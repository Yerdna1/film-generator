'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useTranslations } from 'next-intl';
import type { useVideoComposer } from '../../export/hooks';

interface TransitionSettingsProps {
  videoComposer: ReturnType<typeof useVideoComposer>;
}

export function TransitionSettings({ videoComposer }: TransitionSettingsProps) {
  const t = useTranslations();

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{t('steps.export.transitionSettings')}</p>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t('steps.export.transitionType')}</label>
        <Select value={videoComposer.options.transitionStyle} onValueChange={(value) => videoComposer.setTransitionStyle(value as any)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fade">Fade</SelectItem>
            <SelectItem value="cut">Cut</SelectItem>
            <SelectItem value="dissolve">Dissolve</SelectItem>
            <SelectItem value="wipe">Wipe</SelectItem>
            <SelectItem value="slideLeft">Slide Left</SelectItem>
            <SelectItem value="slideRight">Slide Right</SelectItem>
            <SelectItem value="zoomIn">Zoom In</SelectItem>
            <SelectItem value="zoomOut">Zoom Out</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('steps.export.transitionDuration')}: {videoComposer.options.transitionDuration}s
        </label>
        <Slider
          value={[videoComposer.options.transitionDuration]}
          onValueChange={([value]) => videoComposer.setTransitionDuration(value)}
          min={0.1}
          max={2}
          step={0.1}
          className="py-3"
        />
      </div>
    </div>
  );
}
