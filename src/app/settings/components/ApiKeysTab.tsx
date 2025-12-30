'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Key, Cpu, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ApiProviderCard } from './ApiProviderCard';
import { apiProviders, llmProviderOptions } from '../constants';
import type { LLMProvider, ApiConfig } from '@/types/project';

interface ApiKeysTabProps {
  showKeys: Record<string, boolean>;
  savedKeys: Record<string, boolean>;
  localConfig: Record<string, string | undefined>;
  apiConfig: ApiConfig;
  llmProvider: LLMProvider;
  onToggleVisibility: (key: string) => void;
  onSaveKey: (key: string) => void;
  onUpdateConfig: (key: string, value: string) => void;
  onLLMProviderChange: (provider: LLMProvider) => void;
}

export function ApiKeysTab({
  showKeys,
  savedKeys,
  localConfig,
  apiConfig,
  llmProvider,
  onToggleVisibility,
  onSaveKey,
  onUpdateConfig,
  onLLMProviderChange,
}: ApiKeysTabProps) {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* LLM Provider Selection */}
      <Card className="glass border-white/10 border-l-4 border-l-emerald-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            {tPage('llmProvider') || 'LLM Provider for Scene Generation'}
          </CardTitle>
          <CardDescription>
            {tPage('llmProviderDescription') || 'Choose which LLM provider to use for generating scenes. OpenRouter is recommended for Vercel deployments.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {llmProviderOptions.map((option) => (
            <motion.div
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onLLMProviderChange(option.id)}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                llmProvider === option.id
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{option.name}</span>
                    {llmProvider === option.id && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  llmProvider === option.id
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-white/30'
                }`}>
                  {llmProvider === option.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
              {option.requiresApiKey && llmProvider === option.id && !(apiConfig as Record<string, string | undefined>)[option.apiKeyField || ''] && (
                <p className="text-xs text-amber-400 mt-2">
                  {tPage('apiKeyRequired') || 'API key required - configure below'}
                </p>
              )}
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            {t('apiKeys')}
          </CardTitle>
          <CardDescription>
            {tPage('apiKeysDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {apiProviders.map((provider, index) => (
            <ApiProviderCard
              key={provider.key}
              provider={provider}
              index={index}
              showKey={showKeys[provider.key] || false}
              isSaved={savedKeys[provider.key] || false}
              value={localConfig[provider.key] || ''}
              isConfigured={!!(apiConfig as Record<string, string | undefined>)[provider.key]}
              onToggleVisibility={() => onToggleVisibility(provider.key)}
              onSave={() => onSaveKey(provider.key)}
              onChange={(value) => onUpdateConfig(provider.key, value)}
              isHighlighted={provider.isLLMProvider && llmProvider === 'openrouter' && !(apiConfig as Record<string, string | undefined>)[provider.key]}
            />
          ))}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass border-white/10 border-l-4 border-l-cyan-500">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {tPage('apiKeysNote')}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
