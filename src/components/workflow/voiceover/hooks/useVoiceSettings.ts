import { useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { VoiceProvider, VoiceLanguage } from '@/types/project';
import { getVoicesForProvider } from '../../voiceover-generator/types';

export function useVoiceSettings(projectId: string, voiceSettings: any) {
  const { updateVoiceSettings, updateCharacter } = useProjectStore();

  const voices = getVoicesForProvider(voiceSettings.provider);

  const handleVoiceChange = useCallback((characterId: string, voiceId: string) => {
    const voice = voices.find((v) => v.id === voiceId);
    if (!voice) return;

    updateVoiceSettings(projectId, {
      characterVoices: {
        ...voiceSettings.characterVoices,
        [characterId]: { voiceId, voiceName: voice.name },
      },
    });

    updateCharacter(projectId, characterId, {
      voiceId,
      voiceName: voice.name,
    });
  }, [projectId, voices, voiceSettings.characterVoices, updateVoiceSettings, updateCharacter]);

  const handleVoiceSettingsChange = useCallback((characterId: string, settings: {
    voiceInstructions?: string;
    voiceStability?: number;
    voiceSimilarityBoost?: number;
    voiceStyle?: number;
  }) => {
    updateCharacter(projectId, characterId, settings);
  }, [projectId, updateCharacter]);

  const handleProviderChange = useCallback((provider: VoiceProvider) => {
    updateVoiceSettings(projectId, { provider });
  }, [projectId, updateVoiceSettings]);

  const handleLanguageChange = useCallback((language: VoiceLanguage) => {
    updateVoiceSettings(projectId, { language });
  }, [projectId, updateVoiceSettings]);

  return {
    voices,
    handleVoiceChange,
    handleVoiceSettingsChange,
    handleProviderChange,
    handleLanguageChange,
  };
}