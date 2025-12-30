'use client';

import { useTranslations } from 'next-intl';
import { Image as ImageIcon, Film, MessageSquare, Save, X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CopyButton } from '@/components/shared/CopyButton';
import { cameraShots } from '@/lib/constants/scene';
import type { CameraShot, DialogueLine, Character } from '@/types/project';

interface EditSceneData {
  title: string;
  description: string;
  cameraShot: CameraShot;
  textToImagePrompt: string;
  imageToVideoPrompt: string;
  dialogue: DialogueLine[];
}

interface EditSceneDialogProps {
  open: boolean;
  editSceneData: EditSceneData | null;
  characters: Character[];
  onEditSceneDataChange: (data: EditSceneData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EditSceneDialog({
  open,
  editSceneData,
  characters,
  onEditSceneDataChange,
  onSave,
  onCancel,
}: EditSceneDialogProps) {
  const t = useTranslations();

  if (!editSceneData) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="glass-strong border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('steps.scenes.editScene')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('steps.scenes.sceneTitle')}</Label>
              <Input
                value={editSceneData.title}
                onChange={(e) => onEditSceneDataChange({ ...editSceneData, title: e.target.value })}
                className="glass border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('steps.scenes.cameraShot')}</Label>
              <Select
                value={editSceneData.cameraShot}
                onValueChange={(value) =>
                  onEditSceneDataChange({ ...editSceneData, cameraShot: value as CameraShot })
                }
              >
                <SelectTrigger className="glass border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  {cameraShots.map((shot) => (
                    <SelectItem key={shot.value} value={shot.value}>
                      {shot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1 text-emerald-400">
                <ImageIcon className="w-3 h-3" />
                {t('steps.scenes.textToImagePrompt')}
              </Label>
              <CopyButton text={editSceneData.textToImagePrompt} size="icon" className="h-6 w-6" />
            </div>
            <Textarea
              value={editSceneData.textToImagePrompt}
              onChange={(e) => onEditSceneDataChange({ ...editSceneData, textToImagePrompt: e.target.value })}
              className="glass border-white/10 min-h-[100px] font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1 text-cyan-400">
                <Film className="w-3 h-3" />
                {t('steps.scenes.imageToVideoPrompt')}
              </Label>
              <CopyButton text={editSceneData.imageToVideoPrompt} size="icon" className="h-6 w-6" />
            </div>
            <Textarea
              value={editSceneData.imageToVideoPrompt}
              onChange={(e) => onEditSceneDataChange({ ...editSceneData, imageToVideoPrompt: e.target.value })}
              className="glass border-white/10 min-h-[80px] font-mono text-xs"
            />
          </div>

          {/* Dialogue Section */}
          {editSceneData.dialogue.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-purple-400">
                <MessageSquare className="w-3 h-3" />
                {t('steps.scenes.dialogue')}
              </Label>
              <div className="glass rounded-lg p-3 space-y-2">
                {editSceneData.dialogue.map((line, idx) => {
                  const character = characters.find((c) => c.id === line.characterId);
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          value={line.text}
                          onChange={(e) => {
                            const newDialogue = [...editSceneData.dialogue];
                            newDialogue[idx] = { ...newDialogue[idx], text: e.target.value };
                            onEditSceneDataChange({ ...editSceneData, dialogue: newDialogue });
                          }}
                          className="glass border-white/10 text-sm"
                          placeholder={`${character?.name || 'Character'}: dialogue...`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        onClick={() => {
                          const newDialogue = editSceneData.dialogue.filter((_, i) => i !== idx);
                          onEditSceneDataChange({ ...editSceneData, dialogue: newDialogue });
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="border-white/10">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={onSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0"
            >
              <Save className="w-4 h-4 mr-2" />
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
