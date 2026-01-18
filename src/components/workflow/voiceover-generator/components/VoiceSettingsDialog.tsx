'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { User, Settings, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { VoiceSettingsDialogProps } from '../types';

export function VoiceSettingsDialog({
  open,
  onOpenChange,
  characters,
  voices,
  provider,
  onVoiceChange,
  onVoiceSettingsChange,
}: VoiceSettingsDialogProps) {
  const t = useTranslations('voice');
  const [expandedCharacter, setExpandedCharacter] = useState<string | null>(null);

  const isOpenAI = provider === 'openai-tts';
  const isElevenLabs = provider === 'elevenlabs';
  const hasVibeSettings = isOpenAI || isElevenLabs;

  // Gender color helper
  const getGenderStyle = (gender?: 'male' | 'female' | 'neutral' | 'child') => {
    switch (gender) {
      case 'female':
        return { dot: 'bg-pink-500', text: 'text-pink-400', bg: 'bg-pink-500/10' };
      case 'male':
        return { dot: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'child':
        return { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' };
      default:
        return { dot: 'bg-violet-500', text: 'text-violet-400', bg: 'bg-violet-500/10' };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/10">
          <Settings className="w-4 h-4 mr-2" />
          {t('voiceSettings')}
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('assignVoices')}
            {hasVibeSettings && (
              <span className="text-xs text-violet-400 font-normal flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {isOpenAI ? t('openaiInstructions') : t('elevenlabsSettings')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {characters.map((character) => {
            const isExpanded = expandedCharacter === character.id;
            const selectedVoice = voices.find(v => v.id === character.voiceId);
            const selectedGenderStyle = getGenderStyle(selectedVoice?.gender);

            return (
              <div key={character.id} className="glass rounded-lg p-3 border border-white/10">
                <div className="flex items-center justify-between gap-4">
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
                      <div className="flex items-center gap-1.5">
                        {character.voiceName && (
                          <div className={`w-1.5 h-1.5 rounded-full ${selectedGenderStyle.dot}`} />
                        )}
                        <p className={`text-xs ${character.voiceName ? selectedGenderStyle.text : 'text-muted-foreground'}`}>
                          {character.voiceName || t('noVoice')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={character.voiceId || ''}
                      onValueChange={(val) => onVoiceChange(character.id, val)}
                    >
                      <SelectTrigger className="w-32 glass border-white/10">
                        <SelectValue placeholder={t('selectVoice')} />
                      </SelectTrigger>
                      <SelectContent className="glass-strong border-white/10 max-h-[300px]">
                        {voices.map((voice) => {
                          const genderStyle = getGenderStyle(voice.gender);
                          return (
                            <SelectItem key={voice.id} value={voice.id} className={`${genderStyle.bg} mb-0.5`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${genderStyle.dot}`} />
                                <div>
                                  <p className={`font-medium ${genderStyle.text}`}>{voice.name}</p>
                                  <p className="text-xs text-muted-foreground">{voice.description}</p>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {hasVibeSettings && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedCharacter(isExpanded ? null : character.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Voice Settings Panel */}
                {hasVibeSettings && isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-4">
                    {/* OpenAI Instructions */}
                    {isOpenAI && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {t('instructionsLabel')}
                        </Label>
                        <Input
                          placeholder={t('instructionsPlaceholder')}
                          value={character.voiceInstructions || ''}
                          onChange={(e) => onVoiceSettingsChange(character.id, {
                            voiceInstructions: e.target.value
                          })}
                          className="glass border-white/10 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          {t('instructionsHint')}
                        </p>
                      </div>
                    )}

                    {/* ElevenLabs Settings */}
                    {isElevenLabs && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                              {t('stability')}
                            </Label>
                            <span className="text-xs text-violet-400">
                              {Math.round((character.voiceStability ?? 0.5) * 100)}%
                            </span>
                          </div>
                          <Slider
                            value={[character.voiceStability ?? 0.5]}
                            onValueChange={([val]) => onVoiceSettingsChange(character.id, {
                              voiceStability: val
                            })}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {t('stabilityHint')}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                              {t('similarity')}
                            </Label>
                            <span className="text-xs text-violet-400">
                              {Math.round((character.voiceSimilarityBoost ?? 0.75) * 100)}%
                            </span>
                          </div>
                          <Slider
                            value={[character.voiceSimilarityBoost ?? 0.75]}
                            onValueChange={([val]) => onVoiceSettingsChange(character.id, {
                              voiceSimilarityBoost: val
                            })}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {t('similarityHint')}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                              {t('style')}
                            </Label>
                            <span className="text-xs text-violet-400">
                              {Math.round((character.voiceStyle ?? 0) * 100)}%
                            </span>
                          </div>
                          <Slider
                            value={[character.voiceStyle ?? 0]}
                            onValueChange={([val]) => onVoiceSettingsChange(character.id, {
                              voiceStyle: val
                            })}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {t('styleHint')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
