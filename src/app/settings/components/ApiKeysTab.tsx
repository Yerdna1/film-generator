'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Key, Cpu, Check, Sparkles, Mic, ImageIcon, Video, Music, Server, ExternalLink, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiProviderCard } from './ApiProviderCard';
import {
  apiProviders,
  llmProviderOptions,
  openRouterModels,
  DEFAULT_OPENROUTER_MODEL,
  ttsProviderOptions,
  imageProviderOptions,
  videoProviderOptions,
  musicProviderOptions,
  modalEndpoints as modalEndpointConfigs,
} from '../constants';
import type { LLMProvider, MusicProvider, TTSProvider, ImageProvider, VideoProvider, ModalEndpoints, ApiConfig } from '@/types/project';

interface ApiKeysTabProps {
  showKeys: Record<string, boolean>;
  savedKeys: Record<string, boolean>;
  localConfig: Record<string, string | undefined>;
  apiConfig: ApiConfig;
  llmProvider: LLMProvider;
  openRouterModel: string;
  musicProvider: MusicProvider;
  ttsProvider: TTSProvider;
  imageProvider: ImageProvider;
  videoProvider: VideoProvider;
  modalEndpoints: ModalEndpoints;
  onToggleVisibility: (key: string) => void;
  onSaveKey: (key: string) => void;
  onUpdateConfig: (key: string, value: string) => void;
  onLLMProviderChange: (provider: LLMProvider) => void;
  onOpenRouterModelChange: (model: string) => void;
  onMusicProviderChange: (provider: MusicProvider) => void;
  onTTSProviderChange: (provider: TTSProvider) => void;
  onImageProviderChange: (provider: ImageProvider) => void;
  onVideoProviderChange: (provider: VideoProvider) => void;
  onModalEndpointChange: (key: keyof ModalEndpoints, value: string) => void;
  onSaveModalEndpoints: () => void;
}

