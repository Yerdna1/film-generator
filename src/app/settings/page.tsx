'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Key, Settings, User, DollarSign, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from './hooks/useSettings';
import {
  SettingsHeader,
  ApiKeysTab,
  GeneralSettingsTab,
  AccountTab,
  PricingTab,
} from './components';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');
  const router = useRouter();
  const { data: session, status } = useSession();
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    handleModalEndpointChange,
    handleSaveModalEndpoints,
  } = useSettings();

  const isAdmin = session?.user?.email === 'andrej.galad@gmail.com';

  // Check subscription and redirect FREE users
  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    // Fetch subscription plan
    fetch('/api/polar')
      .then((res) => res.json())
      .then((data) => {
        const plan = data.subscription?.plan || 'free';
        setSubscriptionPlan(plan);

        // Redirect FREE users (unless admin) to billing page
        if (plan === 'free' && !isAdmin) {
          router.push('/billing');
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        // On error, assume free and redirect
        if (!isAdmin) {
          router.push('/billing');
        } else {
          setLoading(false);
        }
      });
  }, [session, status, router, isAdmin]);

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
              <TabsTrigger value="account" className="gap-2">
                <User className="w-4 h-4" />
                {tPage('account')}
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-2" onClick={fetchActionCosts}>
                <DollarSign className="w-4 h-4" />
                Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api">
              <ApiKeysTab
                showKeys={showKeys}
                savedKeys={savedKeys}
                localConfig={localConfig as Record<string, string | undefined>}
                apiConfig={apiConfig}
                llmProvider={llmProvider}
                openRouterModel={openRouterModel}
                musicProvider={musicProvider}
                ttsProvider={ttsProvider}
                imageProvider={imageProvider}
                videoProvider={videoProvider}
                modalEndpoints={modalEndpoints}
                kieImageModel={kieImageModel}
                kieVideoModel={kieVideoModel}
                kieTtsModel={kieTtsModel}
                onToggleVisibility={toggleKeyVisibility}
                onSaveKey={handleSaveKey}
                onUpdateConfig={updateLocalConfig}
                onLLMProviderChange={handleLLMProviderChange}
                onOpenRouterModelChange={handleOpenRouterModelChange}
                onMusicProviderChange={handleMusicProviderChange}
                onTTSProviderChange={handleTTSProviderChange}
                onImageProviderChange={handleImageProviderChange}
                onVideoProviderChange={handleVideoProviderChange}
                onKieImageModelChange={handleKieImageModelChange}
                onKieVideoModelChange={handleKieVideoModelChange}
                onKieTtsModelChange={handleKieTtsModelChange}
                onModalEndpointChange={handleModalEndpointChange}
                onSaveModalEndpoints={handleSaveModalEndpoints}
              />
            </TabsContent>

            <TabsContent value="general">
              <GeneralSettingsTab
                language={language}
                darkMode={darkMode}
                reducedMotion={reducedMotion}
                notifyOnComplete={notifyOnComplete}
                autoSave={autoSave}
                currency={currency}
                onLanguageChange={handleLanguageChange}
                onDarkModeChange={handleDarkModeChange}
                onReducedMotionChange={handleReducedMotionChange}
                onNotifyChange={handleNotifyChange}
                onAutoSaveChange={handleAutoSaveChange}
                onCurrencyChange={handleCurrencyChange}
              />
            </TabsContent>

            <TabsContent value="account">
              <AccountTab
                projectsCount={projects.length}
                isExporting={isExporting}
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
