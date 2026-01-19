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
import type { User, CreditAction } from '../types';

interface CreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: User | null;
  creditAction: CreditAction;
  onSubmit: (creditAmount: string, creditReason: string) => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}

export const CreditDialog = ({
  open,
  onOpenChange,
  selectedUser,
  creditAction,
  onSubmit,
  t,
  tCommon,
}: CreditDialogProps) => {
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');

  const handleSubmit = () => {
    onSubmit(creditAmount, creditReason);
    setCreditAmount('');
    setCreditReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {creditAction === 'add' && t('addCredits')}
            {creditAction === 'deduct' && t('deductCredits')}
            {creditAction === 'set' && t('setCredits')}
          </DialogTitle>
          <DialogDescription>
            {creditAction === 'add' && `${t('addCredits')} ${selectedUser?.name || selectedUser?.email}`}
            {creditAction === 'deduct' && `${t('deductCredits')} ${selectedUser?.name || selectedUser?.email}`}
            {creditAction === 'set' && `${t('setCredits')} ${selectedUser?.name || selectedUser?.email}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">
              {creditAction === 'set' ? t('newBalance') : t('amount')}
            </label>
            <Input
              type="number"
              placeholder={t('enterAmount')}
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              min="0"
            />
            {selectedUser && creditAction !== 'set' && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('currentBalance')} {selectedUser.credits.balance.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">{t('reasonOptional')}</label>
            <Input
              placeholder={t('reasonPlaceholder')}
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {creditAction === 'add' && t('addCredits')}
            {creditAction === 'deduct' && t('deductCredits')}
            {creditAction === 'set' && t('setCredits')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
