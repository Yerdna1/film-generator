'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, Loader2 } from 'lucide-react';
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

// List of FREE OpenRouter models (updated January 2026)
const FREE_OPENROUTER_MODELS = [
  { id: 'xiaomi/mimo-v2-flash:free', name: 'Xiaomi Mimo V2 Flash', description: 'Top ranked, 256K context' },
  { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', description: 'Latest Google model' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', description: 'Popular open source' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1', description: 'Strong reasoning' },
  { id: 'mistralai/devstral-2-2512:free', name: 'Mistral Devstral 2', description: 'High quality' },
  { id: 'tng/deepseek-r1t2-chimera:free', name: 'DeepSeek R1T2 Chimera', description: 'Fast variant' },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B', description: 'Fast and efficient' },
] as const;

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => Promise<void>;
  isLoading?: boolean;
}

export function ApiKeyModal({ isOpen, onClose, onSave, isLoading = false }: ApiKeyModalProps) {
  const t = useTranslations();
  const tModal = useTranslations('apiModals.openRouter');
  const tError = useTranslations('error');
  const tCommon = useTranslations('common');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(FREE_OPENROUTER_MODELS[0].id);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError(tError('apiKeyRequired'));
      return;
    }

    if (!apiKey.startsWith('sk-or-v1-')) {
      setError(tError('invalidOpenRouterKeyFormat'));
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
              <li>{tModal('step1')} <span className="text-cyan-400">openrouter.ai/keys</span></li>
              <li>{tModal('step2')}</li>
              <li>{tModal('step3')}</li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Model Selector */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-xs">
                {tModal('selectFreeModel')}
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="glass border-white/10 focus:border-purple-500/50">
                  <SelectValue placeholder={tModal('selectModelPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  {FREE_OPENROUTER_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="cursor-pointer">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {tModal('freeModelsNote')}
              </p>
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
        </div>
      </motion.div>
    </div>
  );
}
