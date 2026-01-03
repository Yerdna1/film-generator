'use client';

import { useTranslations } from 'next-intl';
import { Lock, Database, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface LockedSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneName?: string;
}

export function LockedSceneModal({
  isOpen,
  onClose,
  sceneName,
}: LockedSceneModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <DialogTitle className="text-xl">
              {t('steps.scenes.locked.title')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {sceneName
              ? t('steps.scenes.locked.descriptionWithName', { name: sceneName })
              : t('steps.scenes.locked.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Database access notice */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  {t('steps.scenes.locked.databaseRequired')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('steps.scenes.locked.databaseHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Close button */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
