'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { AlertCircle, Sparkles, ArrowRight, Loader2, RefreshCw, UserCheck, Crown } from 'lucide-react';
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

// Extended context for bulk operations
export interface BulkRegenerationContext {
  projectId: string;
  scenes: Array<{
    id: string;
    title: string;
    number: number;
    imageUrl?: string | null;
  }>;
  targetType: RegenerationTargetType;
}

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  required: number;
  balance: number;
  // Optional: For showing "Request Admin Approval" option (single scene)
  regenerationContext?: RegenerationContext | null;
  // Optional: For bulk operations (multiple scenes)
  bulkRegenerationContext?: BulkRegenerationContext | null;
  onRequestApproval?: () => void;
}

interface Plan {
  name: string;
  price: number;
  credits: number;
  description: string;
}

const quickPlans: Record<string, Plan> = {
  starter: { name: 'Starter', price: 9, credits: 500, description: 'For hobbyists' },
  pro: { name: 'Pro', price: 29, credits: 2000, description: 'Most popular' },
  studio: { name: 'Studio', price: 79, credits: 6000, description: 'For creators' },
};

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  required,
  balance,
  regenerationContext,
  bulkRegenerationContext,
  onRequestApproval,
}: InsufficientCreditsModalProps) {
  const t = useTranslations('creditsModal');
  const tError = useTranslations('error');
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [isProjectAdmin, setIsProjectAdmin] = useState<boolean | null>(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  // Determine if we have any regeneration context (single or bulk)
  const hasContext = regenerationContext || bulkRegenerationContext;
  const isBulk = !!bulkRegenerationContext;
  const sceneCount = isBulk ? bulkRegenerationContext.scenes.length : 1;
  const targetType = isBulk ? bulkRegenerationContext.targetType : regenerationContext?.targetType;
  const projectId = isBulk ? bulkRegenerationContext.projectId : regenerationContext?.projectId;

  // Calculate actual required credits for bulk operations
  // The 'required' from 402 is for a single item, multiply by count for bulk
  const actualRequired = isBulk ? required * sceneCount : required;

  // Check if user can request approval (only collaborators can, not admins)
  useEffect(() => {
    if (!isOpen || !projectId || !hasContext) {
      setIsProjectAdmin(null);
      return;
    }

    const checkPermissions = async () => {
      setCheckingPermissions(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/permissions`);
        if (response.ok) {
          const data = await response.json();
          // Check canRequestRegeneration - only collaborators have this permission
          // Admins have canRegenerate but NOT canRequestRegeneration
          const canRequestRegeneration = data.permissions?.canRequestRegeneration === true;
          // If they CAN'T request regeneration, they must be an admin (or reader)
          setIsProjectAdmin(!canRequestRegeneration);
        } else {
          // On error, assume they can try to request
          setIsProjectAdmin(false);
        }
      } catch {
        setIsProjectAdmin(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [isOpen, projectId, hasContext]);

  // Can show request approval option only if user is a collaborator (not admin)
  const canShowRequestApproval = hasContext && isProjectAdmin === false;

  const handleRequestApproval = async () => {
    if (!hasContext || !projectId) {
      setApprovalError(tError('missingProjectContext'));
      return;
    }

    if (!targetType) {
      setApprovalError(tError('missingTargetType'));
      return;
    }

    setRequestingApproval(true);
    setApprovalError(null);

    try {
      const sceneIds = isBulk
        ? bulkRegenerationContext.scenes.map(s => s.id)
        : [regenerationContext!.sceneId];

      if (sceneIds.length === 0) {
        setApprovalError(tError('noScenesSelected'));
        return;
      }

      console.log('Submitting regeneration request:', { projectId, targetType, sceneIds });

      const response = await fetch(`/api/projects/${projectId}/regeneration-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          sceneIds,
          reason: 'Insufficient credits - requesting admin to regenerate',
        }),
      });

      // Clone response to read body twice if needed
      const responseClone = response.clone();
      let data;
      try {
        data = await response.json();
      } catch {
        // If JSON parsing fails, try to get text
        const text = await responseClone.text();
        console.error('Failed to parse response as JSON. Status:', response.status, 'Body:', text);
        setApprovalError(tError('invalidResponse', { status: response.status }));
        return;
      }

      if (!response.ok) {
        console.error('Regeneration request failed:', {
          status: response.status,
          statusText: response.statusText,
          data,
          url: response.url
        });
        setApprovalError(data.error || tError('requestFailed', { status: response.status, statusText: response.statusText }));
        return;
      }

      setApprovalSuccess(true);
      onRequestApproval?.();

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setApprovalSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting request:', error);
      setApprovalError(error instanceof Error ? error.message : tError('failedToSubmitRequest'));
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
              <div className="text-sm text-muted-foreground">
                {t('insufficientCredits.required')}
                {isBulk && <span className="text-xs ml-1">({t('itemsCount', { count: sceneCount })})</span>}
              </div>
              <div className="text-lg font-semibold text-red-400">{actualRequired} {t('credits.points')}</div>
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
                  <span className="font-semibold">{t('pricePerMonth', { price: plan.price })}</span>
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

          {/* Request Admin Approval - Only shown for collaborators (not admins) */}
          {hasContext && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t('insufficientCredits.or')}</span>
                </div>
              </div>

              {/* Loading state while checking permissions */}
              {checkingPermissions && (
                <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('checkingPermissions')}</span>
                </div>
              )}

              {/* Admin message - they cannot request from themselves */}
              {!checkingPermissions && isProjectAdmin === true && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Crown className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">
                        {t('youAreOwner')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('ownerNote')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collaborator request approval option */}
              {!checkingPermissions && canShowRequestApproval && (
                <>
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
                              {isBulk
                                ? t('askAdminRegenerate', {
                                    count: sceneCount,
                                    type: targetType || 'image',
                                    plural: sceneCount > 1 ? 's' : ''
                                  })
                                : t('insufficientCredits.askAdmin', { type: targetType || 'image' })}
                            </p>
                            {isBulk ? (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <span className="font-medium">{sceneCount} {t('scenesSelected')}</span>{' '}
                                {bulkRegenerationContext.scenes
                                  .slice(0, 3)
                                  .map(s => `Scene ${s.number}`)
                                  .join(', ')}
                                {sceneCount > 3 && ` +${sceneCount - 3} more`}
                              </div>
                            ) : regenerationContext && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {t('insufficientCredits.scene')} {regenerationContext.sceneNumber}: {regenerationContext.sceneName}
                              </p>
                            )}
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
                            {isBulk
                              ? t('requestApprovalFor', {
                                  count: sceneCount,
                                  type: targetType || 'image',
                                  plural: sceneCount > 1 ? 's' : ''
                                })
                              : t('insufficientCredits.requestAdminApproval')}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
