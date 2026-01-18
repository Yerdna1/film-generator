'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ModelConfigurationPanel } from './ModelConfigurationPanel';
import type { UnifiedModelConfig } from '@/types/project';

interface ModelConfigModalProps {
  isOpen: boolean;
  onSubmit: () => void;
  modelConfig?: UnifiedModelConfig;
  onConfigChange: (config: UnifiedModelConfig) => void;
  disabled?: boolean;
  isFreeUser?: boolean;
}

export function ModelConfigModal({
  isOpen,
  onSubmit,
  modelConfig,
  onConfigChange,
  disabled = false,
  isFreeUser = false,
}: ModelConfigModalProps) {
  console.log('[ModelConfigModal] Render:', { isOpen, modelConfig, disabled, isFreeUser });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onSubmit()}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Konfigurácia modelov</DialogTitle>
          <DialogDescription>
            Nastavte modely AI pre generovanie vášho filmu. Tieto nastavenia môžete kedykoľvek zmeniť.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ModelConfigurationPanel
            modelConfig={modelConfig}
            onConfigChange={onConfigChange}
            disabled={disabled}
            isFreeUser={isFreeUser}
          />
        </div>
        <DialogFooter className="mt-6">
          <Button onClick={onSubmit} className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white">
            Potvrdiť a pokračovať
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
