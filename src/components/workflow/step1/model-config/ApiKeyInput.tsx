'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApiKeyInputProps {
  provider: string;
  apiKeyName: string;
  hasKey: boolean;
  maskedKey?: string; // Masked key showing last 4 chars (e.g., "••••1234")
  onSave: (keyName: string, value: string) => Promise<void>;
}

export function ApiKeyInput({ provider, apiKeyName, hasKey, maskedKey, onSave }: ApiKeyInputProps) {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const t = useTranslations();

  const handleSaveClick = () => {
    if (!value.trim()) return;
    setShowSaveDialog(true);
  };

  const confirmSave = async () => {
    setShowSaveDialog(false);
    setIsSaving(true);
    await onSave(apiKeyName, value);
    setValue('');
    setIsSaving(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);
    await onSave(apiKeyName, ''); // Save empty string to delete
    setIsDeleting(false);
  };

  return (
    <>
      <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium text-muted-foreground">
            {hasKey ? t('step1.modelConfiguration.apiKeySet') : t('step1.modelConfiguration.apiKeyRequired')}
          </Label>
          {hasKey && (
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
              Active
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={maskedKey || (hasKey ? '••••••••••••••••' : `Enter ${provider} API Key`)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSaveClick}
            disabled={!value.trim() || isSaving}
            className="h-8 px-3"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          {hasKey && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="h-8 px-3"
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(hasKey ? 'step1.modelConfiguration.updateApiKeyTitle' : 'step1.modelConfiguration.saveApiKeyTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(hasKey ? 'step1.modelConfiguration.updateApiKeyMessage' : 'step1.modelConfiguration.saveApiKeyMessage', { provider })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('step1.modelConfiguration.cancelButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>{t('step1.modelConfiguration.continueButton')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('step1.modelConfiguration.deleteApiKeyTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('step1.modelConfiguration.deleteApiKeyMessage', { provider })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('step1.modelConfiguration.cancelButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('step1.modelConfiguration.deleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
