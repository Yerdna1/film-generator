'use client';

import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';

export function GrokInstructions() {
  const t = useTranslations();

  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold">{t('steps.videos.grokInstructions')}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="glass rounded-lg p-4 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
            1
          </div>
          <p className="text-muted-foreground">{t('steps.videos.grokStep1')}</p>
        </div>
        <div className="glass rounded-lg p-4 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
            2
          </div>
          <p className="text-muted-foreground">{t('steps.videos.grokStep2')}</p>
        </div>
        <div className="glass rounded-lg p-4 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
            3
          </div>
          <p className="text-muted-foreground">{t('steps.videos.grokStep3')}</p>
        </div>
      </div>
    </div>
  );
}
