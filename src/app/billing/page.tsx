'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  Sparkles,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SubscriptionPlans, CurrentPlan } from '@/components/billing';

interface SubscriptionInfo {
  status: string;
  plan: string;
  planDetails: {
    name: string;
    price: number;
    credits: number;
    description: string;
    features: string[];
  };
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

interface PlanInfo {
  name: string;
  price: number;
  credits: number;
  description: string;
  features: string[];
}

interface SubscriptionData {
  subscription: SubscriptionInfo | null;
  plans: Record<string, PlanInfo>;
}

interface CreditsData {
  balance: number;
  totalSpent: number;
  totalEarned: number;
}

export default function BillingPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for success redirect
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      // Remove query param
      router.replace('/billing');
    }
  }, [searchParams, router]);

  // Fetch subscription data (plans are visible to all, user data only for authenticated)
  useEffect(() => {
    async function fetchData() {
      if (status === 'loading') return;

      try {
        // Always fetch plans (visible to all users)
        const subRes = await fetch('/api/polar');
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscriptionData(subData);
        }

        // Only fetch credits for authenticated users
        if (session?.user) {
          const creditsRes = await fetch('/api/credits');
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json();
            setCredits(creditsData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session, status]);

  const handleSelectPlan = async (plan: string) => {
    // Redirect to login if not authenticated
    if (!session?.user) {
      router.push('/auth/login?callbackUrl=/billing');
      return;
    }

    try {
      const response = await fetch('/api/polar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', plan }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.error) {
        console.error('Checkout error:', data.error);
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/polar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });

      const data = await response.json();

      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else if (data.error) {
        console.error('Portal error:', data.error);
      }
    } catch (error) {
      console.error('Portal error:', error);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={session?.user ? '/settings' : '/'}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              {t('billing.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('billing.subtitle')}
            </p>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-medium text-green-400">{t('billing.subscriptionActivated')}</div>
              <div className="text-sm text-muted-foreground">
                {t('billing.creditsAdded')}
              </div>
            </div>
          </motion.div>
        )}

        {/* Credit Balance - Only for authenticated users */}
        {session?.user && credits && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('billing.creditBalance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-primary/10">
                  <div className="text-sm text-muted-foreground">{t('billing.available')}</div>
                  <div className="text-2xl font-bold text-primary">
                    {(credits.balance ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">{t('billing.totalSpent')}</div>
                  <div className="text-2xl font-bold">
                    {(credits.totalSpent ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">{t('billing.totalEarned')}</div>
                  <div className="text-2xl font-bold">
                    {(credits.totalEarned ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Plan - Only for authenticated users with subscription */}
        {session?.user && subscriptionData?.subscription && (
          <CurrentPlan
            plan={subscriptionData.subscription.plan}
            planName={subscriptionData.subscription.planDetails.name}
            status={subscriptionData.subscription.status}
            currentPeriodEnd={
              subscriptionData.subscription.currentPeriodEnd
                ? new Date(subscriptionData.subscription.currentPeriodEnd)
                : null
            }
            cancelAtPeriodEnd={subscriptionData.subscription.cancelAtPeriodEnd}
            credits={subscriptionData.subscription.planDetails.credits}
            onManageSubscription={handleManageSubscription}
          />
        )}

        {/* Available Plans - Visible to everyone */}
        {subscriptionData && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('billing.availablePlans')}</h2>
            <SubscriptionPlans
              plans={subscriptionData.plans}
              currentPlan={subscriptionData.subscription?.plan || 'free'}
              onSelectPlan={handleSelectPlan}
            />
          </div>
        )}

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.faq')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">{t('billing.howCreditsWork')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('billing.howCreditsWorkAnswer')}
              </p>
            </div>
            <div>
              <h3 className="font-medium">{t('billing.creditsRollOver')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('billing.creditsRollOverAnswer')}
              </p>
            </div>
            <div>
              <h3 className="font-medium">{t('billing.canCancelAnytime')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('billing.canCancelAnytimeAnswer')}
              </p>
            </div>
            <div>
              <h3 className="font-medium">{t('billing.paymentMethods')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('billing.paymentMethodsAnswer')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
