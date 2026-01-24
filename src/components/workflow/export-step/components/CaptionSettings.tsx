'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import type { useVideoComposer } from '../../export/hooks';

interface CaptionSettingsProps {
  videoComposer: ReturnType<typeof useVideoComposer>;
}

export function CaptionSettings({ videoComposer }: CaptionSettingsProps) {
  const t = useTranslations();

  return (
    <div className="space-y-3 border-t border-black/5 dark:border-white/5 pt-3">
      <p className="text-xs font-medium text-muted-foreground">{t('steps.export.captionStyling')}</p>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t('steps.export.captionPosition')}</label>
        <Select
          value={videoComposer.options.captionStyle.position}
          onValueChange={(value) => videoComposer.setCaptionStyle({ position: value as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom">Bottom</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="top">Top</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t('steps.export.fontSize')}</label>
        <Select
          value={videoComposer.options.captionStyle.fontSize}
          onValueChange={(value) => videoComposer.setCaptionStyle({ fontSize: value as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
