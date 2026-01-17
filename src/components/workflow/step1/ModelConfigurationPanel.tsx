'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Info, Sparkles, Image, Video, Mic, Music } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { UnifiedModelConfig, ApiConfig, LLMProvider, ImageProvider, VideoProvider, TTSProvider, MusicProvider, AspectRatio, ImageResolution, Resolution } from '@/types/project';
import { useApiKeys } from '@/hooks/use-api-keys';

interface ModelConfigurationPanelProps {
  modelConfig?: UnifiedModelConfig;
  onConfigChange: (config: UnifiedModelConfig) => void;
  disabled?: boolean;
}

// Default configurations
const DEFAULT_CONFIG: UnifiedModelConfig = {
  llm: {
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash-exp:free',
  },
  image: {
    provider: 'gemini',
    characterAspectRatio: '1:1',
    sceneAspectRatio: '16:9',
    sceneResolution: '2k',
  },
  video: {
    provider: 'kie',
    resolution: 'hd',
  },
  tts: {
    provider: 'gemini-tts',
    defaultLanguage: 'en',
  },
  music: {
    provider: 'piapi',
  },
};

// Available models
const LLM_MODELS = {
  openrouter: [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', badge: 'FREE' },
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', badge: 'PREMIUM' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', badge: 'PREMIUM' },
    { id: 'google/gemini-3-pro', name: 'Gemini 3 Pro', badge: 'PREMIUM' },
  ],
  'claude-sdk': [
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', badge: 'LOCAL' },
  ],
  modal: [
    { id: 'custom', name: 'Custom Modal Endpoint', badge: 'SELF-HOSTED' },
  ],
  gemini: [
    { id: 'gemini-pro', name: 'Gemini Pro', badge: 'FREE' },
  ],
};

const IMAGE_MODELS = {
  gemini: [
    { id: 'imagen-3', name: 'Imagen 3', badge: 'FREE' },
  ],
  modal: [
    { id: 'qwen-vl', name: 'Qwen-VL', badge: 'SELF-HOSTED' },
  ],
  kie: [
    { id: 'seedream/4-5-text-to-image', name: 'SeeDream 4.5', badge: 'PREMIUM' },
    { id: 'google-nano-banana-pro-4k', name: 'Nano Banana Pro 4K', badge: 'PREMIUM' },
  ],
};

const VIDEO_MODELS = {
  kie: [
    { id: 'grok-imagine/image-to-video', name: 'Grok Imagine', badge: 'DEFAULT' },
    { id: 'sora2/10s-image-to-video', name: 'Sora 2 (10s)', badge: 'PREMIUM' },
  ],
  modal: [
    { id: 'custom', name: 'Custom Modal Endpoint', badge: 'SELF-HOSTED' },
  ],
};

const TTS_MODELS = {
  'gemini-tts': [
    { id: 'gemini-tts-default', name: 'Gemini TTS', badge: 'FREE' },
  ],
  elevenlabs: [
    { id: 'eleven_multilingual_v2', name: 'ElevenLabs Multilingual V2', badge: 'PREMIUM' },
  ],
  'openai-tts': [
    { id: 'tts-1', name: 'OpenAI TTS-1', badge: 'STANDARD' },
    { id: 'tts-1-hd', name: 'OpenAI TTS-1 HD', badge: 'HD' },
  ],
  kie: [
    { id: 'elevenlabs/text-to-dialogue-v3', name: 'Text to Dialogue V3', badge: 'PREMIUM' },
  ],
  modal: [
    { id: 'custom', name: 'Custom Modal Endpoint', badge: 'SELF-HOSTED' },
  ],
};

const MUSIC_MODELS = {
  piapi: [
    { id: 'suno-v3.5', name: 'Suno V3.5', badge: 'DEFAULT' },
  ],
  suno: [
    { id: 'chirp-v3-5', name: 'Chirp V3.5', badge: 'DIRECT' },
  ],
  kie: [
    { id: 'suno/v3-5-music', name: 'Suno V3.5 Music', badge: 'KIE' },
  ],
  modal: [
    { id: 'custom', name: 'Custom Modal Endpoint', badge: 'SELF-HOSTED' },
  ],
};

