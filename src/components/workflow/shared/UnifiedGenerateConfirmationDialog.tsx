'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, User, FileText, Video, Mic,
  Image as ImageIcon, Music, Brain,
  LucideIcon, Loader2, CheckCircle,
  AlertCircle, RefreshCw, DollarSign
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ProviderLogo } from '@/components/ui/ProviderLogo';
import { cn } from '@/lib/utils';

export type OperationType = 'llm' | 'image' | 'video' | 'tts' | 'music';

type DialogState = 'confirm' | 'loading' | 'success' | 'error';

const OPERATION_ICONS: Record<OperationType, LucideIcon> = {
  llm: Brain,
  image: ImageIcon,
  video: Video,
  tts: Mic,
  music: Music,
};

const OPERATION_COLORS: Record<OperationType, string> = {
  llm: 'text-purple-400',
  image: 'text-blue-400',
  video: 'text-pink-400',
  tts: 'text-violet-400',
  music: 'text-green-400',
};

const OPERATION_GRADIENTS: Record<OperationType, string> = {
  llm: 'from-purple-500 to-cyan-500',
  image: 'from-blue-500 to-cyan-500',
  video: 'from-pink-500 to-purple-500',
  tts: 'from-violet-500 to-purple-500',
  music: 'from-green-500 to-teal-500',
};

export interface UnifiedGenerateConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  operation: OperationType;
  provider: string;
  model: string;
  details: Array<{
    label: string;
    value: string | number;
    icon?: string | LucideIcon;
    className?: string;
  }>;
  estimatedCost?: number;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Optional: auto-close on success after this many milliseconds
  autoCloseDelay?: number;
  // Optional: show fallback indicator if using default model
  isUsingFallback?: boolean;
}

export function UnifiedGenerateConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  operation,
  provider,
  model,
  details = [],
  estimatedCost,
  title,
  description,
  confirmLabel,
  cancelLabel,
  autoCloseDelay = 1500,
  isUsingFallback = false,
}: UnifiedGenerateConfirmationDialogProps) {
  const commonT = useTranslations('common');
  const [state, setState] = useState<DialogState>('confirm');
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setState('confirm');
      setError(null);
    }
  }, [isOpen]);

  // Auto-close on success
  useEffect(() => {
    if (state === 'success' && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [state, autoCloseDelay, onClose]);

  const handleConfirm = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      await onConfirm();
      setState('success');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [onConfirm]);

  const handleRetry = useCallback(() => {
    handleConfirm();
  }, [handleConfirm]);

  const handleCancel = useCallback(() => {
    if (state === 'loading') return; // Don't allow cancel during loading
    onClose();
  }, [state, onClose]);

  if (!isOpen) return null;

  const Icon = OPERATION_ICONS[operation];
  const iconColor = OPERATION_COLORS[operation];
  const gradient = OPERATION_GRADIENTS[operation];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="glass-strong rounded-xl p-4 max-w-sm mx-auto border border-white/10 w-full max-h-[85vh] flex flex-col"
        >
          <div className="flex flex-col gap-3 overflow-y-auto">
            {/* Icon with state indication */}
            <div className="flex justify-center shrink-0">
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-full blur-lg opacity-40`}></div>
                <div className="relative z-10">
                  {state === 'loading' && (
                    <Loader2 className={`w-12 h-12 ${iconColor} animate-spin`} />
                  )}
                  {state === 'success' && (
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  )}
                  {state === 'error' && (
                    <AlertCircle className="w-12 h-12 text-red-400" />
                  )}
                  {state === 'confirm' && (
                    <Icon className={`w-12 h-12 ${iconColor}`} />
                  )}
                </div>
              </div>
            </div>

            {/* Title and description */}
            <div className="text-center space-y-1 shrink-0">
              <h3 className="text-base font-semibold text-foreground">
                {state === 'loading' && commonT('generating')}
                {state === 'success' && commonT('success')}
                {state === 'error' && commonT('error')}
                {state === 'confirm' && title}
              </h3>
              {description && state === 'confirm' && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
              {error && state === 'error' && (
                <p className="text-xs text-red-400">
                  {error}
                </p>
              )}
            </div>

            {/* Info items - only show in confirm state */}
            {state === 'confirm' && (
              <div className="space-y-1.5 py-1 overflow-y-auto">
                {/* Provider info with logo */}
                <div className="flex items-center justify-between p-2 rounded-lg border bg-white/5">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider={provider} size="sm" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Provider</div>
                      <div className="font-medium text-xs flex items-center gap-1">
                        {provider}
                        {isUsingFallback && (
                          <span className="text-[10px] text-yellow-500">(fallback)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Model info */}
                <div className="flex items-center justify-between p-2 rounded-lg border bg-white/5">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Model</div>
                    <div className="font-medium text-xs" title={model}>
                      {model.includes('/')
                        ? model.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || model
                        : model}
                    </div>
                  </div>
                </div>

                {/* Additional details */}
                {details.map((item, index) => (
                  <div key={index} className={cn(
                    "flex items-center justify-between p-2 rounded-lg border bg-white/5",
                    item.className
                  )}>
                    <div className="flex items-center gap-1.5">
                      {item.icon && (
                        typeof item.icon === 'string' ? (
                          <span className="text-sm">{item.icon}</span>
                        ) : (
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                        )
                      )}
                      <div>
                        <div className="text-[10px] text-muted-foreground">{item.label}</div>
                        <div className="font-medium text-xs">{item.value}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Estimated cost */}
                {estimatedCost !== undefined && estimatedCost > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg border bg-yellow-500/10 border-yellow-500/20">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-yellow-500" />
                      <div>
                        <div className="text-[10px] text-yellow-600 dark:text-yellow-400">Estimated Cost</div>
                        <div className="font-medium text-xs text-yellow-700 dark:text-yellow-300">
                          {estimatedCost < 1
                            ? `${(estimatedCost * 100).toFixed(1)} credits`
                            : `${estimatedCost.toFixed(2)} credits`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success message */}
            {state === 'success' && (
              <div className="text-center py-2 shrink-0">
                <p className="text-xs text-green-400">
                  Operation completed successfully!
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1 shrink-0">
              {state === 'confirm' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 border-white/10 h-9 text-xs"
                  >
                    {cancelLabel || commonT('cancel')}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className={`flex-1 bg-gradient-to-r ${gradient} hover:opacity-90 text-white border-0 h-9 text-xs`}
                  >
                    <Icon className="w-3.5 h-3.5 mr-1" />
                    {confirmLabel || commonT('generate')}
                  </Button>
                </>
              )}

              {state === 'loading' && (
                <div className="flex-1 text-center text-xs text-muted-foreground py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto mb-1" />
                  Processing your request...
                </div>
              )}

              {state === 'error' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 border-white/10 h-9 text-xs"
                  >
                    {commonT('close')}
                  </Button>
                  <Button
                    onClick={handleRetry}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-red-500 hover:opacity-90 text-white border-0 h-9 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    {commonT('retry')}
                  </Button>
                </>
              )}

              {state === 'success' && autoCloseDelay === 0 && (
                <Button
                  onClick={onClose}
                  className={`flex-1 bg-gradient-to-r ${gradient} hover:opacity-90 text-white border-0 h-9 text-xs`}
                >
                  {commonT('close')}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}