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
import { KIE_IMAGE_MODELS, KIE_VIDEO_MODELS, KIE_TTS_MODELS, KIE_MUSIC_MODELS, formatKiePrice } from '@/lib/constants/kie-models';
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
  kieImageModel: string;
  kieVideoModel: string;
  kieTtsModel: string;
  kieMusicModel: string;
  onToggleVisibility: (key: string) => void;
  onSaveKey: (key: string) => void;
  onUpdateConfig: (key: string, value: string) => void;
  onLLMProviderChange: (provider: LLMProvider) => void;
  onOpenRouterModelChange: (model: string) => void;
  onMusicProviderChange: (provider: MusicProvider) => void;
  onTTSProviderChange: (provider: TTSProvider) => void;
  onImageProviderChange: (provider: ImageProvider) => void;
  onVideoProviderChange: (provider: VideoProvider) => void;
  onKieImageModelChange: (model: string) => void;
  onKieVideoModelChange: (model: string) => void;
  onKieTtsModelChange: (model: string) => void;
  onKieMusicModelChange: (model: string) => void;
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
  kieImageModel,
  kieVideoModel,
  kieTtsModel,
  kieMusicModel,
  onToggleVisibility,
  onSaveKey,
  onUpdateConfig,
  onLLMProviderChange,
  onOpenRouterModelChange,
  onMusicProviderChange,
  onTTSProviderChange,
  onImageProviderChange,
  onVideoProviderChange,
  onKieImageModelChange,
  onKieVideoModelChange,
  onKieTtsModelChange,
  onKieMusicModelChange,
  onModalEndpointChange,
  onSaveModalEndpoints,
}: ApiKeysTabProps) {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');

  // Check if any Modal provider is selected OR VectCut endpoint is needed
  // VectCut is always available for video composition in Step 6
  const isModalUsed = llmProvider === 'modal' || ttsProvider === 'modal' ||
    imageProvider === 'modal' || videoProvider === 'modal' || musicProvider === 'modal';
  const showModalEndpoints = isModalUsed || true; // Always show for VectCut video composition

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Provider Selection Grid - 5 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* LLM Provider Selection */}
        <Card className="glass border-border border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="w-5 h-5 text-emerald-400" />
              {tPage('llmProvider') || 'LLM'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {llmProviderOptions.map((option) => (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onLLMProviderChange(option.id)}
                className={`relative p-2.5 rounded-lg border-2 cursor-pointer transition-all ${llmProvider === option.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-border bg-muted/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{option.name}</span>
                    {llmProvider === option.id && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className={`w-3 h-3 rounded-full border-2 ${llmProvider === option.id ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30'
                    }`} />
                </div>
              </motion.div>
            ))}

            {/* OpenRouter Model Selection */}
            {llmProvider === 'openrouter' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium">{tPage('selectModel') || 'Model'}</span>
                </div>
                <Select
                  value={openRouterModel || DEFAULT_OPENROUTER_MODEL}
                  onValueChange={onOpenRouterModelChange}
                >
                  <SelectTrigger className="w-full bg-muted/50 border-border">
                    <SelectValue placeholder={t('selectModel')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {openRouterModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <span>{model.name}</span>
                          {model.recommended && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400">
                              ★
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* TTS Provider Selection */}
        <Card className="glass border-border border-l-4 border-l-violet-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="w-5 h-5 text-violet-400" />
              {tPage('ttsProvider') || 'TTS Provider'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ttsProviderOptions.map((option) => (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onTTSProviderChange(option.id)}
                className={`relative p-2.5 rounded-lg border-2 cursor-pointer transition-all ${ttsProvider === option.id
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-border hover:border-border bg-muted/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{option.name}</span>
                    {ttsProvider === option.id && <Check className="w-4 h-4 text-violet-400" />}
                  </div>
                  <div className={`w-3 h-3 rounded-full border-2 ${ttsProvider === option.id ? 'border-violet-500 bg-violet-500' : 'border-muted-foreground/30'
                    }`} />
                </div>
              </motion.div>
            ))}

            {/* KIE TTS Model Selection */}
            {ttsProvider === 'kie' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium">{tPage('selectKieModel') || 'Select KIE Model'}</span>
                </div>
                <Select
                  value={kieTtsModel}
                  onValueChange={onKieTtsModelChange}
                >
                  <SelectTrigger className="w-full bg-muted/50 border-border">
                    <SelectValue placeholder={t('selectTtsModel')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {KIE_TTS_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-start flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              {model.recommended && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-500/20 text-violet-400">
                                  {tPage('recommended') || 'Recommended'}
                                </Badge>
                              )}
                            </div>
                            {model.description && (
                              <span className="text-[10px] text-muted-foreground mt-1">{model.description}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatKiePrice(model.credits)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Image Provider Selection */}
        <Card className="glass border-border border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              {tPage('imageProvider') || 'Image Provider'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {imageProviderOptions.map((option) => (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onImageProviderChange(option.id)}
                className={`relative p-2.5 rounded-lg border-2 cursor-pointer transition-all ${imageProvider === option.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border hover:border-border bg-muted/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{option.name}</span>
                    {imageProvider === option.id && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className={`w-3 h-3 rounded-full border-2 ${imageProvider === option.id ? 'border-blue-500 bg-blue-500' : 'border-muted-foreground/30'
                    }`} />
                </div>
              </motion.div>
            ))}

            {/* KIE Image Model Selection */}
            {imageProvider === 'kie' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{tPage('selectKieModel') || 'Select KIE Model'}</span>
                </div>
                <Select
                  value={kieImageModel}
                  onValueChange={onKieImageModelChange}
                >
                  <SelectTrigger className="w-full bg-muted/50 border-border">
                    <SelectValue placeholder={t('selectImageModel')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {KIE_IMAGE_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-start flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              {model.recommended && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400">
                                  {tPage('recommended') || 'Recommended'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {model.modality && (
                                <span className="text-[10px] text-muted-foreground">{model.modality}</span>
                              )}
                              {model.quality && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {model.quality}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatKiePrice(model.credits)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Video Provider Selection */}
        <Card className="glass border-border border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="w-5 h-5 text-orange-400" />
              {tPage('videoProvider') || 'Video Provider'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {videoProviderOptions.map((option) => (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onVideoProviderChange(option.id)}
                className={`relative p-2.5 rounded-lg border-2 cursor-pointer transition-all ${videoProvider === option.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-border hover:border-border bg-muted/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{option.name}</span>
                    {videoProvider === option.id && <Check className="w-4 h-4 text-orange-400" />}
                  </div>
                  <div className={`w-3 h-3 rounded-full border-2 ${videoProvider === option.id ? 'border-orange-500 bg-orange-500' : 'border-muted-foreground/30'
                    }`} />
                </div>
              </motion.div>
            ))}

            {/* KIE Video Model Selection */}
            {videoProvider === 'kie' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium">{tPage('selectKieModel') || 'Select KIE Model'}</span>
                </div>
                <Select
                  value={kieVideoModel}
                  onValueChange={onKieVideoModelChange}
                >
                  <SelectTrigger className="w-full bg-muted/50 border-border">
                    <SelectValue placeholder={t('selectVideoModel')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {KIE_VIDEO_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-start flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              {model.recommended && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-500/20 text-orange-400">
                                  {tPage('recommended') || 'Recommended'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {model.modality && (
                                <span className="text-[10px] text-muted-foreground">{model.modality}</span>
                              )}
                              {model.quality && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {model.quality}
                                </Badge>
                              )}
                              {model.length && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {model.length}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatKiePrice(model.credits)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Music Provider Selection */}
        <Card className="glass border-border border-l-4 border-l-pink-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Music className="w-5 h-5 text-pink-400" />
              {tPage('musicProvider') || 'Music Provider'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {musicProviderOptions.map((option) => (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onMusicProviderChange(option.id)}
                className={`relative p-2.5 rounded-lg border-2 cursor-pointer transition-all ${musicProvider === option.id
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-border hover:border-border bg-muted/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{option.name}</span>
                    {musicProvider === option.id && <Check className="w-4 h-4 text-pink-400" />}
                  </div>
                  <div className={`w-3 h-3 rounded-full border-2 ${musicProvider === option.id ? 'border-pink-500 bg-pink-500' : 'border-muted-foreground/30'
                    }`} />
                </div>
              </motion.div>
            ))}

            {/* KIE Music Model Selection */}
            {musicProvider === 'kie' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4 text-pink-400" />
                  <span className="text-sm font-medium">{tPage('selectKieModel') || 'Select KIE Model'}</span>
                </div>
                <Select
                  value={kieMusicModel}
                  onValueChange={onKieMusicModelChange}
                >
                  <SelectTrigger className="w-full bg-muted/50 border-border">
                    <SelectValue placeholder={t('selectMusicModel')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {KIE_MUSIC_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-start flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              {model.recommended && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-pink-500/20 text-pink-400">
                                  {tPage('recommended') || 'Recommended'}
                                </Badge>
                              )}
                            </div>
                            {model.description && (
                              <span className="text-[10px] text-muted-foreground mt-1">{model.description}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatKiePrice(model.credits)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal.com Endpoints - Show when Modal provider is selected or for VectCut video composition */}
      {showModalEndpoints && (
        <Card className="glass border-border border-l-4 border-l-cyan-500">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modalEndpointConfigs.map((endpoint) => {
                // Map endpoint id to the correct key in ModalEndpoints
                const endpointKeyMap: Record<string, keyof ModalEndpoints> = {
                  'modalLlmEndpoint': 'llmEndpoint',
                  'modalTtsEndpoint': 'ttsEndpoint',
                  'modalImageEndpoint': 'imageEndpoint',
                  'modalImageEditEndpoint': 'imageEditEndpoint',
                  'modalVideoEndpoint': 'videoEndpoint',
                  'modalMusicEndpoint': 'musicEndpoint',
                  'modalVectcutEndpoint': 'vectcutEndpoint',
                };
                const endpointKey = endpointKeyMap[endpoint.id];

                return (
                  <div key={endpoint.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">
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
                    <Input
                      type="url"
                      placeholder={endpoint.placeholder}
                      value={modalEndpoints[endpointKey] || ''}
                      onChange={(e) => onModalEndpointChange(endpointKey, e.target.value)}
                      className="bg-muted/50 border-border"
                    />
                  </div>
                );
              })}
            </div>
            <Button
              onClick={onSaveModalEndpoints}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {tPage('saveModalEndpoints') || 'Save Modal Endpoints'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      <Card className="glass border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            {t('apiKeys')}
          </CardTitle>
          <CardDescription>
            {tPage('apiKeysDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass border-border border-l-4 border-l-cyan-500">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {tPage('apiKeysNote')}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
