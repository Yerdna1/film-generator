'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, Loader2, Video } from 'lucide-react';
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
import { KIE_VIDEO_MODELS, type KieModelConfig } from '@/lib/constants/kie-models';

// Affordable KIE video models for free users (sorted by price)
const AFFORDABLE_KIE_VIDEO_MODELS: KieModelConfig[] = [
  KIE_VIDEO_MODELS.find(m => m.id === 'grok-imagine/image-to-video')!, // 40 credits - cheapest!
  KIE_VIDEO_MODELS.find(m => m.id === 'kling/v2-1-image-to-video')!, // 50 credits
  KIE_VIDEO_MODELS.find(m => m.id === 'kling/v2-2-image-to-video')!, // 55 credits
  KIE_VIDEO_MODELS.find(m => m.id === 'kling/v2-3-image-to-video')!, // 60 credits
  KIE_VIDEO_MODELS.find(m => m.id === 'kling/v2-4-image-to-video')!, // 65 credits
  KIE_VIDEO_MODELS.find(m => m.id === 'hailuo/ai-image-to-video')!, // 60 credits
].filter(Boolean);

interface KieVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => Promise<void>;
  isLoading?: boolean;
}

export function KieVideoModal({ isOpen, onClose, onSave, isLoading = false }: KieVideoModalProps) {
  const t = useTranslations();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AFFORDABLE_KIE_VIDEO_MODELS[0].id); // Default to Grok Imagine (cheapest)
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const selectedModelConfig = AFFORDABLE_KIE_VIDEO_MODELS.find(m => m.id === selectedModel);

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
      await onSave(apiKey.trim(), selectedModel);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-8 max-w-md mx-4 border border-white/10 w-full"
      >
        <div className="space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50"></div>
              <Video className="w-16 h-16 text-purple-400 relative z-10" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              KIE AI API Key pre videá
            </h3>
            <p className="text-sm text-muted-foreground">
              Generujte videá pomocou KIE AI modelov s vašim vlastným API kľúčom.
            </p>
          </div>

          {/* Info Box */}
          <div className="glass rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Získajte API kľúč:</span>
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Choďte na <span className="text-pink-400">kie.ai</span></li>
              <li>Vytvorte bezplatný účet alebo sa prihláste</li>
              <li>Skopírujte váš API kľúč z dashboardu</li>
            </ol>
            <p className="text-xs text-amber-400 mt-2">
              ⚠️ Uistite sa, že váš KIE AI účet má dostatok kreditov pred generovaním
            </p>
            <p className="text-xs text-blue-400 mt-1">
              💡 Overte si, či má váš účet prístup k vybranému modelu videa.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Model Selector */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-xs">
                Vyberte video model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="glass border-white/10 focus:border-purple-500/50">
                  <SelectValue placeholder="Vyberte model" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10 max-h-80 overflow-y-auto">
                  {AFFORDABLE_KIE_VIDEO_MODELS.map((model) => {
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
                            <span>{model.credits} kreditov/video</span>
                            <span>•</span>
                            <span>${model.cost.toFixed(2)} za video</span>
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
                Najlacnejšie modely pre generovanie videí. <span className="text-green-400 font-semibold">Grok Imagine je najlacnejší!</span>
              </p>
            </div>

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
                  className="pr-10 glass border-white/10 focus:border-purple-500/50"
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
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0"
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
          <div className="glass rounded-lg p-3 border border-pink-500/20">
            <p className="text-xs text-muted-foreground text-center">
              <Video className="w-3 h-3 inline mr-1 text-pink-400" />
              Videá sa vygenerujú pomocou kreditov vášho KIE AI účtu
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
