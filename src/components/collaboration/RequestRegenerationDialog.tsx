'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  RefreshCw,
  Loader2,
  Check,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RegenerationTargetType } from '@/types/collaboration';

interface SceneInfo {
  id: string;
  title: string;
  number: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

interface RequestRegenerationDialogProps {
  projectId: string;
  targetType: RegenerationTargetType;
  scenes: SceneInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSent?: () => void;
}

export function RequestRegenerationDialog({
  projectId,
  targetType,
  scenes,
  open,
  onOpenChange,
  onRequestSent,
}: RequestRegenerationDialogProps) {
  const t = useTranslations();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/regeneration-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          sceneIds: scenes.map(s => s.id),
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('error.failedToSubmitRequest'));
        return;
      }

      setIsSuccess(true);
      setResult({ created: data.created, skipped: data.skipped });
      onRequestSent?.();

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (e) {
      setError(t('error.failedToSubmitRequest'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setReason('');
      setError(null);
      setIsSuccess(false);
      setResult(null);
    }, 200);
  };

  const Icon = targetType === 'image' ? ImageIcon : Video;
  const typeLabel = targetType === 'image' ? t('credits.image').toLowerCase() : t('credits.video').toLowerCase();
  const typeLabelCapitalized = targetType === 'image' ? t('credits.image') : t('credits.video');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-strong border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            {t('collaborationModals.regenerationRequest.requestTitle', { type: typeLabelCapitalized })}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('collaborationModals.regenerationRequest.submitDescription', { count: scenes.length, type: typeLabel })}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{t('collaborationModals.regenerationRequest.requestSubmitted')}</h3>
            <p className="text-sm text-muted-foreground">
              {result?.created === 1
                ? t('collaborationModals.regenerationRequest.requestSentSingle')
                : t('collaborationModals.regenerationRequest.requestSentMultiple', { count: result?.created || 0 })}
              {result?.skipped && result.skipped > 0 && (
                <span className="block mt-1 text-yellow-400">
                  {t('collaborationModals.regenerationRequest.scenesSkipped', { count: result.skipped })}
                </span>
              )}
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Scene previews */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {t('collaborationModals.regenerationRequest.selectedItems', { type: typeLabel, count: scenes.length })}
              </Label>
              <ScrollArea className="h-[120px] rounded-lg border border-white/10 bg-white/5">
                <div className="p-2 space-y-2">
                  {scenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="flex items-center gap-3 p-2 rounded bg-white/5"
                    >
                      <div className="relative w-16 h-9 rounded overflow-hidden bg-black/30 flex-shrink-0">
                        {scene.imageUrl ? (
                          <Image
                            src={scene.imageUrl}
                            alt={scene.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{scene.title}</p>
                        <p className="text-xs text-muted-foreground">{t('collaborationModals.regenerationRequest.sceneNumber', { number: scene.number })}</p>
                      </div>
                      <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-cyan-400">
                    {t('collaborationModals.regenerationRequest.regenerationRequest')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('collaborationModals.regenerationRequest.adminWillReview', { type: typeLabel, count: scenes.length })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{t('collaborationModals.regenerationRequest.reasonOptional')}</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('collaborationModals.regenerationRequest.whyRegeneratePlaceholder', { count: scenes.length, type: typeLabel })}
                className="bg-white/5 border-white/10 min-h-[80px]"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('collaborationModals.regenerationRequest.submitting')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('collaborationModals.regenerationRequest.submitRequest')}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