export function ApiKeysTab({
  showKeys,
  savedKeys,
  localConfig,
  apiConfig,
  llmProvider,
  openRouterModel,
  musicProvider,
  ttsProvider,
  imageProvider,
  videoProvider,
  modalEndpoints,
  onToggleVisibility,
  onSaveKey,
  onUpdateConfig,
  onLLMProviderChange,
  onOpenRouterModelChange,
  onMusicProviderChange,
  onTTSProviderChange,
  onImageProviderChange,
  onVideoProviderChange,
  onModalEndpointChange,
  onSaveModalEndpoints,
}: ApiKeysTabProps) {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');

  // Check if any Modal provider is selected
  const isModalUsed = llmProvider === 'modal' || ttsProvider === 'modal' ||
    imageProvider === 'modal' || videoProvider === 'modal' || musicProvider === 'modal';

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

          {/* OpenRouter Model Selection */}
          {llmProvider === 'openrouter' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium">{tPage('selectModel') || 'Select Model'}</span>
              </div>
              <Select
                value={openRouterModel || DEFAULT_OPENROUTER_MODEL}
                onValueChange={onOpenRouterModelChange}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {openRouterModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        {model.recommended && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400">
                            {tPage('recommended') || 'Recommended'}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Selected model details */}
              {openRouterModel && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {(() => {
                    const selectedModel = openRouterModels.find(m => m.id === openRouterModel);
                    if (!selectedModel) return null;
                    return (
                      <div className="space-y-1">
                        <p>{selectedModel.description}</p>
                        <div className="flex gap-4 text-[10px]">
                          <span>Context: {(selectedModel.contextLength / 1000).toFixed(0)}K tokens</span>
                          <span>Pricing: {selectedModel.pricing}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* TTS Provider Selection */}
      <Card className="glass border-white/10 border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-violet-400" />
            {tPage('ttsProvider') || 'TTS Provider for Voiceovers'}
          </CardTitle>
          <CardDescription>
            {tPage('ttsProviderDescription') || 'Choose which text-to-speech provider to use for generating voiceovers.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ttsProviderOptions.map((option) => (
            <motion.div
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onTTSProviderChange(option.id)}
              className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                ttsProvider === option.id
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{option.name}</span>
                    {ttsProvider === option.id && <Check className="w-4 h-4 text-violet-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  ttsProvider === option.id ? 'border-violet-500 bg-violet-500' : 'border-white/30'
                }`} />
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Image Provider Selection */}
      <Card className="glass border-white/10 border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            {tPage('imageProvider') || 'Image Provider'}
          </CardTitle>
          <CardDescription>
            {tPage('imageProviderDescription') || 'Choose which provider to use for generating images.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {imageProviderOptions.map((option) => (
            <motion.div
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onImageProviderChange(option.id)}
              className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                imageProvider === option.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{option.name}</span>
                    {imageProvider === option.id && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  imageProvider === option.id ? 'border-blue-500 bg-blue-500' : 'border-white/30'
                }`} />
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Video Provider Selection */}
      <Card className="glass border-white/10 border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-orange-400" />
            {tPage('videoProvider') || 'Video Provider'}
          </CardTitle>
          <CardDescription>
            {tPage('videoProviderDescription') || 'Choose which provider to use for generating videos from images.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {videoProviderOptions.map((option) => (
            <motion.div
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onVideoProviderChange(option.id)}
              className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                videoProvider === option.id
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{option.name}</span>
                    {videoProvider === option.id && <Check className="w-4 h-4 text-orange-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  videoProvider === option.id ? 'border-orange-500 bg-orange-500' : 'border-white/30'
                }`} />
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Music Provider Selection */}
      <Card className="glass border-white/10 border-l-4 border-l-pink-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-pink-400" />
            {tPage('musicProvider') || 'Music Provider'}
          </CardTitle>
          <CardDescription>
            {tPage('musicProviderDescription') || 'Choose which provider to use for generating background music.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {musicProviderOptions.map((option) => (
            <motion.div
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onMusicProviderChange(option.id)}
              className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                musicProvider === option.id
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{option.name}</span>
                    {musicProvider === option.id && <Check className="w-4 h-4 text-pink-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  musicProvider === option.id ? 'border-pink-500 bg-pink-500' : 'border-white/30'
                }`} />
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Modal.com Endpoints - Always show so users can configure endpoints */}
      <Card className="glass border-white/10 border-l-4 border-l-cyan-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              {tPage('modalEndpoints') || 'Modal.com Self-Hosted Endpoints'}
            </CardTitle>
            <CardDescription>
              {tPage('modalEndpointsDescription') || 'Configure your Modal.com endpoints for self-hosted models. Deploy models to Modal and enter the endpoint URLs below.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {modalEndpointConfigs.map((endpoint) => {
              // Map endpoint id to the correct key in ModalEndpoints
              const endpointKeyMap: Record<string, keyof ModalEndpoints> = {
                'modalLlmEndpoint': 'llmEndpoint',
                'modalTtsEndpoint': 'ttsEndpoint',
                'modalImageEndpoint': 'imageEndpoint',
                'modalVideoEndpoint': 'videoEndpoint',
                'modalMusicEndpoint': 'musicEndpoint',
              };
              const endpointKey = endpointKeyMap[endpoint.id];

              return (
                <div key={endpoint.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white">
                      {endpoint.name}
                    </label>
                    <a
                      href={endpoint.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      Docs <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">{endpoint.description}</p>
                  <Input
                    type="url"
                    placeholder={endpoint.placeholder}
                    value={modalEndpoints[endpointKey] || ''}
                    onChange={(e) => onModalEndpointChange(endpointKey, e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              );
            })}
            <Button
              onClick={onSaveModalEndpoints}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {tPage('saveModalEndpoints') || 'Save Modal Endpoints'}
            </Button>
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
