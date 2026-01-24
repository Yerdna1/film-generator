/**
 * State management and initialization for settings
 */

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { ActionCosts } from '../types';
import type {
  LLMProvider,
  MusicProvider,
  TTSProvider,
  ImageProvider,
  VideoProvider,
  ModalEndpoints,
} from '@/types/project';
import { DEFAULT_OPENROUTER_MODEL } from '../constants';
import { DEFAULT_MODELS } from '@/lib/constants/default-models';
import { getCurrency, type Currency } from '@/lib/utils/currency';
import { getCookieValue, localStorageKeyToDbKey } from './utils';

export interface SettingsState {
  // UI State
  showKeys: Record<string, boolean>;
  savedKeys: Record<string, boolean>;
  localConfig: Record<string, any>;
  isExporting: boolean;

  // UI Preferences
  language: string;
  darkMode: boolean;
  reducedMotion: boolean;
  notifyOnComplete: boolean;
  autoSave: boolean;
  currency: Currency;

  // Provider Settings
  llmProvider: LLMProvider;
  openRouterModel: string;
  musicProvider: MusicProvider;
  ttsProvider: TTSProvider;
  imageProvider: ImageProvider;
  videoProvider: VideoProvider;
  modalEndpoints: ModalEndpoints;

  // KIE Model Settings
  kieImageModel: string;
  kieVideoModel: string;
  kieTtsModel: string;
  kieMusicModel: string;
  kieLlmModel: string;

  // Costs
  actionCosts: ActionCosts | null;
  costsLoading: boolean;
}

export function useSettingsState() {
  const { apiConfig, setApiConfig } = useProjectStore();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [language, setLanguage] = useState('en');
  const [darkMode, setDarkMode] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [actionCosts, setActionCosts] = useState<ActionCosts | null>(null);
  const [costsLoading, setCostsLoading] = useState(false);
  const [llmProvider, setLLMProvider] = useState<LLMProvider>('openrouter');
  const [openRouterModel, setOpenRouterModel] = useState<string>(DEFAULT_OPENROUTER_MODEL);
  const [musicProvider, setMusicProvider] = useState<MusicProvider>('piapi');
  const [ttsProvider, setTTSProvider] = useState<TTSProvider>('gemini-tts');
  const [imageProvider, setImageProvider] = useState<ImageProvider>('gemini');
  const [videoProvider, setVideoProvider] = useState<VideoProvider>('kie');
  const [modalEndpoints, setModalEndpoints] = useState<ModalEndpoints>({});
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [kieImageModel, setKieImageModel] = useState<string>(DEFAULT_MODELS.kieImageModel);
  const [kieVideoModel, setKieVideoModel] = useState<string>(DEFAULT_MODELS.kieVideoModel);
  const [kieTtsModel, setKieTtsModel] = useState<string>(DEFAULT_MODELS.kieTtsModel);
  const [kieMusicModel, setKieMusicModel] = useState<string>(DEFAULT_MODELS.kieMusicModel);
  const [kieLlmModel, setKieLlmModel] = useState<string>(DEFAULT_MODELS.kieLlmModel);

  // One-time migration from localStorage to database
  useEffect(() => {
    const migrateLocalStorage = async () => {
      const migrationDone = localStorage.getItem('app-settings-migrated');
      if (migrationDone === 'true') return;

      const localStorageData: Record<string, any> = {};
      const keys = [
        'app-llm-provider',
        'app-openrouter-model',
        'app-music-provider',
        'app-tts-provider',
        'app-image-provider',
        'app-video-provider',
        'app-kie-image-model',
        'app-kie-video-model',
        'app-kie-tts-model',
        'app-kie-music-model',
        'app-kie-llm-model',
      ];

      let hasData = false;
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) {
          hasData = true;
          const dbKey = localStorageKeyToDbKey(key);
          localStorageData[dbKey] = value;
        }
      }

      if (hasData) {
        try {
          await fetch('/api/user/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localStorageData),
          });

          localStorage.setItem('app-settings-migrated', 'true');

          for (const key of keys) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.error('Failed to migrate localStorage settings:', error);
        }
      }
    };

    migrateLocalStorage();
  }, []);

  // Load UI preferences from localStorage
  useEffect(() => {
    const savedLanguage = getCookieValue('NEXT_LOCALE') || localStorage.getItem('app-language') || 'en';
    const savedDarkMode = localStorage.getItem('app-dark-mode') !== 'false';
    const savedReducedMotion = localStorage.getItem('app-reduced-motion') === 'true';
    const savedNotify = localStorage.getItem('app-notify-complete') !== 'false';
    const savedAutoSave = localStorage.getItem('app-auto-save') !== 'false';
    const savedCurrency = getCurrency();

    setLanguage(savedLanguage);
    setCurrency(savedCurrency);
    setDarkMode(savedDarkMode);
    setReducedMotion(savedReducedMotion);
    setNotifyOnComplete(savedNotify);
    setAutoSave(savedAutoSave);
  }, []);

  // Fetch API keys from database
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await fetch('/api/user/api-keys');
        if (response.ok) {
          const data = await response.json();
          setLocalConfig(data);
          setApiConfig(data);

          // Update provider settings
          if (data.llmProvider) setLLMProvider(data.llmProvider);
          if (data.openRouterModel) setOpenRouterModel(data.openRouterModel);
          if (data.musicProvider) setMusicProvider(data.musicProvider);
          if (data.ttsProvider) setTTSProvider(data.ttsProvider);
          if (data.imageProvider) setImageProvider(data.imageProvider);
          if (data.videoProvider) setVideoProvider(data.videoProvider);

          // Load KIE model selections
          if (data.kieImageModel) setKieImageModel(data.kieImageModel);
          if (data.kieVideoModel) setKieVideoModel(data.kieVideoModel);
          if (data.kieTtsModel) setKieTtsModel(data.kieTtsModel);
          if (data.kieMusicModel) setKieMusicModel(data.kieMusicModel);
          if (data.kieLlmModel) setKieLlmModel(data.kieLlmModel);

          // Load Modal endpoints
          setModalEndpoints({
            llmEndpoint: data.modalLlmEndpoint || '',
            ttsEndpoint: data.modalTtsEndpoint || '',
            imageEndpoint: data.modalImageEndpoint || '',
            imageEditEndpoint: data.modalImageEditEndpoint || '',
            videoEndpoint: data.modalVideoEndpoint || '',
            musicEndpoint: data.modalMusicEndpoint || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      }
    };

    fetchApiKeys();
  }, [setApiConfig]);

  return {
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

    // Setters
    setShowKeys,
    setSavedKeys,
    setLocalConfig,
    setLanguage,
    setDarkMode,
    setReducedMotion,
    setNotifyOnComplete,
    setAutoSave,
    setIsExporting,
    setActionCosts,
    setCostsLoading,
    setLLMProvider,
    setOpenRouterModel,
    setMusicProvider,
    setTTSProvider,
    setImageProvider,
    setVideoProvider,
    setModalEndpoints,
    setCurrency,
    setKieImageModel,
    setKieVideoModel,
    setKieTtsModel,
    setKieMusicModel,
    setKieLlmModel,
  };
}
