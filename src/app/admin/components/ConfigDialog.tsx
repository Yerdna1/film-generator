import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStartingCredits: number;
  onSubmit: (startingCredits: string) => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}

export const ConfigDialog = ({
  open,
  onOpenChange,
  currentStartingCredits,
  onSubmit,
  t,
  tCommon,
}: ConfigDialogProps) => {
  const [startingCreditsInput, setStartingCreditsInput] = useState(String(currentStartingCredits));

  const handleSubmit = () => {
    onSubmit(startingCreditsInput);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editStartingCredits')}</DialogTitle>
          <DialogDescription>
            {t('startingCreditsDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium">{t('startingCredits')}</label>
          <Input
            type="number"
            placeholder="0"
            value={startingCreditsInput}
            onChange={(e) => setStartingCreditsInput(e.target.value)}
            min="0"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('purchaseCreditsNote')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
