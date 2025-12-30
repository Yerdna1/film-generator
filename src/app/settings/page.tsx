'use client';

import { useTranslations } from 'next-intl';
import { Key, Settings, User, DollarSign } from 'lucide-react';
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

    // Actions
    toggleKeyVisibility,
    handleSaveKey,
    updateLocalConfig,
    handleLanguageChange,
    handleDarkModeChange,
    handleReducedMotionChange,
    handleNotifyChange,
    handleAutoSaveChange,
    handleExportData,
    handleDeleteAllData,
    fetchActionCosts,
  } = useSettings();

  return (
    <div className="min-h-screen">
      <SettingsHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
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
                localConfig={localConfig}
                apiConfig={apiConfig}
                onToggleVisibility={toggleKeyVisibility}
                onSaveKey={handleSaveKey}
                onUpdateConfig={updateLocalConfig}
              />
            </TabsContent>

            <TabsContent value="general">
              <GeneralSettingsTab
                language={language}
                darkMode={darkMode}
                reducedMotion={reducedMotion}
                notifyOnComplete={notifyOnComplete}
                autoSave={autoSave}
                onLanguageChange={handleLanguageChange}
                onDarkModeChange={handleDarkModeChange}
                onReducedMotionChange={handleReducedMotionChange}
                onNotifyChange={handleNotifyChange}
                onAutoSaveChange={handleAutoSaveChange}
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
