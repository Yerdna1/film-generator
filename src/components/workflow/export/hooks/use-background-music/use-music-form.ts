// Form state management for background music

import { useState, useEffect, useCallback } from 'react';
import type { MusicProvider } from '@/types/project';
import type { SunoModel, UseBackgroundMusicProps } from './types';
import { DEFAULT_VALUES } from './constants';

export interface UseMusicFormReturn {
  prompt: string;
  setPrompt: (prompt: string) => void;
  model: SunoModel;
  setModel: (model: SunoModel) => void;
  instrumental: boolean;
  setInstrumental: (instrumental: boolean) => void;
  provider: MusicProvider;
  setProvider: (provider: MusicProvider) => void;
}

export function useMusicForm({ apiKeys }: UseBackgroundMusicProps): UseMusicFormReturn {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<SunoModel>(DEFAULT_VALUES.MODEL);
  const [instrumental, setInstrumental] = useState<boolean>(DEFAULT_VALUES.INSTRUMENTAL);
  const [provider, setProvider] = useState<MusicProvider>(
    (apiKeys?.musicProvider || DEFAULT_VALUES.PROVIDER) as MusicProvider
  );

  // Sync provider state when apiKeys changes
  useEffect(() => {
    if (apiKeys?.musicProvider) {
      setProvider(apiKeys.musicProvider as MusicProvider);

      // Also sync model based on provider
      if (apiKeys.musicProvider === 'kie' && apiKeys.kieMusicModel) {
        // KIE uses model names like 'suno/v3-music', keep as is
        setModel(apiKeys.kieMusicModel as SunoModel);
      } else if (apiKeys.musicProvider === 'piapi') {
        // PiAPI uses V4, V4.5, etc.
        setModel('V4.5');
      }
    }
  }, [apiKeys?.musicProvider, apiKeys?.kieMusicModel ?? '']); // Use empty string fallback to keep array size constant

  return {
    prompt,
    setPrompt,
    model,
    setModel,
    instrumental,
    setInstrumental,
    provider,
    setProvider,
  };
}
