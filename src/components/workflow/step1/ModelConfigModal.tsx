'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ModelConfigurationPanel } from './ModelConfigurationPanel';
import type { UnifiedModelConfig } from '@/types/project';
import { useTranslations } from 'next-intl';

interface ModelConfigModalProps {
  isOpen: boolean;
  onSubmit: () => void;
  onClose?: () => void;
  modelConfig?: UnifiedModelConfig;
  onConfigChange: (config: UnifiedModelConfig) => void;
  disabled?: boolean;
  isFreeUser?: boolean;
}

export function ModelConfigModal({
  isOpen,
  onSubmit,
  onClose,
  modelConfig,
  onConfigChange,
  disabled = false,
  isFreeUser = false,
}: ModelConfigModalProps) {
  const t = useTranslations('step1.modelConfiguration.modal');

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      onSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto p-0 gap-0 bg-background/95 backdrop-blur-md"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-8 py-4 border-b bg-background/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium">{t('title')}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-7 w-7 rounded-full hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-8 py-6">
          <ModelConfigurationPanel
            modelConfig={modelConfig}
            onConfigChange={onConfigChange}
            disabled={disabled}
            isFreeUser={isFreeUser}
            isInModal={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
