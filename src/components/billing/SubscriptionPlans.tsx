'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Plan {
  name: string;
  price: number;
  credits: number;
  description: string;
  features: string[];
  productId?: string;
}

interface SubscriptionPlansProps {
  plans: Record<string, Plan>;
  currentPlan: string;
  onSelectPlan: (plan: string) => Promise<void>;
}

const planIcons: Record<string, React.ReactNode> = {
  free: null,
  starter: <Sparkles className="w-5 h-5" />,
  pro: <Zap className="w-5 h-5" />,
  studio: <Crown className="w-5 h-5" />,
};

const planColors: Record<string, string> = {
  free: 'border-muted',
  starter: 'border-blue-500/50 hover:border-blue-500',
  pro: 'border-purple-500/50 hover:border-purple-500',
  studio: 'border-amber-500/50 hover:border-amber-500',
};

const planBadgeColors: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-500/20 text-blue-400',
  pro: 'bg-purple-500/20 text-purple-400',
  studio: 'bg-amber-500/20 text-amber-400',
};

export function SubscriptionPlans({ plans, currentPlan, onSelectPlan }: SubscriptionPlansProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (plan: string) => {
    if (plan === currentPlan || plan === 'free') return;
    setLoading(plan);
    try {
      await onSelectPlan(plan);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(plans).map(([key, plan], index) => {
        const isCurrentPlan = key === currentPlan;
        const isPopular = key === 'pro';

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`relative h-full flex flex-col ${planColors[key]} border-2 transition-colors ${
                isCurrentPlan ? 'ring-2 ring-primary' : ''
              }`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500">
                  {t('billing.proDesc')}
                </Badge>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {planIcons[key]}
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">{t('billing.perMonth')}</span>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm mb-4 ${planBadgeColors[key]}`}>
                  <Sparkles className="w-3 h-3" />
                  {plan.credits.toLocaleString()} {t('billing.credits')}{t('billing.perMonth')}
                </div>

                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelect(key)}
                  disabled={isCurrentPlan || key === 'free' || loading !== null}
                  variant={isCurrentPlan ? 'outline' : isPopular ? 'default' : 'secondary'}
                  className="w-full"
                >
                  {loading === key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentPlan ? (
                    t('billing.currentPlan')
                  ) : key === 'free' ? (
                    t('billing.freePlan')
                  ) : (
                    t('billing.upgrade')
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
