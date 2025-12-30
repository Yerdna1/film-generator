'use client';

import { useTranslations } from 'next-intl';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyButton } from '@/components/shared/CopyButton';
import type { EditCharacterDialogProps } from '../types';

export function EditCharacterDialog({
  open,
  onOpenChange,
  editData,
  onEditDataChange,
  onSave,
  onCancel,
}: EditCharacterDialogProps) {
  const t = useTranslations();

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      onCancel();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-strong border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('steps.characters.editCharacter')}</DialogTitle>
        </DialogHeader>
        {editData && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('steps.characters.characterName')}</Label>
              <Input
                value={editData.name}
                onChange={(e) => onEditDataChange({ ...editData, name: e.target.value })}
                className="glass border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('steps.characters.personality')}</Label>
              <Input
                value={editData.personality}
                onChange={(e) => onEditDataChange({ ...editData, personality: e.target.value })}
                className="glass border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('steps.characters.characterDescription')}</Label>
              <Textarea
                value={editData.description}
                onChange={(e) => onEditDataChange({ ...editData, description: e.target.value })}
                className="glass border-white/10 min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('steps.characters.visualDescription')}</Label>
              <Textarea
                value={editData.visualDescription}
                onChange={(e) => onEditDataChange({ ...editData, visualDescription: e.target.value })}
                className="glass border-white/10 min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('steps.characters.masterPrompt')}</Label>
                <CopyButton text={editData.masterPrompt} size="icon" className="h-6 w-6" />
              </div>
              <Textarea
                value={editData.masterPrompt}
                onChange={(e) => onEditDataChange({ ...editData, masterPrompt: e.target.value })}
                className="glass border-white/10 min-h-[120px] font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onCancel} className="border-white/10">
                {t('common.cancel')}
              </Button>
              <Button
                onClick={onSave}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
              >
                <Save className="w-4 h-4 mr-2" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
