'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, Loader2, Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KIE_TTS_MODELS, type KieModelConfig } from '@/lib/constants/kie-models';
import { KIE_VOICES } from '../types';
import type { Character } from '@/types/project';

// Affordable KIE TTS models for free users (sorted by price)
// Only include actual TTS models, not speech-to-text or audio processing models
const AFFORDABLE_KIE_TTS_MODELS: KieModelConfig[] = [
  KIE_TTS_MODELS.find(m => m.id === 'elevenlabs/text-to-speech-turbo-2-5')!, // 8 credits - cheapest TTS!
  KIE_TTS_MODELS.find(m => m.id === 'elevenlabs/text-to-dialogue-v3')!, // 10 credits - recommended
  KIE_TTS_MODELS.find(m => m.id === 'elevenlabs/text-to-speech-multilingual-v2')!, // 12 credits
].filter(Boolean);

interface VoiceAssignment {
  characterId: string;
  voiceId: string;
}

interface KieTtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string, voiceAssignments: VoiceAssignment[]) => Promise<void>;
  isLoading?: boolean;
  characters: Character[];
  currentVoiceAssignments?: Map<string, string>; // characterId -> voiceId
}

export function KieTtsModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  characters,
  currentVoiceAssignments = new Map()
}: KieTtsModalProps) {
  const t = useTranslations();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AFFORDABLE_KIE_TTS_MODELS[0].id); // Default to cheapest
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  // Initialize voice assignments from current assignments or defaults
  const [voiceAssignments, setVoiceAssignments] = useState<Record<string, string>>(() => {
    const assignments: Record<string, string> = {};
    characters.forEach((char, index) => {
      // Use existing assignment or default voice based on character gender
      const existingVoice = currentVoiceAssignments.get(char.id);
      if (existingVoice) {
        assignments[char.id] = existingVoice;
      } else {
        // Default voices: alternate between male and female voices (using KIE voice names)
        const defaultVoices = [
          'George', // Adam equivalent (male)
          'Laura',  // Emily equivalent (female)
          'Roger',  // Drew equivalent (male)
          'Aria',   // Domi equivalent (female)
        ];
        assignments[char.id] = defaultVoices[index % defaultVoices.length];
      }
    });
    return assignments;
  });

  // Reset voice assignments when modal opens or current assignments change
  useEffect(() => {
    if (isOpen) {
      const assignments: Record<string, string> = {};
      characters.forEach((char, index) => {
        const existingVoice = currentVoiceAssignments.get(char.id);
        if (existingVoice) {
          assignments[char.id] = existingVoice;
        } else {
          // Default voices: alternate between male and female voices (using KIE voice names)
          const defaultVoices = [
            'George', // Adam equivalent (male)
            'Laura',  // Emily equivalent (female)
            'Roger',  // Drew equivalent (male)
            'Aria',   // Domi equivalent (female)
          ];
          assignments[char.id] = defaultVoices[index % defaultVoices.length];
        }
      });
      setVoiceAssignments(assignments);
    }
  }, [isOpen, characters, currentVoiceAssignments]);

  if (!isOpen) return null;

  const selectedModelConfig = AFFORDABLE_KIE_TTS_MODELS.find(m => m.id === selectedModel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    // Basic KIE AI key format validation (typically UUID-like)
    if (apiKey.length < 20) {
      setError('Invalid KIE AI API key format');
      return;
    }

    try {
      // Convert voice assignments to array
      const assignmentsArray: VoiceAssignment[] = Object.entries(voiceAssignments).map(
        ([characterId, voiceId]) => ({ characterId, voiceId })
      );
      await onSave(apiKey.trim(), selectedModel, assignmentsArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-8 max-w-2xl mx-4 border border-white/10 w-full"
      >
        <div className="space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
              <Mic className="w-16 h-16 text-indigo-400 relative z-10" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              KIE AI API Key pre hlasový prejav
            </h3>
            <p className="text-sm text-muted-foreground">
              Generujte hlasový prejav pomocou KIE AI TTS modelov s vašim vlastným API kľúčom.
            </p>
          </div>

          {/* Info Box */}
          <div className="glass rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Získajte API kľúč:</span>
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Choďte na <span className="text-indigo-400">kie.ai</span></li>
              <li>Vytvorte bezplatný účet alebo sa prihláste</li>
              <li>Skopírujte váš API kľúč z dashboardu</li>
            </ol>
            <p className="text-xs text-amber-400 mt-2">
              ⚠️ Uistite sa, že váš KIE AI účet má dostatok kreditov pred generovaním
            </p>
            <p className="text-xs text-blue-400 mt-1">
              💡 Overte si, či má váš účet prístup k vybranému TTS modelu.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Model Selector */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-xs">
                Vyberte TTS model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="glass border-white/10 focus:border-indigo-500/50">
                  <SelectValue placeholder="Vyberte model" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10 max-h-80 overflow-y-auto">
                  {AFFORDABLE_KIE_TTS_MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <SelectItem key={model.id} value={model.id} className="cursor-pointer">
                        <div className="flex flex-col gap-0.5 py-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium text-foreground">{model.name}</span>
                            {model.recommended && (
                              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Odporúčané</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{model.credits} kreditov/1000 znakov</span>
                            <span>•</span>
                            <span>${model.cost.toFixed(2)} za 1000 znakov</span>
                          </div>
                          {model.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Najlacnejšie TTS modely pre generovanie hlasového prejavu. <span className="text-green-400 font-semibold">ElevenLabs TTS Turbo je najlacnejší!</span>
              </p>
            </div>

            {/* Voice Assignments */}
            {characters.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs">
                  Priradiť hlasy postavám
                </Label>
                <div className="glass rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {characters.map((character) => (
                    <div key={character.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground font-medium truncate flex-1">
                        {character.name}
                      </span>
                      <Select
                        value={voiceAssignments[character.id]}
                        onValueChange={(voiceId) =>
                          setVoiceAssignments(prev => ({ ...prev, [character.id]: voiceId }))
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-48 h-8 text-xs glass border-white/10">
                          <SelectValue placeholder="Vyberte hlas" />
                        </SelectTrigger>
                        <SelectContent className="glass-strong border-white/10 max-h-60">
                          {KIE_VOICES.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id} className="cursor-pointer">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">{voice.name}</span>
                                <span className="text-[10px] text-muted-foreground">{voice.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-blue-400">💡</span> Vyberte hlas pre každú postavu. KIE AI podporuje ElevenLabs hlasy.
                </p>
              </div>
            )}

            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-xs">
                KIE AI API Key
              </Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Váš KIE AI API kľúč"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 glass border-white/10 focus:border-indigo-500/50"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 border-white/10"
              >
                Zrušiť
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !apiKey.trim()}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ukladám...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Uložiť a Generovať
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Info about credits */}
          <div className="glass rounded-lg p-3 border border-indigo-500/20">
            <p className="text-xs text-muted-foreground text-center">
              <Mic className="w-3 h-3 inline mr-1 text-indigo-400" />
              Hlasový prejav sa vygeneruje pomocou kreditov vášho KIE AI účtu
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
