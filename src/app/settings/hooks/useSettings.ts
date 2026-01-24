'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
import type { ActionCosts } from '../types';
import { useSettingsState } from './useSettingsState';
import { useSettingsApiKeys } from './useSettingsApiKeys';
import { useSettingsProviders } from './useSettingsProviders';
import { useSettingsUI } from './useSettingsUI';
import { useSettingsData } from './useSettingsData';
import type { TranslationFunction } from './utils';

export function useSettings() {
  const tPage = useTranslations('settingsPage') as TranslationFunction;
  const { apiConfig, setApiConfig, projects } = useProjectStore();

  // State management
  const state = useSettingsState();

  // API key management
  const apiKeys = useSettingsApiKeys({
    showKeys: state.showKeys,
    savedKeys: state.savedKeys,
    localConfig: state.localConfig,
    setShowKeys: state.setShowKeys,
    setSavedKeys: state.setSavedKeys,
    setLocalConfig: state.setLocalConfig,
    setApiConfig,
    tPage,
  });

  // Provider settings
  const providers = useSettingsProviders({
    llmProvider: state.llmProvider,
    openRouterModel: state.openRouterModel,
    musicProvider: state.musicProvider,
    ttsProvider: state.ttsProvider,
    imageProvider: state.imageProvider,
    videoProvider: state.videoProvider,
    kieImageModel: state.kieImageModel,
    kieVideoModel: state.kieVideoModel,
    kieTtsModel: state.kieTtsModel,
    kieMusicModel: state.kieMusicModel,
    kieLlmModel: state.kieLlmModel,
    modalEndpoints: state.modalEndpoints,
    setLLMProvider: state.setLLMProvider,
    setOpenRouterModel: state.setOpenRouterModel,
    setMusicProvider: state.setMusicProvider,
    setTTSProvider: state.setTTSProvider,
    setImageProvider: state.setImageProvider,
    setVideoProvider: state.setVideoProvider,
    setKieImageModel: state.setKieImageModel,
    setKieVideoModel: state.setKieVideoModel,
    setKieTtsModel: state.setKieTtsModel,
    setKieMusicModel: state.setKieMusicModel,
    setKieLlmModel: state.setKieLlmModel,
    setModalEndpoints: state.setModalEndpoints,
    setApiConfig,
    tPage,
  });

  // UI preferences
  const ui = useSettingsUI({
    language: state.language,
    darkMode: state.darkMode,
    reducedMotion: state.reducedMotion,
    notifyOnComplete: state.notifyOnComplete,
    autoSave: state.autoSave,
    currency: state.currency,
    setLanguage: state.setLanguage,
    setDarkMode: state.setDarkMode,
    setReducedMotion: state.setReducedMotion,
    setNotifyOnComplete: state.setNotifyOnComplete,
    setAutoSave: state.setAutoSave,
    setCurrency: state.setCurrency,
    tPage,
  });

  // Data export/delete
  const data = useSettingsData({
    projects,
    language: state.language,
    darkMode: state.darkMode,
    reducedMotion: state.reducedMotion,
    notifyOnComplete: state.notifyOnComplete,
    autoSave: state.autoSave,
    isExporting: state.isExporting,
    setIsExporting: state.setIsExporting,
    tPage,
  });

  // Action costs (cached in state)
  const fetchActionCosts = useCallback(async () => {
    if (state.actionCosts) return state.actionCosts;
    state.setCostsLoading(true);
    try {
      const response = await fetch('/api/costs');
      const data = await response.json();
      state.setActionCosts(data.costs);
      return data.costs;
    } catch (error) {
      console.error('Failed to fetch action costs:', error);
      return null;
    } finally {
      state.setCostsLoading(false);
    }
  }, [state.actionCosts, state.setActionCosts, state.setCostsLoading]);

  return {
    // State
    ...apiKeys, // showKeys, savedKeys, localConfig, apiConfig
    language: ui.language,
    darkMode: ui.darkMode,
    reducedMotion: ui.reducedMotion,
    notifyOnComplete: ui.notifyOnComplete,
    autoSave: ui.autoSave,
    isExporting: data.isExporting,
    actionCosts: state.actionCosts,
    costsLoading: state.costsLoading,
    apiConfig: apiKeys.apiConfig,
    projects: data.projects,
    llmProvider: providers.llmProvider,
    openRouterModel: providers.openRouterModel,
    musicProvider: providers.musicProvider,
    ttsProvider: providers.ttsProvider,
    imageProvider: providers.imageProvider,
    videoProvider: providers.videoProvider,
    modalEndpoints: providers.modalEndpoints,
    currency: ui.currency,
    kieImageModel: providers.kieImageModel,
    kieVideoModel: providers.kieVideoModel,
    kieTtsModel: providers.kieTtsModel,
    kieMusicModel: providers.kieMusicModel,
    kieLlmModel: providers.kieLlmModel,

    // Actions
    toggleKeyVisibility: apiKeys.toggleKeyVisibility,
    handleSaveKey: apiKeys.handleSaveKey,
    updateLocalConfig: apiKeys.updateLocalConfig,
    handleLanguageChange: ui.handleLanguageChange,
    handleDarkModeChange: ui.handleDarkModeChange,
    handleReducedMotionChange: ui.handleReducedMotionChange,
    handleNotifyChange: ui.handleNotifyChange,
    handleAutoSaveChange: ui.handleAutoSaveChange,
    handleCurrencyChange: ui.handleCurrencyChange,
    handleExportData: data.handleExportData,
    handleDeleteAllData: data.handleDeleteAllData,
    fetchActionCosts,
    handleLLMProviderChange: providers.handleLLMProviderChange,
    handleOpenRouterModelChange: providers.handleOpenRouterModelChange,
    handleMusicProviderChange: providers.handleMusicProviderChange,
    handleTTSProviderChange: providers.handleTTSProviderChange,
    handleImageProviderChange: providers.handleImageProviderChange,
    handleVideoProviderChange: providers.handleVideoProviderChange,
    handleKieImageModelChange: providers.handleKieImageModelChange,
    handleKieVideoModelChange: providers.handleKieVideoModelChange,
    handleKieTtsModelChange: providers.handleKieTtsModelChange,
    handleKieMusicModelChange: providers.handleKieMusicModelChange,
    handleKieLlmModelChange: providers.handleKieLlmModelChange,
    handleModalEndpointChange: providers.handleModalEndpointChange,
    handleSaveModalEndpoints: providers.handleSaveModalEndpoints,
  };
}

export type { TranslationFunction };
