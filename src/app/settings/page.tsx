'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Key, Settings, DollarSign, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from './hooks/useSettings';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import {
  SettingsHeader,
  ApiKeysTab,
  GeneralSettingsTab,
  PricingTab,
} from './components';
import type { LLMProvider, MusicProvider, TTSProvider, ImageProvider, VideoProvider } from '@/types/project';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');
  const router = useRouter();
  const { data: session, status } = useSession();
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // API Keys Context
  const apiKeysContext = useApiKeys();

  // Call useSettings hook unconditionally (before any early returns) to follow React hooks rules
  const {
    // State
    showKeys,
    savedKeys,
    localConfig,
    language,
    darkMode,
    reducedMotion,
    notifyOnComplete,
    autoSave,
    isExporting,
    actionCosts,
    costsLoading,
    apiConfig,
    projects,
    llmProvider,
    openRouterModel,
    musicProvider,
    ttsProvider,
    imageProvider,
    videoProvider,
    modalEndpoints,
    currency,
    kieImageModel,
    kieVideoModel,
    kieTtsModel,
    kieMusicModel,
    kieLlmModel,

    // Actions
    toggleKeyVisibility,
    handleSaveKey,
    updateLocalConfig,
    handleLanguageChange,
    handleDarkModeChange,
    handleReducedMotionChange,
    handleNotifyChange,
    handleAutoSaveChange,
    handleCurrencyChange,
    handleExportData,
    handleDeleteAllData,
    fetchActionCosts,
    handleLLMProviderChange,
    handleOpenRouterModelChange,
    handleMusicProviderChange,
    handleTTSProviderChange,
    handleImageProviderChange,
    handleVideoProviderChange,
    handleKieImageModelChange,
    handleKieVideoModelChange,
    handleKieTtsModelChange,
    handleKieMusicModelChange,
    handleKieLlmModelChange,
    handleModalEndpointChange,
    handleSaveModalEndpoints,
  } = useSettings();

  const isAdmin = session?.user?.email === 'andrej.galad@gmail.com';

  // Check subscription status (no longer redirects FREE users)
  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    // Fetch subscription plan (for display purposes, not access control)
    fetch('/api/polar')
      .then((res) => res.json())
      .then((data) => {
        const plan = data.subscription?.plan || 'free';
        setSubscriptionPlan(plan);
        setLoading(false);
      })
      .catch(() => {
        setSubscriptionPlan('free');
        setLoading(false);
      });
  }, [session, status, router]);

  // Show loading while checking subscription
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SettingsHeader />

      <div className="px-4 py-8">
        <div className="max-w-[1600px] mx-auto">
          <Tabs defaultValue="api" className="space-y-6">
            <TabsList className="glass w-full md:w-auto justify-start">
              <TabsTrigger value="api" className="gap-2">
                <Key className="w-4 h-4" />
                {t('apiKeys')}
              </TabsTrigger>
              <TabsTrigger value="general" className="gap-2">
                <Settings className="w-4 h-4" />
                {tPage('general')}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="pricing" className="gap-2" onClick={fetchActionCosts}>
                  <DollarSign className="w-4 h-4" />
                  Pricing
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="api">
              <ApiKeysTab
                showKeys={showKeys}
                savedKeys={savedKeys}
                localConfig={(apiKeysContext.apiKeys ? Object.fromEntries(
                  Object.entries(apiKeysContext.apiKeys).filter(([key, value]) =>
                    typeof value === 'string' || typeof value === 'undefined'
                  )
                ) : localConfig) as Record<string, string | undefined>}
                apiConfig={apiKeysContext.apiKeys ? {
                  ...apiConfig,
                  ...Object.fromEntries(
                    Object.entries(apiKeysContext.apiKeys)
                      .filter(([key, value]) => typeof value === 'string' || typeof value === 'undefined')
                      .map(([key, value]) => [key, value || undefined])
                  )
                } : apiConfig}
                llmProvider={(apiKeysContext.apiKeys?.llmProvider || llmProvider) as LLMProvider}
                openRouterModel={apiKeysContext.apiKeys?.openRouterModel || openRouterModel}
                musicProvider={(apiKeysContext.apiKeys?.musicProvider || musicProvider) as MusicProvider}
                ttsProvider={(apiKeysContext.apiKeys?.ttsProvider || ttsProvider) as TTSProvider}
                imageProvider={(apiKeysContext.apiKeys?.imageProvider || imageProvider) as ImageProvider}
                videoProvider={(apiKeysContext.apiKeys?.videoProvider || videoProvider) as VideoProvider}
                modalEndpoints={modalEndpoints}
                kieImageModel={apiKeysContext.apiKeys?.kieImageModel || kieImageModel}
                kieVideoModel={apiKeysContext.apiKeys?.kieVideoModel || kieVideoModel}
                kieTtsModel={apiKeysContext.apiKeys?.kieTtsModel || kieTtsModel}
                kieMusicModel={apiKeysContext.apiKeys?.kieMusicModel || kieMusicModel}
                kieLlmModel={apiKeysContext.apiKeys?.kieLlmModel || kieLlmModel}
                onToggleVisibility={toggleKeyVisibility}
                onSaveKey={async (keyName: string) => {
                  // Get the current value from localConfig
                  const value = (localConfig as Record<string, string | undefined>)[keyName] || '';
                  const success = await apiKeysContext.updateApiKey(keyName, value);
                  if (success) {
                    handleSaveKey(keyName);
                    // Refresh ApiKeysContext to ensure sync
                    await apiKeysContext.refreshApiKeys();
                  }
                }}
                onUpdateConfig={updateLocalConfig}
                onLLMProviderChange={async (provider) => {
                  // Note: Provider preferences are now per-project (stored in modelConfig)
                  // Global provider preferences are no longer supported
                  handleLLMProviderChange(provider);
                }}
                onOpenRouterModelChange={async (model) => {
                  // Note: Model preferences are now per-project (stored in modelConfig)
                  // Global model preferences are no longer supported
                  handleOpenRouterModelChange(model);
                }}
                onMusicProviderChange={async (provider) => {
                  // Note: Provider preferences are now per-project (stored in modelConfig)
                  // Global provider preferences are no longer supported
                  handleMusicProviderChange(provider);
                }}
                onTTSProviderChange={async (provider) => {
                  // Note: Provider preferences are now per-project (stored in modelConfig)
                  // Global provider preferences are no longer supported
                  handleTTSProviderChange(provider);
                }}
                onImageProviderChange={async (provider) => {
                  // Note: Provider preferences are now per-project (stored in modelConfig)
                  // Global provider preferences are no longer supported
                  handleImageProviderChange(provider);
                }}
                onVideoProviderChange={async (provider) => {
                  // Note: Provider preferences are now per-project (stored in modelConfig)
                  // Global provider preferences are no longer supported
                  handleVideoProviderChange(provider);
                }}
                onKieImageModelChange={async (model) => {
                  // Note: Model preferences are now per-project (stored in modelConfig)
                  // Global model preferences are no longer supported
                  handleKieImageModelChange(model);
                }}
                onKieVideoModelChange={async (model) => {
                  // Note: Model preferences are now per-project (stored in modelConfig)
                  // Global model preferences are no longer supported
                  handleKieVideoModelChange(model);
                }}
                onKieTtsModelChange={async (model) => {
                  // Note: Model preferences are now per-project (stored in modelConfig)
                  // Global model preferences are no longer supported
                  handleKieTtsModelChange(model);
                }}
                onKieMusicModelChange={async (model) => {
                  // Note: Model preferences are now per-project (stored in modelConfig)
                  // Global model preferences are no longer supported
                  handleKieMusicModelChange(model);
                }}
                onKieLlmModelChange={async (model) => {
                  // Note: Model preferences are now per-project (stored in modelConfig)
                  // Global model preferences are no longer supported
                  handleKieLlmModelChange(model);
                }}
                onModalEndpointChange={handleModalEndpointChange}
                onSaveModalEndpoints={handleSaveModalEndpoints}
              />
            </TabsContent>

            <TabsContent value="general">
              <GeneralSettingsTab
                language={language}
                darkMode={darkMode}
                reducedMotion={reducedMotion}
                projectsCount={projects.length}
                isExporting={isExporting}
                onLanguageChange={handleLanguageChange}
                onDarkModeChange={handleDarkModeChange}
                onReducedMotionChange={handleReducedMotionChange}
                onExportData={handleExportData}
                onDeleteAllData={handleDeleteAllData}
              />
            </TabsContent>

            <TabsContent value="pricing">
              <PricingTab
                actionCosts={actionCosts}
                costsLoading={costsLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
