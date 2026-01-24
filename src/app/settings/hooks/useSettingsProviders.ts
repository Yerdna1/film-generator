/**
 * Provider settings handlers for LLM, Music, TTS, Image, Video, and KIE models
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { toast } from '@/lib/toast';
import type { LLMProvider, MusicProvider, TTSProvider, ImageProvider, VideoProvider, ModalEndpoints } from '@/types/project';
import { handleKieModelChange, syncSettingToDatabase, showToast } from './utils';
import type { TranslationFunction } from './utils';

export interface UseSettingsProvidersParams {
  llmProvider: LLMProvider;
  openRouterModel: string;
  musicProvider: MusicProvider;
  ttsProvider: TTSProvider;
  imageProvider: ImageProvider;
  videoProvider: VideoProvider;
  kieImageModel: string;
  kieVideoModel: string;
  kieTtsModel: string;
  kieMusicModel: string;
  kieLlmModel: string;
  modalEndpoints: ModalEndpoints;
  setLLMProvider: (value: LLMProvider) => void;
  setOpenRouterModel: (value: string) => void;
  setMusicProvider: (value: MusicProvider) => void;
  setTTSProvider: (value: TTSProvider) => void;
  setImageProvider: (value: ImageProvider) => void;
  setVideoProvider: (value: VideoProvider) => void;
  setKieImageModel: (value: string) => void;
  setKieVideoModel: (value: string) => void;
  setKieTtsModel: (value: string) => void;
  setKieMusicModel: (value: string) => void;
  setKieLlmModel: (value: string) => void;
  setModalEndpoints: Dispatch<SetStateAction<ModalEndpoints>>;
  setApiConfig: (value: any) => void;
  tPage: TranslationFunction;
}

export function useSettingsProviders({
  llmProvider,
  openRouterModel,
  musicProvider,
  ttsProvider,
  imageProvider,
  videoProvider,
  kieImageModel,
  kieVideoModel,
  kieTtsModel,
  kieMusicModel,
  kieLlmModel,
  modalEndpoints,
  setLLMProvider,
  setOpenRouterModel,
  setMusicProvider,
  setTTSProvider,
  setImageProvider,
  setVideoProvider,
  setKieImageModel,
  setKieVideoModel,
  setKieTtsModel,
  setKieMusicModel,
  setKieLlmModel,
  setModalEndpoints,
  setApiConfig,
  tPage,
}: UseSettingsProvidersParams) {
  const { apiConfig } = useProjectStore();

  const handleLLMProviderChange = useCallback(async (provider: LLMProvider) => {
    setLLMProvider(provider);
    localStorage.setItem('app-llm-provider', provider);
    await syncSettingToDatabase('llmProvider', provider);

    const descriptions: Record<LLMProvider, string> = {
      'openrouter': tPage('toasts.llmProviderOpenRouter') || 'Using OpenRouter for scene generation',
      'claude-sdk': tPage('toasts.llmProviderClaudeSDK') || 'Using Claude SDK/CLI for scene generation',
      'modal': tPage('toasts.llmProviderModal') || 'Using self-hosted LLM on Modal.com',
      'gemini': tPage('toasts.llmProviderGemini') || 'Using Gemini for scene generation',
      'kie': tPage('toasts.llmProviderKie') || 'Using KIE.ai for scene generation',
    };
    showToast('success', tPage('toasts.llmProviderChanged') || 'LLM provider updated', descriptions[provider]);
  }, [setLLMProvider, tPage]);

  const handleOpenRouterModelChange = useCallback(async (model: string) => {
    setOpenRouterModel(model);
    localStorage.setItem('app-openrouter-model', model);
    await syncSettingToDatabase('openRouterModel', model);

    showToast(
      'success',
      tPage('toasts.modelChanged') || 'Model updated',
      `${tPage('toasts.nowUsing') || 'Now using'} ${model.split('/').pop()}`
    );
  }, [setOpenRouterModel, tPage]);

  const handleMusicProviderChange = useCallback(async (provider: MusicProvider) => {
    setMusicProvider(provider);
    localStorage.setItem('app-music-provider', provider);
    setApiConfig({ musicProvider: provider });
    await syncSettingToDatabase('musicProvider', provider);

    const descriptions: Record<MusicProvider, string> = {
      'piapi': tPage('toasts.musicProviderPiAPI') || 'Using PiAPI for music generation',
      'suno': tPage('toasts.musicProviderSuno') || 'Using Suno AI for music generation',
      'kie': tPage('toasts.musicProviderKie') || 'Using Kie.ai for music generation',
      'modal': tPage('toasts.musicProviderModal') || 'Using ACE-Step on Modal.com for music',
    };
    showToast('success', tPage('toasts.musicProviderChanged') || 'Music provider updated', descriptions[provider]);
  }, [setApiConfig, setMusicProvider, tPage]);

  const handleTTSProviderChange = useCallback(async (provider: TTSProvider) => {
    setTTSProvider(provider);
    localStorage.setItem('app-tts-provider', provider);
    setApiConfig({ ttsProvider: provider });
    await syncSettingToDatabase('ttsProvider', provider);

    const descriptions: Record<TTSProvider, string> = {
      'gemini-tts': tPage('toasts.ttsProviderGemini') || 'Using Gemini TTS for voiceovers',
      'elevenlabs': tPage('toasts.ttsProviderElevenLabs') || 'Using ElevenLabs for voiceovers',
      'modal': tPage('toasts.ttsProviderModal') || 'Using self-hosted TTS on Modal.com',
      'openai-tts': tPage('toasts.ttsProviderOpenAI') || 'Using OpenAI TTS for voiceovers',
      'kie': tPage('toasts.ttsProviderKie') || 'Using KIE.ai (ElevenLabs) for voiceovers',
    };
    showToast('success', tPage('toasts.ttsProviderChanged') || 'TTS provider updated', descriptions[provider]);
  }, [setApiConfig, setTTSProvider, tPage]);

  const handleImageProviderChange = useCallback(async (provider: ImageProvider) => {
    setImageProvider(provider);
    localStorage.setItem('app-image-provider', provider);
    setApiConfig({ imageProvider: provider });
    await syncSettingToDatabase('imageProvider', provider);

    const descriptions: Record<ImageProvider, string> = {
      'gemini': tPage('toasts.imageProviderGemini') || 'Using Gemini for image generation',
      'kie': tPage('toasts.imageProviderKie') || 'Using KIE.ai for image generation',
      'modal': tPage('toasts.imageProviderModal') || 'Using Qwen-Image on Modal.com',
      'modal-edit': tPage('toasts.imageProviderModalEdit') || 'Using Qwen-Image-Edit for character consistency',
    };
    showToast('success', tPage('toasts.imageProviderChanged') || 'Image provider updated', descriptions[provider]);
  }, [setApiConfig, setImageProvider, tPage]);

  const handleVideoProviderChange = useCallback(async (provider: VideoProvider) => {
    setVideoProvider(provider);
    localStorage.setItem('app-video-provider', provider);
    setApiConfig({ videoProvider: provider });
    await syncSettingToDatabase('videoProvider', provider);

    const descriptions: Record<VideoProvider, string> = {
      'kie': tPage('toasts.videoProviderKie') || 'Using Kie.ai for video generation',
      'modal': tPage('toasts.videoProviderModal') || 'Using self-hosted model on Modal.com',
    };
    showToast('success', tPage('toasts.videoProviderChanged') || 'Video provider updated', descriptions[provider]);
  }, [setApiConfig, setVideoProvider, tPage]);

  const handleKieImageModelChange = useCallback(async (model: string) => {
    setApiConfig({ kieImageModel: model });
    const toastData = await handleKieModelChange('kie-image-model', model, setKieImageModel, tPage);
    showToast('success', toastData.title, toastData.description);
  }, [setApiConfig, setKieImageModel, tPage]);

  const handleKieVideoModelChange = useCallback(async (model: string) => {
    setApiConfig({ kieVideoModel: model });
    const toastData = await handleKieModelChange('kie-video-model', model, setKieVideoModel, tPage);
    showToast('success', toastData.title, toastData.description);
  }, [setApiConfig, setKieVideoModel, tPage]);

  const handleKieTtsModelChange = useCallback(async (model: string) => {
    setApiConfig({ kieTtsModel: model });
    const toastData = await handleKieModelChange('kie-tts-model', model, setKieTtsModel, tPage);
    showToast('success', toastData.title, toastData.description);
  }, [setApiConfig, setKieTtsModel, tPage]);

  const handleKieMusicModelChange = useCallback(async (model: string) => {
    setApiConfig({ kieMusicModel: model });
    const toastData = await handleKieModelChange('kie-music-model', model, setKieMusicModel, tPage);
    showToast('success', toastData.title, toastData.description);
  }, [setApiConfig, setKieMusicModel, tPage]);

  const handleKieLlmModelChange = useCallback(async (model: string) => {
    setApiConfig({ kieLlmModel: model });
    const toastData = await handleKieModelChange('kie-llm-model', model, setKieLlmModel, tPage);
    showToast('success', toastData.title, toastData.description);
  }, [setApiConfig, setKieLlmModel, tPage]);

  const handleModalEndpointChange = useCallback((endpointKey: keyof ModalEndpoints, value: string) => {
    setModalEndpoints(prev => ({ ...prev, [endpointKey]: value }));
  }, [setModalEndpoints]);

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
        const data = await response.json();
        if (data.apiKeys) {
          syncSettingToDatabase('modalEndpoints', modalEndpoints);
        }

        showToast(
          'success',
          tPage('toasts.modalEndpointsSaved') || 'Modal endpoints saved',
          tPage('toasts.modalEndpointsSavedDesc') || 'Your self-hosted endpoints are configured'
        );
      }
    } catch (error) {
      showToast('error', tPage('toasts.saveFailed') || 'Failed to save', '');
    }
  }, [modalEndpoints, tPage]);

  return {
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
    kieLlmModel,
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
  };
}
