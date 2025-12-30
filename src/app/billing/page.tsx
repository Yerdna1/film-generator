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

interface SubscriptionData {
  subscription: {
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
  };
  plans: Record<string, {
    name: string;
    price: number;
    credits: number;
    description: string;
    features: string[];
  }>;
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

  // Fetch subscription data
  useEffect(() => {
    async function fetchData() {
      if (status === 'loading') return;
      if (!session?.user) {
        router.push('/auth/signin');
        return;
      }

      try {
        // Fetch subscription and credits in parallel
        const [subRes, creditsRes] = await Promise.all([
          fetch('/api/polar'),
          fetch('/api/credits'),
        ]);

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscriptionData(subData);
        }

        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          setCredits(creditsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session, status, router]);

  const handleSelectPlan = async (plan: string) => {
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
            <Link href="/settings">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Billing & Subscription
            </h1>
            <p className="text-muted-foreground">
              Manage your subscription and credits
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
              <div className="font-medium text-green-400">Subscription Activated!</div>
              <div className="text-sm text-muted-foreground">
                Your credits have been added to your account.
              </div>
            </div>
          </motion.div>
        )}

        {/* Credit Balance */}
        {credits && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Credit Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-primary/10">
                  <div className="text-sm text-muted-foreground">Available</div>
                  <div className="text-2xl font-bold text-primary">
                    {credits.balance.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                  <div className="text-2xl font-bold">
                    {credits.totalSpent.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Total Earned</div>
                  <div className="text-2xl font-bold">
                    {credits.totalEarned.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Plan */}
        {subscriptionData && (
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

        {/* Available Plans */}
        {subscriptionData && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Plans</h2>
            <SubscriptionPlans
              plans={subscriptionData.plans}
              currentPlan={subscriptionData.subscription.plan}
              onSelectPlan={handleSelectPlan}
            />
          </div>
        )}

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">How do credits work?</h3>
              <p className="text-sm text-muted-foreground">
                Credits are used for AI generation: images, videos, voiceovers, and more. Each operation costs a certain amount of credits based on complexity.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Do unused credits roll over?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! Your credits never expire. Any unused credits from your monthly allocation remain in your account.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time. You&apos;ll keep access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium">What payment methods are accepted?</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards, debit cards, and various local payment methods through our payment provider Polar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
