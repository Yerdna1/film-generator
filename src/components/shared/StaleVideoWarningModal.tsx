'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw, X, ImageIcon, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface StaleVideoWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  sceneName?: string;
  imageUpdatedAt?: string;
  videoGeneratedAt?: string;
}

export function StaleVideoWarningModal({
  isOpen,
  onClose,
  onConfirm,
  sceneName,
  imageUpdatedAt,
  videoGeneratedAt,
}: StaleVideoWarningModalProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error confirming regeneration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/20">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <DialogTitle className="text-xl">
              {t('steps.videos.staleWarning.title')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {sceneName
              ? t('steps.videos.staleWarning.descriptionWithName', { name: sceneName })
              : t('steps.videos.staleWarning.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Timeline comparison */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-green-500/20">
                <ImageIcon className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {t('steps.videos.staleWarning.imageUpdated')}
                </p>
                <p className="text-sm font-medium">
                  {formatDate(imageUpdatedAt) || t('common.unknown')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-purple-500/20">
                <Video className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {t('steps.videos.staleWarning.videoGenerated')}
                </p>
                <p className="text-sm font-medium">
                  {formatDate(videoGeneratedAt) || t('common.unknown')}
                </p>
              </div>
            </div>
          </div>

          {/* Warning message */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-200">
              {t('steps.videos.staleWarning.hint')}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-amber-600 hover:bg-amber-500"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('steps.videos.staleWarning.regenerateAnyway')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
