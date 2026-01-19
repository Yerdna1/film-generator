'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';

interface AspectRatioSelectorProps {
  aspectRatio: '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4';
  setAspectRatio: (ratio: '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4') => void;
  isReadOnly: boolean;
}

export function AspectRatioSelector({ aspectRatio, setAspectRatio, isReadOnly }: AspectRatioSelectorProps) {
  const t = useTranslations();

  const ratios = [
    { value: '16:9', icon: Monitor, label: '16:9' },
    { value: '9:16', icon: Smartphone, label: '9:16' },
    { value: '21:9', icon: Monitor, label: '21:9' },
    { value: '1:1', icon: Monitor, label: '1:1' },
  ] as const;

  return (
    <div className="space-y-2">
      <Label className="text-xs">{t('settings.aspectRatio')}</Label>

      {/* All ratios in one row */}
      <div className="grid grid-cols-4 gap-2">
        {ratios.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => !isReadOnly && setAspectRatio(value as any)}
            disabled={isReadOnly}
            className={`rounded-lg p-3 border-2 transition-all flex flex-col items-center justify-center gap-2 ${
              aspectRatio === value
                ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                : 'border-border hover:border-purple-300 dark:hover:border-purple-600'
            }`}
          >
            <Icon className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}