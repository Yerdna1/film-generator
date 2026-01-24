'use client';

import { Slider } from '@/components/ui/slider';
import { useTranslations } from 'next-intl';
import type { useVideoComposer } from '../../export/hooks';

interface AudioSettingsProps {
  videoComposer: ReturnType<typeof useVideoComposer>;
}

export function AudioSettings({ videoComposer }: AudioSettingsProps) {
  const t = useTranslations();

  return (
    <div className="space-y-3 border-t border-black/5 dark:border-white/5 pt-3">
      <p className="text-xs font-medium text-muted-foreground">{t('steps.export.audioSettings')}</p>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('steps.export.musicVolume')}: {Math.round(videoComposer.options.audioSettings.musicVolume * 100)}%
        </label>
        <Slider
          value={[videoComposer.options.audioSettings.musicVolume]}
          onValueChange={([value]) => videoComposer.setAudioSettings({ musicVolume: value })}
          min={0}
          max={1}
          step={0.05}
          className="py-3"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('steps.export.fadeIn')}: {videoComposer.options.audioSettings.fadeIn}s
        </label>
        <Slider
          value={[videoComposer.options.audioSettings.fadeIn]}
          onValueChange={([value]) => videoComposer.setAudioSettings({ fadeIn: value })}
          min={0}
          max={5}
          step={0.5}
          className="py-3"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('steps.export.fadeOut')}: {videoComposer.options.audioSettings.fadeOut}s
        </label>
        <Slider
          value={[videoComposer.options.audioSettings.fadeOut]}
          onValueChange={([value]) => videoComposer.setAudioSettings({ fadeOut: value })}
          min={0}
          max={5}
          step={0.5}
          className="py-3"
        />
      </div>
    </div>
  );
}
