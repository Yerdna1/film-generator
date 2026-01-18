'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Image as ImageIcon, Video, Mic, Music } from 'lucide-react';
import type { UnifiedModelConfig } from '@/types/project';
import { useApiKeys } from '@/hooks/use-api-keys';
import { toast } from 'sonner';
import { DEFAULT_CONFIG, KiaApiKeySection } from '../model-config';
import { LLMTab, ImageTab, VideoTab, VoiceTab, MusicTab } from './tabs';
import type { ModelConfigurationPanelProps } from './types';

export function ModelConfigurationPanel({
  modelConfig,
  onConfigChange,
  disabled = false,
  isFreeUser = false
}: ModelConfigurationPanelProps) {
  const t = useTranslations();
  const { data: apiKeysData, mutate } = useApiKeys();

  // Initialize config with proper providers for free users
  const getInitialConfig = () => {
    const baseConfig = modelConfig || DEFAULT_CONFIG;
    if (isFreeUser) {
      return {
        ...baseConfig,
        image: { ...baseConfig.image, provider: 'kie' as const },
        video: { ...baseConfig.video, provider: 'kie' as const },
        tts: { ...baseConfig.tts, provider: 'kie' as const },
        music: { ...baseConfig.music, provider: 'kie' as const },
      };
    }
    return baseConfig;
  };

  const [config, setConfig] = useState<UnifiedModelConfig>(getInitialConfig);

  // Update config when isFreeUser status changes
  useEffect(() => {
    if (isFreeUser) {
      const updatedConfig = {
        ...config,
        image: { ...config.image, provider: 'kie' as const },
        video: { ...config.video, provider: 'kie' as const },
        tts: { ...config.tts, provider: 'kie' as const },
        music: { ...config.music, provider: 'kie' as const },
      };
      setConfig(updatedConfig);
      onConfigChange(updatedConfig);
    }
  }, [isFreeUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateConfig = (updates: Partial<UnifiedModelConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSaveApiKey = async (keyName: string, value: string) => {
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [keyName]: value }),
      });

      if (!response.ok) throw new Error('Failed to save API key');

      toast.success(t('step1.modelConfiguration.keySaved'));
      mutate();
    } catch (error) {
      toast.error(t('step1.modelConfiguration.keySaveFailed'));
      console.error(error);
    }
  };

  const tabProps = {
    config,
    apiKeysData,
    disabled,
    onUpdateConfig: updateConfig,
    onSaveApiKey: handleSaveApiKey,
  };

  return (
    <Card className="mb-6">

      <CardContent>
        {/* Kia API Key Section */}
        <KiaApiKeySection apiKeysData={apiKeysData} onSaveApiKey={handleSaveApiKey} />

        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="llm" className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">{t('step1.modelConfiguration.tabs.llm')}</span>
              <span className="sm:hidden">LLM</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" />
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

          <LLMTab {...tabProps} />
          <ImageTab {...tabProps} isFreeUser={isFreeUser} />
          <VideoTab {...tabProps} isFreeUser={isFreeUser} />
          <VoiceTab {...tabProps} isFreeUser={isFreeUser} />
          <MusicTab {...tabProps} isFreeUser={isFreeUser} />
        </Tabs>
      </CardContent>
    </Card>
  );
}