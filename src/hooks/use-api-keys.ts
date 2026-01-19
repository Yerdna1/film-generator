'use client';

import useSWR from 'swr';
import type { LLMProvider, MusicProvider, TTSProvider, ImageProvider, VideoProvider, ModalEndpoints } from '@/types/project';

export interface ApiKeysData {
  // Provider settings
  llmProvider?: LLMProvider;
  openRouterModel?: string;
  musicProvider?: MusicProvider;
  ttsProvider?: TTSProvider;
  imageProvider?: ImageProvider;
  videoProvider?: VideoProvider;
  // Modal endpoints
  modalLlmEndpoint?: string;
  modalTtsEndpoint?: string;
  modalImageEndpoint?: string;
  modalImageEditEndpoint?: string;
  modalVideoEndpoint?: string;
  modalMusicEndpoint?: string;
  // API keys (masked or presence indicators)
  kieApiKey?: string;
  openRouterApiKey?: string;
  elevenLabsApiKey?: string;
  geminiApiKey?: string;
  piapiApiKey?: string;
  openaiApiKey?: string;
  grokApiKey?: string;
  claudeApiKey?: string;
  nanoBananaApiKey?: string;
  sunoApiKey?: string;
  // Boolean flags for key presence
  hasOpenRouterKey?: boolean;
  hasElevenLabsKey?: boolean;
  hasGeminiKey?: boolean;
  hasPiApiKey?: boolean;
  hasKieKey?: boolean;
  hasOpenAIKey?: boolean;
  hasGrokKey?: boolean;
  hasClaudeKey?: boolean;
  hasNanoBananaKey?: boolean;
  hasSunoKey?: boolean;
}

const fetcher = async (url: string): Promise<ApiKeysData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch API keys');
  }
  return res.json();
};

/**
 * Centralized hook for user API keys and provider settings using SWR.
 * This eliminates redundant fetches across workflow components.
 *
 * The hook provides:
 * - Provider settings (llmProvider, imageProvider, etc.)
 * - Modal endpoints
 * - Deduplication across all components using it
 */
export function useApiKeys(options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR<ApiKeysData>(
    enabled ? '/api/user/api-keys' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
      refreshInterval: 0, // Don't auto-refresh (API keys rarely change)
    }
  );

  // Extract modal endpoints into a structured object
  const modalEndpoints: ModalEndpoints = {
    llmEndpoint: data?.modalLlmEndpoint || '',
    ttsEndpoint: data?.modalTtsEndpoint || '',
    imageEndpoint: data?.modalImageEndpoint || '',
    imageEditEndpoint: data?.modalImageEditEndpoint || '',
    videoEndpoint: data?.modalVideoEndpoint || '',
    musicEndpoint: data?.modalMusicEndpoint || '',
  };

  return {
    data,
    // Provider settings
    llmProvider: data?.llmProvider,
    openRouterModel: data?.openRouterModel,
    musicProvider: data?.musicProvider,
    ttsProvider: data?.ttsProvider,
    imageProvider: data?.imageProvider,
    videoProvider: data?.videoProvider,
    modalEndpoints,
    // State
    isLoading,
    error,
    refresh: () => mutate(),
    mutate,
  };
}
