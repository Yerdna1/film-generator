'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { AlertCircle, Sparkles, ArrowRight, Loader2, RefreshCw, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { RegenerationTargetType } from '@/types/collaboration';

export interface RegenerationContext {
  projectId: string;
  sceneId: string;
  sceneName: string;
  sceneNumber: number;
  targetType: RegenerationTargetType;
  imageUrl?: string | null;
}

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  required: number;
  balance: number;
  // Optional: For showing "Request Admin Approval" option
  regenerationContext?: RegenerationContext | null;
  onRequestApproval?: () => void;
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
  regenerationContext,
  onRequestApproval,
}: InsufficientCreditsModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const handleRequestApproval = async () => {
    if (!regenerationContext) return;

    setRequestingApproval(true);
    setApprovalError(null);

    try {
      const response = await fetch(`/api/projects/${regenerationContext.projectId}/regeneration-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: regenerationContext.targetType,
          sceneIds: [regenerationContext.sceneId],
          reason: 'Insufficient credits - requesting admin to regenerate',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApprovalError(data.error || 'Failed to submit request');
        return;
      }

      setApprovalSuccess(true);
      onRequestApproval?.();

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setApprovalSuccess(false);
      }, 2000);
    } catch {
      setApprovalError('Failed to submit request');
    } finally {
      setRequestingApproval(false);
    }
  };

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
            <DialogTitle className="text-xl">{t('insufficientCredits.title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('insufficientCredits.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Credit Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <div className="text-sm text-muted-foreground">{t('insufficientCredits.required')}</div>
              <div className="text-lg font-semibold text-red-400">{required} {t('credits.points')}</div>
            </div>
            <div className="text-2xl text-muted-foreground">/</div>
            <div>
              <div className="text-sm text-muted-foreground">{t('insufficientCredits.yourBalance')}</div>
              <div className="text-lg font-semibold">{balance} {t('credits.points')}</div>
            </div>
          </div>

          {/* Quick Upgrade Options */}
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2">{t('insufficientCredits.quickUpgrade')}</div>
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
                      {plan.credits.toLocaleString()} {t('insufficientCredits.creditsMonth')}
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
            {t('insufficientCredits.viewAllPlans')}
          </Button>

          {/* Request Admin Approval - Only shown when regeneration context is available */}
          {regenerationContext && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t('insufficientCredits.or')}</span>
                </div>
              </div>

              {approvalSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-center"
                >
                  <UserCheck className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-cyan-400">{t('insufficientCredits.requestSubmitted')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('insufficientCredits.adminNotified')}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-cyan-400">
                          {t('insufficientCredits.requestAdminApproval')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('insufficientCredits.askAdmin', { type: regenerationContext.targetType })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('insufficientCredits.scene')} {regenerationContext.sceneNumber}: {regenerationContext.sceneName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {approvalError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                      {approvalError}
                    </div>
                  )}

                  <Button
                    onClick={handleRequestApproval}
                    disabled={requestingApproval}
                    className="w-full bg-cyan-600 hover:bg-cyan-500"
                  >
                    {requestingApproval ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('insufficientCredits.submittingRequest')}
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        {t('insufficientCredits.requestAdminApproval')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
