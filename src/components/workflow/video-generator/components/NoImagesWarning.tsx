'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

export function NoImagesWarning() {
  const t = useTranslations();

  return (
    <div className="glass rounded-xl p-6 border-l-4 border-amber-500 text-center">
      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
      <h3 className="font-semibold mb-2">{t('steps.videos.noImages')}</h3>
      <p className="text-sm text-muted-foreground">
        {t('steps.videos.noImagesDescription')}
      </p>
    </div>
  );
}