export function ModelConfigurationPanel({ modelConfig, onConfigChange, disabled = false }: ModelConfigurationPanelProps) {
  const t = useTranslations();
  const { data: apiKeysData, isLoading } = useApiKeys();
  const [config, setConfig] = useState<UnifiedModelConfig>(modelConfig || DEFAULT_CONFIG);

  const updateConfig = (updates: Partial<UnifiedModelConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const updateLLM = (updates: Partial<UnifiedModelConfig['llm']>) => {
    updateConfig({
      llm: { ...config.llm, ...updates },
    });
  };

  const updateImage = (updates: Partial<UnifiedModelConfig['image']>) => {
    updateConfig({
      image: { ...config.image, ...updates },
    });
  };

  const updateVideo = (updates: Partial<UnifiedModelConfig['video']>) => {
    updateConfig({
      video: { ...config.video, ...updates },
    });
  };

  const updateTTS = (updates: Partial<UnifiedModelConfig['tts']>) => {
    updateConfig({
      tts: { ...config.tts, ...updates },
    });
  };

  const updateMusic = (updates: Partial<UnifiedModelConfig['music']>) => {
    updateConfig({
      music: { ...config.music, ...updates },
    });
  };

  const getProviderBadge = (provider: string, hasKey: boolean) => {
    if (!hasKey && provider !== 'gemini' && provider !== 'gemini-tts') {
      return <Badge variant="outline" className="ml-2 text-xs">API Key Required</Badge>;
    }
    return null;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t('step1.modelConfiguration.title')}
        </CardTitle>
        <CardDescription>
          {t('step1.modelConfiguration.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="llm" className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">{t('step1.modelConfiguration.tabs.llm')}</span>
              <span className="sm:hidden">LLM</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-1.5">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">{t('step1.modelConfiguration.tabs.image')}</span>
              <span className="sm:hidden">Image</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-1.5">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">{t('step1.modelConfiguration.tabs.video')}</span>
              <span className="sm:hidden">Video</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-1.5">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">{t('step1.modelConfiguration.tabs.voice')}</span>
              <span className="sm:hidden">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="music" className="flex items-center gap-1.5">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">{t('step1.modelConfiguration.tabs.music')}</span>
              <span className="sm:hidden">Music</span>
            </TabsTrigger>
          </TabsList>

          {/* LLM Configuration */}
          <TabsContent value="llm" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>{t('step1.modelConfiguration.llm.provider')}</Label>
                <Select
                  value={config.llm.provider}
                  onValueChange={(value: LLMProvider) => updateLLM({ provider: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">
                      OpenRouter
                      {getProviderBadge('openrouter', !!apiKeysData?.hasOpenRouterKey)}
                    </SelectItem>
                    <SelectItem value="gemini">Gemini (Free)</SelectItem>
                    <SelectItem value="claude-sdk">Claude SDK</SelectItem>
                    <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('step1.modelConfiguration.llm.model')}</Label>
                <Select
                  value={config.llm.model}
                  onValueChange={(value: string) => updateLLM({ model: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_MODELS[config.llm.provider as keyof typeof LLM_MODELS]?.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{model.name}</span>
                          <Badge variant={model.badge === 'FREE' ? 'secondary' : 'default'} className="ml-2">
                            {model.badge}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Image Configuration */}
          <TabsContent value="image" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>{t('step1.modelConfiguration.image.provider')}</Label>
                <Select
                  value={config.image.provider}
                  onValueChange={(value: ImageProvider) => updateImage({ provider: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini (Free)</SelectItem>
                    <SelectItem value="kie">
                      KIE AI
                      {getProviderBadge('kie', !!apiKeysData?.hasKieKey)}
                    </SelectItem>
                    <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
                    <SelectItem value="modal-edit">Modal Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.image.provider === 'kie' && (
                <div>
                  <Label>{t('step1.modelConfiguration.image.model')}</Label>
                  <Select
                    value={config.image.model || IMAGE_MODELS.kie[0].id}
                    onValueChange={(value: string) => updateImage({ model: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_MODELS.kie.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <Badge className="ml-2">{model.badge}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('step1.modelConfiguration.image.characterAspectRatio')}</Label>
                  <Select
                    value={config.image.characterAspectRatio}
                    onValueChange={(value: AspectRatio) => updateImage({ characterAspectRatio: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      <SelectItem value="16:9">16:9 (Wide)</SelectItem>
                      <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                      <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                      <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                      <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('step1.modelConfiguration.image.sceneAspectRatio')}</Label>
                  <Select
                    value={config.image.sceneAspectRatio}
                    onValueChange={(value: AspectRatio) => updateImage({ sceneAspectRatio: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Wide)</SelectItem>
                      <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                      <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                      <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t('step1.modelConfiguration.image.sceneResolution')}</Label>
                <Select
                  value={config.image.sceneResolution}
                  onValueChange={(value: ImageResolution) => updateImage({ sceneResolution: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1k">1K ($0.134)</SelectItem>
                    <SelectItem value="2k">2K ($0.134)</SelectItem>
                    <SelectItem value="4k">4K ($0.24)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Video Configuration */}
          <TabsContent value="video" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>{t('step1.modelConfiguration.video.provider')}</Label>
                <Select
                  value={config.video.provider}
                  onValueChange={(value: VideoProvider) => updateVideo({ provider: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kie">
                      KIE AI
                      {getProviderBadge('kie', !!apiKeysData?.hasKieKey)}
                    </SelectItem>
                    <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.video.provider === 'kie' && (
                <div>
                  <Label>{t('step1.modelConfiguration.video.model')}</Label>
                  <Select
                    value={config.video.model || VIDEO_MODELS.kie[0].id}
                    onValueChange={(value: string) => updateVideo({ model: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_MODELS.kie.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <Badge className="ml-2">{model.badge}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>{t('step1.modelConfiguration.video.resolution')}</Label>
                <Select
                  value={config.video.resolution}
                  onValueChange={(value: Resolution) => updateVideo({ resolution: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hd">HD (720p)</SelectItem>
                    <SelectItem value="4k">4K (2160p)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Voice Configuration */}
          <TabsContent value="voice" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>{t('step1.modelConfiguration.voice.provider')}</Label>
                <Select
                  value={config.tts.provider}
                  onValueChange={(value: TTSProvider) => updateTTS({ provider: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-tts">Gemini TTS (Free)</SelectItem>
                    <SelectItem value="elevenlabs">
                      ElevenLabs
                      {getProviderBadge('elevenlabs', !!apiKeysData?.hasElevenLabsKey)}
                    </SelectItem>
                    <SelectItem value="openai-tts">
                      OpenAI TTS
                      {getProviderBadge('openai', !!apiKeysData?.hasOpenAIKey)}
                    </SelectItem>
                    <SelectItem value="kie">
                      KIE AI
                      {getProviderBadge('kie', !!apiKeysData?.hasKieKey)}
                    </SelectItem>
                    <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.tts.provider === 'kie' && (
                <div>
                  <Label>{t('step1.modelConfiguration.voice.model')}</Label>
                  <Select
                    value={config.tts.model || TTS_MODELS.kie[0].id}
                    onValueChange={(value: string) => updateTTS({ model: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTS_MODELS.kie.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <Badge className="ml-2">{model.badge}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>{t('step1.modelConfiguration.voice.defaultLanguage')}</Label>
                <Select
                  value={config.tts.defaultLanguage || 'en'}
                  onValueChange={(value) => updateTTS({ defaultLanguage: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sk">Slovak</SelectItem>
                    <SelectItem value="cs">Czech</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ru">Russian</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Music Configuration */}
          <TabsContent value="music" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>{t('step1.modelConfiguration.music.provider')}</Label>
                <Select
                  value={config.music.provider}
                  onValueChange={(value: MusicProvider) => updateMusic({ provider: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piapi">
                      PiAPI
                      {getProviderBadge('piapi', !!apiKeysData?.hasPiapiKey)}
                    </SelectItem>
                    <SelectItem value="suno">
                      Suno
                      {getProviderBadge('suno', !!apiKeysData?.hasSunoKey)}
                    </SelectItem>
                    <SelectItem value="kie">
                      KIE AI
                      {getProviderBadge('kie', !!apiKeysData?.hasKieKey)}
                    </SelectItem>
                    <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.music.provider === 'kie' && (
                <div>
                  <Label>{t('step1.modelConfiguration.music.model')}</Label>
                  <Select
                    value={config.music.model || MUSIC_MODELS.kie[0].id}
                    onValueChange={(value: string) => updateMusic({ model: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSIC_MODELS.kie.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <Badge className="ml-2">{model.badge}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <TooltipProvider>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('step1.modelConfiguration.tooltip')}</p>
                </TooltipContent>
              </Tooltip>
              <p className="text-sm text-muted-foreground">
                {t('step1.modelConfiguration.info')}
              </p>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}