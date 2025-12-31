'use client';

import { useTranslations } from 'next-intl';
import { Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreditsSpent } from '../types';

interface CreditsSummaryProps {
  credits: CreditsSpent;
  compact?: boolean;
}

export function CreditsSummary({ credits, compact = false }: CreditsSummaryProps) {
  const t = useTranslations();

  return (
    <Card className="glass border-white/10 border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          {t('steps.export.creditsUsed')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="glass rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{t('credits.image')}</p>
            <p className="font-semibold text-purple-400">{credits.images} pts</p>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{t('credits.video')}</p>
            <p className="font-semibold text-orange-400">{credits.videos} pts</p>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{t('credits.voiceover')}</p>
            <p className="font-semibold text-violet-400">{credits.voiceovers} pts</p>
          </div>
          <div className="glass rounded-lg p-3 text-center border border-amber-500/30">
            <p className="text-xs text-muted-foreground">{t('credits.title')}</p>
            <p className="font-bold text-lg text-amber-400">{credits.total} pts</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
