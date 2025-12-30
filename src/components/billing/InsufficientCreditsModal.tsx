'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Sparkles, ArrowRight, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  required: number;
  balance: number;
}

interface Plan {
  name: string;
  price: number;
  credits: number;
  description: string;
}

const quickPlans: Record<string, Plan> = {
  starter: { name: 'Starter', price: 9, credits: 2000, description: 'For hobbyists' },
  pro: { name: 'Pro', price: 29, credits: 8000, description: 'Most popular' },
  studio: { name: 'Studio', price: 79, credits: 25000, description: 'For creators' },
};

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  required,
  balance,
}: InsufficientCreditsModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: string) => {
    setLoading(plan);
    try {
      const response = await fetch('/api/polar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', plan }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        // Fallback to billing page
        router.push('/billing');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      router.push('/billing');
    } finally {
      setLoading(null);
    }
  };

  const handleViewPlans = () => {
    onClose();
    router.push('/billing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-500/20">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <DialogTitle className="text-xl">Insufficient Credits</DialogTitle>
          </div>
          <DialogDescription>
            You need more credits to continue with this operation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Credit Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <div className="text-sm text-muted-foreground">Required</div>
              <div className="text-lg font-semibold text-red-400">{required} credits</div>
            </div>
            <div className="text-2xl text-muted-foreground">/</div>
            <div>
              <div className="text-sm text-muted-foreground">Your Balance</div>
              <div className="text-lg font-semibold">{balance} credits</div>
            </div>
          </div>

          {/* Quick Upgrade Options */}
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2">Quick Upgrade</div>
            {Object.entries(quickPlans).map(([key, plan]) => (
              <motion.button
                key={key}
                onClick={() => handleUpgrade(key)}
                disabled={loading !== null}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-muted hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {plan.credits.toLocaleString()} credits/month
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">${plan.price}/mo</span>
                  {loading === key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* View All Plans */}
          <Button
            onClick={handleViewPlans}
            variant="outline"
            className="w-full"
          >
            View All Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
