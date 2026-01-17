'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { AddCharacterDialogProps, CharacterFormData } from '../types';
import { MAX_CHARACTERS } from '../types';
import { characterPresets } from '../character-presets';

export function AddCharacterDialog({
  open,
  onOpenChange,
  onAddCharacter,
  currentCount,
  maxCount,
}: AddCharacterDialogProps) {
  const t = useTranslations();
  const [newCharacter, setNewCharacter] = useState<CharacterFormData>({
    name: '',
    description: '',
    visualDescription: '',
    personality: '',
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!newCharacter.name.trim()) return;
    onAddCharacter(newCharacter);
    setNewCharacter({ name: '', description: '', visualDescription: '', personality: '' });
    setSelectedPresetId(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setNewCharacter({ name: '', description: '', visualDescription: '', personality: '' });
    setSelectedPresetId(null);
  };

  const handleApplyPreset = (preset: typeof characterPresets[0]) => {
    setNewCharacter({
      name: preset.name,
      description: preset.description,
      visualDescription: preset.visualDescription,
      personality: preset.personality,
    });
    setSelectedPresetId(preset.id);
  };

  if (currentCount >= maxCount) {
    return (
      <div className="w-full h-full min-h-[300px] glass rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <span className="text-muted-foreground">
          {t('steps.characters.maxReached')}
        </span>
        <span className="text-xs text-muted-foreground">
          {MAX_CHARACTERS}/{MAX_CHARACTERS}
        </span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="w-full h-full min-h-[300px] glass rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/30 transition-colors flex flex-col items-center justify-center gap-4 group">
          <div className="w-16 h-16 rounded-2xl bg-white/5 group-hover:bg-purple-500/20 transition-colors flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground group-hover:text-purple-400 transition-colors" />
          </div>
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            {t('steps.characters.addCharacter')}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentCount}/{maxCount}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('steps.characters.addCharacter')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Preset Characters Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('characterPresets.title')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {characterPresets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg border transition-all
                      ${selectedPresetId === preset.id
                        ? 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
                      }
                    `}
                  >
                    <div className={`p-2 rounded-lg ${preset.iconBg} ${preset.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{t(preset.titleKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Manual Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('steps.characters.characterName')}</Label>
              <Input
                placeholder={t('steps.characters.placeholders.name')}
                value={newCharacter.name}
                onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                className="glass border-white/10"
              />
            </div>
          <div className="space-y-2">
            <Label>{t('steps.characters.personality')}</Label>
            <Input
              placeholder={t('steps.characters.placeholders.personality')}
              value={newCharacter.personality}
              onChange={(e) => setNewCharacter({ ...newCharacter, personality: e.target.value })}
              className="glass border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('steps.characters.characterDescription')}</Label>
            <Textarea
              placeholder={t('steps.characters.placeholders.description')}
              value={newCharacter.description}
              onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
              className="glass border-white/10 min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('steps.characters.visualDescription')}</Label>
            <Textarea
              placeholder={t('steps.characters.placeholders.visualDescription')}
              value={newCharacter.visualDescription}
              onChange={(e) => setNewCharacter({ ...newCharacter, visualDescription: e.target.value })}
              className="glass border-white/10 min-h-[100px]"
            />
          </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} className="border-white/10">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!newCharacter.name.trim()}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('common.create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
