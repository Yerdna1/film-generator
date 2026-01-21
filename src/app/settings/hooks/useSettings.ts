'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
import { toast } from 'sonner';
import type { ActionCosts } from '../types';
import type { LLMProvider, MusicProvider, TTSProvider, ImageProvider, VideoProvider, ModalEndpoints } from '@/types/project';
import { DEFAULT_OPENROUTER_MODEL } from '../constants';
import { DEFAULT_MODELS } from '@/components/workflow/api-key-modal/constants';
import { getCurrency, setCurrency as setCurrencyUtil, type Currency } from '@/lib/utils/currency';

export function useSettings() {
  const tPage = useTranslations('settingsPage');
  const router = useRouter();
  const { apiConfig, setApiConfig, projects, clearProjects } = useProjectStore();

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

  // Load settings from localStorage on mount
  useEffect(() => {
    // Read language from cookie first (this is what next-intl uses)
    const getCookieValue = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };
    const savedLanguage = getCookieValue('NEXT_LOCALE') || localStorage.getItem('app-language') || 'en';
    const savedDarkMode = localStorage.getItem('app-dark-mode') !== 'false';
    const savedReducedMotion = localStorage.getItem('app-reduced-motion') === 'true';
    const savedNotify = localStorage.getItem('app-notify-complete') !== 'false';
    const savedAutoSave = localStorage.getItem('app-auto-save') !== 'false';
    const savedLLMProvider = (localStorage.getItem('app-llm-provider') as LLMProvider) || 'openrouter';
    const savedOpenRouterModel = localStorage.getItem('app-openrouter-model') || DEFAULT_OPENROUTER_MODEL;
    const savedMusicProvider = (localStorage.getItem('app-music-provider') as MusicProvider) || 'piapi';
    const savedTTSProvider = (localStorage.getItem('app-tts-provider') as TTSProvider) || 'gemini-tts';
    const savedImageProvider = (localStorage.getItem('app-image-provider') as ImageProvider) || 'gemini';
    const savedVideoProvider = (localStorage.getItem('app-video-provider') as VideoProvider) || 'kie';
    const savedCurrency = getCurrency();
    const savedKieImageModel = localStorage.getItem('app-kie-image-model') || DEFAULT_MODELS.kieImageModel;
    const savedKieVideoModel = localStorage.getItem('app-kie-video-model') || DEFAULT_MODELS.kieVideoModel;
    const savedKieTtsModel = localStorage.getItem('app-kie-tts-model') || DEFAULT_MODELS.kieTtsModel;
    const savedKieMusicModel = localStorage.getItem('app-kie-music-model') || DEFAULT_MODELS.kieMusicModel;

    setLanguage(savedLanguage);
    setCurrency(savedCurrency);
    setDarkMode(savedDarkMode);
    setReducedMotion(savedReducedMotion);
    setNotifyOnComplete(savedNotify);
    setAutoSave(savedAutoSave);
    setLLMProvider(savedLLMProvider);
    setOpenRouterModel(savedOpenRouterModel);
    setMusicProvider(savedMusicProvider);
    setTTSProvider(savedTTSProvider);
    setImageProvider(savedImageProvider);
    setVideoProvider(savedVideoProvider);
    setKieImageModel(savedKieImageModel);
    setKieVideoModel(savedKieVideoModel);
    setKieTtsModel(savedKieTtsModel);
    setKieMusicModel(savedKieMusicModel);
  }, []);

  // Fetch API keys from database for authenticated users
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await fetch('/api/user/api-keys');
        if (response.ok) {
          const data = await response.json();
          // Update local state and store with fetched API keys
          setLocalConfig(data);
          setApiConfig(data);
          // Update provider settings if returned from API
          if (data.llmProvider) {
            setLLMProvider(data.llmProvider);
            localStorage.setItem('app-llm-provider', data.llmProvider);
          }
          if (data.openRouterModel) {
            setOpenRouterModel(data.openRouterModel);
            localStorage.setItem('app-openrouter-model', data.openRouterModel);
          }
          if (data.musicProvider) {
            setMusicProvider(data.musicProvider);
            localStorage.setItem('app-music-provider', data.musicProvider);
          }
          if (data.ttsProvider) {
            setTTSProvider(data.ttsProvider);
            localStorage.setItem('app-tts-provider', data.ttsProvider);
          }
          if (data.imageProvider) {
            setImageProvider(data.imageProvider);
            localStorage.setItem('app-image-provider', data.imageProvider);
          }
          if (data.videoProvider) {
            setVideoProvider(data.videoProvider);
            localStorage.setItem('app-video-provider', data.videoProvider);
          }
          // Load KIE model selections
          if (data.kieImageModel) {
            setKieImageModel(data.kieImageModel);
            localStorage.setItem('app-kie-image-model', data.kieImageModel);
          }
          if (data.kieVideoModel) {
            setKieVideoModel(data.kieVideoModel);
            localStorage.setItem('app-kie-video-model', data.kieVideoModel);
          }
          if (data.kieTtsModel) {
            setKieTtsModel(data.kieTtsModel);
            localStorage.setItem('app-kie-tts-model', data.kieTtsModel);
          }
          if (data.kieMusicModel) {
            setKieMusicModel(data.kieMusicModel);
            localStorage.setItem('app-kie-music-model', data.kieMusicModel);
          }
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

  // Listen for API key updates from ApiKeysContext (e.g., when modal saves keys)
  useEffect(() => {
    const handleApiKeysUpdate = (event: CustomEvent) => {
      const updatedKeys = event.detail;
      if (updatedKeys) {
        // Update local config with the new keys
        setLocalConfig(updatedKeys);
        setApiConfig(updatedKeys);
      }
    };

    window.addEventListener('apiKeysUpdated' as any, handleApiKeysUpdate);
    return () => {
      window.removeEventListener('apiKeysUpdated' as any, handleApiKeysUpdate);
    };
  }, [setApiConfig]);

  const fetchActionCosts = useCallback(async () => {
    if (actionCosts) return;
    setCostsLoading(true);
    try {
      const response = await fetch('/api/costs');
      const data = await response.json();
      setActionCosts(data.costs);
    } catch (error) {
      console.error('Failed to fetch action costs:', error);
    } finally {
      setCostsLoading(false);
    }
  }, [actionCosts]);

  const toggleKeyVisibility = useCallback((key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSaveKey = useCallback((key: string) => {
    setApiConfig({ [key]: localConfig[key as keyof typeof localConfig] });
    setSavedKeys((prev) => ({ ...prev, [key]: true }));
    toast.success(tPage('toasts.apiKeySaved'), {
      description: tPage('toasts.apiKeySavedDesc'),
    });
    setTimeout(() => {
      setSavedKeys((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  }, [localConfig, setApiConfig, tPage]);

  const updateLocalConfig = useCallback((key: string, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
    localStorage.setItem('app-language', newLang);
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`;
    toast.success(tPage('toasts.languageUpdated'), {
      description: newLang === 'sk' ? tPage('toasts.languageChangedSk') : tPage('toasts.languageChangedEn'),
    });
    window.location.reload();
  }, [tPage]);

  const handleDarkModeChange = useCallback((enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem('app-dark-mode', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(enabled ? tPage('toasts.darkModeEnabled') : tPage('toasts.lightModeEnabled'), {
      description: tPage('toasts.themePreferenceSaved'),
    });
  }, [tPage]);

  const handleReducedMotionChange = useCallback((enabled: boolean) => {
    setReducedMotion(enabled);
    localStorage.setItem('app-reduced-motion', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    toast.success(enabled ? tPage('toasts.reducedMotionEnabled') : tPage('toasts.animationsEnabled'), {
      description: tPage('toasts.motionPreferenceSaved'),
    });
  }, [tPage]);

  const handleNotifyChange = useCallback((enabled: boolean) => {
    setNotifyOnComplete(enabled);
    localStorage.setItem('app-notify-complete', String(enabled));
  }, []);

  const handleAutoSaveChange = useCallback((enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem('app-auto-save', String(enabled));
  }, []);

  const handleCurrencyChange = useCallback((newCurrency: Currency) => {
    setCurrency(newCurrency);
    setCurrencyUtil(newCurrency);
    toast.success(tPage('toasts.currencyUpdated') || 'Currency updated', {
      description: `${tPage('toasts.nowDisplaying') || 'Now displaying prices in'} ${newCurrency}`,
    });
  }, [tPage]);

  const handleLLMProviderChange = useCallback(async (provider: LLMProvider) => {
    setLLMProvider(provider);
    localStorage.setItem('app-llm-provider', provider);
    setApiConfig({ llmProvider: provider });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmProvider: provider }),
      });
    } catch (error) {
      console.error('Failed to sync llmProvider to database:', error);
    }

    const descriptions: Record<LLMProvider, string> = {
      'openrouter': tPage('toasts.llmProviderOpenRouter') || 'Using OpenRouter for scene generation',
      'claude-sdk': tPage('toasts.llmProviderClaudeSDK') || 'Using Claude SDK/CLI for scene generation',
      'modal': tPage('toasts.llmProviderModal') || 'Using self-hosted LLM on Modal.com',
      'gemini': tPage('toasts.llmProviderGemini') || 'Using Gemini for scene generation',
      'kie': tPage('toasts.llmProviderKie') || 'Using KIE.ai for scene generation',
    };
    toast.success(
      tPage('toasts.llmProviderChanged') || 'LLM provider updated',
      { description: descriptions[provider] }
    );
  }, [setApiConfig, tPage]);

  const handleOpenRouterModelChange = useCallback(async (model: string) => {
    setOpenRouterModel(model);
    localStorage.setItem('app-openrouter-model', model);
    setApiConfig({ openRouterModel: model });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openRouterModel: model }),
      });
    } catch (error) {
      console.error('Failed to sync openRouterModel to database:', error);
    }

    toast.success(
      tPage('toasts.modelChanged') || 'Model updated',
      {
        description: `${tPage('toasts.nowUsing') || 'Now using'} ${model.split('/').pop()}`,
      }
    );
  }, [setApiConfig, tPage]);

  const handleMusicProviderChange = useCallback(async (provider: MusicProvider) => {
    setMusicProvider(provider);
    localStorage.setItem('app-music-provider', provider);
    setApiConfig({ musicProvider: provider });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicProvider: provider }),
      });
    } catch (error) {
      console.error('Failed to sync musicProvider to database:', error);
    }

    const descriptions: Record<MusicProvider, string> = {
      'piapi': tPage('toasts.musicProviderPiAPI') || 'Using PiAPI for music generation',
      'suno': tPage('toasts.musicProviderSuno') || 'Using Suno AI for music generation',
      'kie': tPage('toasts.musicProviderKie') || 'Using Kie.ai for music generation',
      'modal': tPage('toasts.musicProviderModal') || 'Using ACE-Step on Modal.com for music',
    };
    toast.success(
      tPage('toasts.musicProviderChanged') || 'Music provider updated',
      { description: descriptions[provider] }
    );
  }, [setApiConfig, tPage]);

  const handleTTSProviderChange = useCallback(async (provider: TTSProvider) => {
    setTTSProvider(provider);
    localStorage.setItem('app-tts-provider', provider);
    setApiConfig({ ttsProvider: provider });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttsProvider: provider }),
      });
    } catch (error) {
      console.error('Failed to sync ttsProvider to database:', error);
    }

    const descriptions: Record<TTSProvider, string> = {
      'gemini-tts': tPage('toasts.ttsProviderGemini') || 'Using Gemini TTS for voiceovers',
      'elevenlabs': tPage('toasts.ttsProviderElevenLabs') || 'Using ElevenLabs for voiceovers',
      'modal': tPage('toasts.ttsProviderModal') || 'Using self-hosted TTS on Modal.com',
      'openai-tts': tPage('toasts.ttsProviderOpenAI') || 'Using OpenAI TTS for voiceovers',
      'kie': tPage('toasts.ttsProviderKie') || 'Using KIE.ai (ElevenLabs) for voiceovers',
    };
    toast.success(
      tPage('toasts.ttsProviderChanged') || 'TTS provider updated',
      { description: descriptions[provider] }
    );
  }, [setApiConfig, tPage]);

  const handleImageProviderChange = useCallback(async (provider: ImageProvider) => {
    setImageProvider(provider);
    localStorage.setItem('app-image-provider', provider);
    setApiConfig({ imageProvider: provider });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageProvider: provider }),
      });
    } catch (error) {
      console.error('Failed to sync imageProvider to database:', error);
    }

    const descriptions: Record<ImageProvider, string> = {
      'gemini': tPage('toasts.imageProviderGemini') || 'Using Gemini for image generation',
      'kie': tPage('toasts.imageProviderKie') || 'Using KIE.ai for image generation',
      'modal': tPage('toasts.imageProviderModal') || 'Using Qwen-Image on Modal.com',
      'modal-edit': tPage('toasts.imageProviderModalEdit') || 'Using Qwen-Image-Edit for character consistency',
    };
    toast.success(
      tPage('toasts.imageProviderChanged') || 'Image provider updated',
      { description: descriptions[provider] }
    );
  }, [setApiConfig, tPage]);

  const handleVideoProviderChange = useCallback(async (provider: VideoProvider) => {
    setVideoProvider(provider);
    localStorage.setItem('app-video-provider', provider);
    setApiConfig({ videoProvider: provider });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoProvider: provider }),
      });
    } catch (error) {
      console.error('Failed to sync videoProvider to database:', error);
    }

    const descriptions: Record<VideoProvider, string> = {
      'kie': tPage('toasts.videoProviderKie') || 'Using Kie.ai for video generation',
      'modal': tPage('toasts.videoProviderModal') || 'Using self-hosted model on Modal.com',
    };
    toast.success(
      tPage('toasts.videoProviderChanged') || 'Video provider updated',
      { description: descriptions[provider] }
    );
  }, [setApiConfig, tPage]);

  const handleKieImageModelChange = useCallback(async (model: string) => {
    setKieImageModel(model);
    localStorage.setItem('app-kie-image-model', model);
    setApiConfig({ kieImageModel: model });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kieImageModel: model }),
      });
    } catch (error) {
      console.error('Failed to sync kieImageModel to database:', error);
    }

    toast.success(
      tPage('toasts.kieModelChanged') || 'KIE model updated',
      { description: `${tPage('toasts.nowUsing') || 'Now using'} ${model}` }
    );
  }, [setApiConfig, tPage]);

  const handleKieVideoModelChange = useCallback(async (model: string) => {
    setKieVideoModel(model);
    localStorage.setItem('app-kie-video-model', model);
    setApiConfig({ kieVideoModel: model });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kieVideoModel: model }),
      });
    } catch (error) {
      console.error('Failed to sync kieVideoModel to database:', error);
    }

    toast.success(
      tPage('toasts.kieModelChanged') || 'KIE model updated',
      { description: `${tPage('toasts.nowUsing') || 'Now using'} ${model}` }
    );
  }, [setApiConfig, tPage]);

  const handleKieTtsModelChange = useCallback(async (model: string) => {
    setKieTtsModel(model);
    localStorage.setItem('app-kie-tts-model', model);
    setApiConfig({ kieTtsModel: model });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kieTtsModel: model }),
      });
    } catch (error) {
      console.error('Failed to sync kieTtsModel to database:', error);
    }

    toast.success(
      tPage('toasts.kieModelChanged') || 'KIE model updated',
      { description: `${tPage('toasts.nowUsing') || 'Now using'} ${model}` }
    );
  }, [setApiConfig, tPage]);

  const handleKieMusicModelChange = useCallback(async (model: string) => {
    setKieMusicModel(model);
    localStorage.setItem('app-kie-music-model', model);
    setApiConfig({ kieMusicModel: model });

    // Sync to database for authenticated users
    try {
      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kieMusicModel: model }),
      });
    } catch (error) {
      console.error('Failed to sync kieMusicModel to database:', error);
    }

    toast.success(
      tPage('toasts.kieModelChanged') || 'KIE model updated',
      { description: `${tPage('toasts.nowUsing') || 'Now using'} ${model}` }
    );
  }, [setApiConfig, tPage]);

  const handleModalEndpointChange = useCallback((endpointKey: keyof ModalEndpoints, value: string) => {
    setModalEndpoints(prev => ({ ...prev, [endpointKey]: value }));
  }, []);

  const handleSaveModalEndpoints = useCallback(async () => {
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modalLlmEndpoint: modalEndpoints.llmEndpoint || null,
          modalTtsEndpoint: modalEndpoints.ttsEndpoint || null,
          modalImageEndpoint: modalEndpoints.imageEndpoint || null,
          modalImageEditEndpoint: modalEndpoints.imageEditEndpoint || null,
          modalVideoEndpoint: modalEndpoints.videoEndpoint || null,
          modalMusicEndpoint: modalEndpoints.musicEndpoint || null,
        }),
      });
      if (response.ok) {
        toast.success(
          tPage('toasts.modalEndpointsSaved') || 'Modal endpoints saved',
          { description: tPage('toasts.modalEndpointsSavedDesc') || 'Your self-hosted endpoints are configured' }
        );
      }
    } catch (error) {
      toast.error(tPage('toasts.saveFailed') || 'Failed to save');
    }
  }, [modalEndpoints, tPage]);

  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        projects: projects,
        settings: {
          language,
          darkMode,
          reducedMotion,
          notifyOnComplete,
          autoSave,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `film-generator-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(tPage('toasts.dataExported'), {
        description: tPage('toasts.dataExportedDesc'),
      });
    } catch (error) {
      toast.error(tPage('toasts.exportFailed'), {
        description: tPage('toasts.exportFailedDesc'),
      });
    } finally {
      setIsExporting(false);
    }
  }, [projects, language, darkMode, reducedMotion, notifyOnComplete, autoSave, tPage]);

  const handleDeleteAllData = useCallback(() => {
    clearProjects();
    localStorage.removeItem('film-generator-projects');
    localStorage.removeItem('film-generator-api-config');
    localStorage.removeItem('app-language');
    localStorage.removeItem('app-dark-mode');
    localStorage.removeItem('app-reduced-motion');
    localStorage.removeItem('app-notify-complete');
    localStorage.removeItem('app-auto-save');

    toast.success(tPage('toasts.dataDeleted'), {
      description: tPage('toasts.dataDeletedDesc'),
    });

    router.push('/');
  }, [clearProjects, router, tPage]);

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
    handleModalEndpointChange,
    handleSaveModalEndpoints,
  };
}
