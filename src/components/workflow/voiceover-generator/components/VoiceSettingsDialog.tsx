'use client';

import { useTranslations } from 'next-intl';
import { User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VoiceSettingsDialogProps } from '../types';

export function VoiceSettingsDialog({
  open,
  onOpenChange,
  characters,
  voices,
  onVoiceChange,
}: VoiceSettingsDialogProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/10">
          <Settings className="w-4 h-4 mr-2" />
          {t('steps.voiceover.voiceSettings')}
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('steps.voiceover.assignVoices')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {characters.map((character) => (
            <div key={character.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-violet-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{character.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {character.voiceName || t('steps.voiceover.noVoice')}
                  </p>
                </div>
              </div>
              <Select
                value={character.voiceId || ''}
                onValueChange={(val) => onVoiceChange(character.id, val)}
              >
                <SelectTrigger className="w-36 glass border-white/10">
                  <SelectValue placeholder={t('steps.voiceover.selectVoice')} />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  {voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div>
                        <p className="font-medium">{voice.name}</p>
                        <p className="text-xs text-muted-foreground">{voice.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
