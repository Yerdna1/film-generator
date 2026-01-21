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
  isFreeUser = false,
  isInModal = false
}: ModelConfigurationPanelProps) {
  const t = useTranslations();
  const { data: apiKeysData, mutate } = useApiKeys();

  // Initialize config - all users can now select any provider
  const getInitialConfig = () => {
    return modelConfig || DEFAULT_CONFIG;
  };

  const [config, setConfig] = useState<UnifiedModelConfig>(getInitialConfig);

  // Sync local state with prop changes (e.g., when modal opens with different project config)
  useEffect(() => {
    if (modelConfig) {
      setConfig(modelConfig);
    }
  }, [modelConfig]);

  // Config updates are handled by user selection
  // All users can select any provider now

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
    isFreeUser,
  };

  const content = (
    <>
      {/* Only show API key section for free users */}
      {isFreeUser && !isInModal && (
        <KiaApiKeySection apiKeysData={apiKeysData} onSaveApiKey={handleSaveApiKey} />
      )}

      {/* For premium/admin users, show a notice - but not in modal */}
      {!isFreeUser && !isInModal && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-lg border border-purple-500/20">
          <p className="text-sm text-muted-foreground">
            {t('step1.modelConfiguration.premiumNotice')}
          </p>
        </div>
      )}

      <Tabs defaultValue="llm" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6 h-14">
          <TabsTrigger value="llm" className="flex items-center gap-2 data-[state=active]:text-purple-600 text-sm">
            <Sparkles className="h-4 w-4" />
            <span className="hidden lg:inline">{t('step1.modelConfiguration.tabs.llm')}</span>
            <span className="lg:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2 data-[state=active]:text-purple-600 text-sm">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden lg:inline">{t('step1.modelConfiguration.tabs.image')}</span>
            <span className="lg:hidden">Image</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2 data-[state=active]:text-purple-600 text-sm">
            <Video className="h-4 w-4" />
            <span className="hidden lg:inline">{t('step1.modelConfiguration.tabs.video')}</span>
            <span className="lg:hidden">Video</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2 data-[state=active]:text-purple-600 text-sm">
            <Mic className="h-4 w-4" />
            <span className="hidden lg:inline">{t('step1.modelConfiguration.tabs.voice')}</span>
            <span className="lg:hidden">Voice</span>
          </TabsTrigger>
          <TabsTrigger value="music" className="flex items-center gap-2 data-[state=active]:text-purple-600 text-sm">
            <Music className="h-4 w-4" />
            <span className="hidden lg:inline">{t('step1.modelConfiguration.tabs.music')}</span>
            <span className="lg:hidden">Music</span>
          </TabsTrigger>
        </TabsList>

        <LLMTab {...tabProps} />
        <ImageTab {...tabProps} />
        <VideoTab {...tabProps} />
        <VoiceTab {...tabProps} />
        <MusicTab {...tabProps} />
      </Tabs>
    </>
  );

  if (isInModal) {
    return content;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t('step1.modelConfiguration.title')}</CardTitle>
        <CardDescription>
          {!isFreeUser ? (
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>{t('step1.modelConfiguration.organizationKeysActive')}</span>
            </div>
          ) : (
            t('step1.modelConfiguration.description')
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>{content}</CardContent>
    </Card>
  );
}