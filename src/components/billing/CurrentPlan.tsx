'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CurrentPlanProps {
  plan: string;
  planName: string;
  status: string;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  credits: number;
  onManageSubscription: () => Promise<void>;
}

const statusColors: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  active: 'bg-green-500/20 text-green-400',
  canceled: 'bg-yellow-500/20 text-yellow-400',
  past_due: 'bg-red-500/20 text-red-400',
};

export function CurrentPlan({
  plan,
  planName,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  credits,
  onManageSubscription,
}: CurrentPlanProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      await onManageSubscription();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t('billing.currentPlan')}
              </CardTitle>
              <CardDescription>{t('billing.manageSubscription')}</CardDescription>
            </div>
            <Badge className={statusColors[status] || statusColors.free}>
              {status === 'active' ? t('billing.active') : status === 'canceled' ? t('billing.canceled') : status === 'past_due' ? t('billing.pastDue') : t('billing.free')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <div className="font-semibold text-lg">{planName}</div>
              <div className="text-sm text-muted-foreground">
                {credits.toLocaleString()} {t('billing.credits')}{t('billing.perMonth')}
              </div>
            </div>
          </div>

          {cancelAtPeriodEnd && currentPeriodEnd && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-500">{t('billing.subscriptionEnding')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('billing.subscriptionEndingDesc', { date: formatDate(currentPeriodEnd) })}
                </div>
              </div>
            </div>
          )}

          {status === 'active' && currentPeriodEnd && !cancelAtPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {t('billing.renewsOn')} {formatDate(currentPeriodEnd)}
            </div>
          )}

          {plan !== 'free' && (
            <Button
              onClick={handleManage}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              {t('billing.manageSubscription')}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
