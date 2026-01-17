'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, Loader2, FileText } from 'lucide-react';
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

// OpenRouter Model Configurations
// Credit System: 1 credit = $0.005 USD
// Scene generation costs vary by model

interface OpenRouterModelConfig {
  id: string;
  name: string;
  description?: string;
  costPerScene: number;  // App credits per scene (1 credit = $0.005 USD)
  usdCost: number;       // Actual USD cost per scene
  recommended?: boolean;
  features?: string[];
}

// Affordable OpenRouter models for free users (sorted by price)
const OPENROUTER_MODELS: OpenRouterModelConfig[] = [
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fastest and most affordable Claude model',
    costPerScene: 1,      // ~$0.002 per scene
    usdCost: 0.002,
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    description: 'Google\'s fast and capable model',
    costPerScene: 2,      // ~$0.005 per scene
    usdCost: 0.005,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Best balance of quality and speed',
    costPerScene: 4,      // ~$0.01 per scene
    usdCost: 0.01,
    recommended: true,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI\'s latest flagship model',
    costPerScene: 4,      // ~$0.01 per scene
    usdCost: 0.01,
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Highest quality Claude model',
    costPerScene: 6,      // ~$0.015 per scene
    usdCost: 0.015,
  },
];

interface OpenRouterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => Promise<void>;
  isLoading?: boolean;
  sceneCount: number;
  creditsNeeded?: number;
}

export function OpenRouterModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  sceneCount,
  creditsNeeded,
}: OpenRouterModalProps) {
  const t = useTranslations();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(OPENROUTER_MODELS[2].id); // Default to Claude 3.5 Sonnet (recommended)
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const selectedModelConfig = OPENROUTER_MODELS.find(m => m.id === selectedModel);
  const totalCost = selectedModelConfig ? selectedModelConfig.costPerScene * sceneCount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    // Basic OpenRouter key format validation (starts with sk-or-v1)
    if (!apiKey.startsWith('sk-or-v1-')) {
      setError('Invalid OpenRouter API key format. Should start with sk-or-v1-');
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
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
              <FileText className="w-16 h-16 text-blue-400 relative z-10" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              Vygenerujte scény s vlastným kľúčom
            </h3>
            <p className="text-sm text-muted-foreground">
              Generovanie {sceneCount} scén pomocou vášho OpenRouter API kľúča.
            </p>
            {creditsNeeded && (
              <p className="text-xs text-amber-400">
                Alebo použite {creditsNeeded} kreditov z aplikácie
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="glass rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Získajte API kľúč:</span>
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Choďte na <span className="text-blue-400">openrouter.ai</span></li>
              <li>Vytvorte bezplatný účet alebo sa prihláste</li>
              <li>Skopírujte váš API kľúč z dashboardu</li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Model Selector */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-xs">
                Select Model for Scene Generation
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="glass border-white/10 focus:border-blue-500/50">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10 max-h-80 overflow-y-auto">
                  {OPENROUTER_MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <SelectItem key={model.id} value={model.id} className="cursor-pointer">
                        <div className="flex flex-col gap-0.5 py-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium text-foreground">{model.name}</span>
                            {model.recommended && (
                              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Best</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{model.costPerScene} credits/scene</span>
                            <span>•</span>
                            <span>${model.usdCost.toFixed(3)}/scene</span>
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
                Total cost: <span className="text-blue-400 font-semibold">{totalCost} credits ({sceneCount} scenes)</span>
              </p>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-xs">
                OpenRouter API Key
              </Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 glass border-white/10 focus:border-blue-500/50"
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
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
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
          <div className="glass rounded-lg p-3 border border-blue-500/20">
            <p className="text-xs text-muted-foreground text-center">
              <FileText className="w-3 h-3 inline mr-1 text-blue-400" />
              Scény sa vygenerujú pomocou vášho OpenRouter kreditu
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
