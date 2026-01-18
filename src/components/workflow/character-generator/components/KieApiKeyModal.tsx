'use client';

import { useState, useEffect } from 'react';
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
import { useImageModels, type KieImageModel } from '@/hooks/use-kie-models';

interface KieApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => Promise<void>;
  isLoading?: boolean;
}

export function KieApiKeyModal({ isOpen, onClose, onSave, isLoading = false }: KieApiKeyModalProps) {
  const t = useTranslations();
  const tModal = useTranslations('apiModals.kie');
  const tError = useTranslations('error');
  const tCommon = useTranslations('common');
  const { models: imageModels, loading: modelsLoading } = useImageModels();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  // Affordable models for free users (sorted by price) - filtered from database
  const AFFORDABLE_KIE_MODELS = imageModels
    .filter(m => m.credits <= 25) // Filter for affordable models
    .sort((a, b) => a.credits - b.credits); // Sort by price (cheapest first)

  // Set default model when models load
  useEffect(() => {
    if (AFFORDABLE_KIE_MODELS.length > 0 && !selectedModel) {
      setSelectedModel(AFFORDABLE_KIE_MODELS[0].modelId);
    }
  }, [AFFORDABLE_KIE_MODELS, selectedModel]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError(tError('apiKeyRequired'));
      return;
    }

    // Basic KIE AI key format validation (typically UUID-like)
    if (apiKey.length < 20) {
      setError(tError('invalidKieKeyFormat'));
      return;
    }

    try {
      await onSave(apiKey.trim(), selectedModel);
    } catch (err) {
      setError(err instanceof Error ? err.message : tError('saveFailed'));
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
              {tModal('title')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tModal('description')}
            </p>
          </div>

          {/* Info Box */}
          <div className="glass rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{tModal('getApiKey')}</span>
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>{tModal('step1')} <span className="text-cyan-400">kie.ai</span></li>
              <li>{tModal('step2')}</li>
              <li>{tModal('step3')}</li>
            </ol>
            <p className="text-xs text-amber-400 mt-2">
              ⚠️ {tModal('creditsWarning')}
            </p>
            <p className="text-xs text-blue-400 mt-1">
              💡 {tModal('modelAccessWarning')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Model Selector */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-xs">
                {tModal('selectModelLabel')}
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="glass border-white/10 focus:border-purple-500/50">
                  <SelectValue placeholder={tModal('selectModelPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10 max-h-80 overflow-y-auto">
                  {AFFORDABLE_KIE_MODELS.map((model) => {
                    const isSelected = selectedModel === model.modelId;
                    return (
                      <SelectItem key={model.modelId} value={model.modelId} className="cursor-pointer">
                        <div className="flex flex-col gap-0.5 py-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium text-foreground">{model.name}</span>
                            {model.credits <= 20 && (
                              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Best Value</span>
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
                {tModal('affordableModelsNote')}
              </p>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-xs">
                {tModal('apiKeyLabel')}
              </Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  placeholder={tModal('apiKeyPlaceholder')}
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
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !apiKey.trim()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {tModal('saving')}
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    {tModal('saveAndGenerate')}
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Info about credits */}
          <div className="glass rounded-lg p-3 border border-cyan-500/20">
            <p className="text-xs text-muted-foreground text-center">
              <Image className="w-3 h-3 inline mr-1 text-cyan-400" />
              {tModal('creditsNote')}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
