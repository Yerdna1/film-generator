'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, Loader2, Image } from 'lucide-react';
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
import { KIE_IMAGE_MODELS, type KieModelConfig } from '@/lib/constants/kie-models';

// Affordable models for free users (sorted by price)
const AFFORDABLE_KIE_MODELS: KieModelConfig[] = [
  KIE_IMAGE_MODELS.find(m => m.id === 'grok-imagine/text-to-image')!, // 4 credits - cheapest!
  KIE_IMAGE_MODELS.find(m => m.id === 'seedream/3-0-text-to-image')!, // 15 credits
  KIE_IMAGE_MODELS.find(m => m.id === 'google-nano-banana-pro')!, // 18 credits - recommended
  KIE_IMAGE_MODELS.find(m => m.id === 'seedream/4-0-text-to-image')!, // 18 credits
  KIE_IMAGE_MODELS.find(m => m.id === 'seedream/4-5-text-to-image')!, // 20 credits - recommended
  KIE_IMAGE_MODELS.find(m => m.id === 'flux-2/dev-text-to-image')!, // 20 credits
].filter(Boolean);

interface KieApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => Promise<void>;
  isLoading?: boolean;
}

export function KieApiKeyModal({ isOpen, onClose, onSave, isLoading = false }: KieApiKeyModalProps) {
  const t = useTranslations();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AFFORDABLE_KIE_MODELS[0].id);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

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
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-xl opacity-50"></div>
              <Key className="w-16 h-16 text-purple-400 relative z-10" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              KIE AI API Key Required
            </h3>
            <p className="text-sm text-muted-foreground">
              Generate character images with KIE AI models using your own API key.
            </p>
          </div>

          {/* Info Box */}
          <div className="glass rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Get your API key:</span>
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to <span className="text-cyan-400">kie.ai</span></li>
              <li>Create a free account or sign in</li>
              <li>Copy your API key from dashboard</li>
            </ol>
            <p className="text-xs text-amber-400 mt-2">
              ⚠️ Make sure your KIE AI account has credits before generating
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Model Selector */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-xs">
                Select Image Model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="glass border-white/10 focus:border-purple-500/50">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10 max-h-80 overflow-y-auto">
                  {AFFORDABLE_KIE_MODELS.map((model) => {
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
                            <span>{model.credits} credits</span>
                            <span>•</span>
                            <span>${model.cost.toFixed(2)} per image</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Most affordable models for character generation. <span className="text-green-400 font-semibold">Grok Imagine is cheapest!</span>
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
                  placeholder="Your KIE AI API key"
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !apiKey.trim()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Save & Generate
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Info about credits */}
          <div className="glass rounded-lg p-3 border border-cyan-500/20">
            <p className="text-xs text-muted-foreground text-center">
              <Image className="w-3 h-3 inline mr-1 text-cyan-400" />
              Images will use your KIE AI credits
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
