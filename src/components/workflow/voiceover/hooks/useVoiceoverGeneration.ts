import { useState, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';
import { KIE_VOICES } from '../../voiceover-generator/types';

interface PendingGeneration {
  type: 'single' | 'all';
  lineId?: string;
  sceneId?: string;
}

export function useVoiceoverGeneration(
  project: Project,
  apiKeysData: any,
  generateAudioForLine: (lineId: string, sceneId: string, skipCreditCheck?: boolean) => Promise<void>,
  handleGenerateAll: (skipCreditCheck?: boolean) => Promise<void>
) {
  const { updateVoiceSettings, updateCharacter } = useProjectStore();

  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);
  const [pendingVoiceoverGeneration, setPendingVoiceoverGeneration] = useState<PendingGeneration | null>(null);

  // New state for confirmation dialog
  const [isGenerateAllDialogOpen, setIsGenerateAllDialogOpen] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Helper function to check if user has their own TTS API key
  const hasOwnTtsApiKey = useCallback((apiKeys: any, currentProvider: string): boolean => {
    switch (currentProvider) {
      case 'kie':
        return !!apiKeys?.hasKieKey;
      case 'gemini-tts':
        return !!apiKeys?.hasGeminiKey;
      case 'openai-tts':
        return !!apiKeys?.hasOpenAIKey;
      case 'elevenlabs':
        return !!apiKeys?.hasElevenLabsKey;
      case 'modal':
        return !!apiKeys?.modalTtsEndpoint;
      default:
        return false;
    }
  }, []);

  // Get provider and model from API keys (single source of truth)
  const getProviderAndModel = useCallback((apiKeys: any) => {
    // First, check if we can infer the provider from a configured model
    if (apiKeys?.kieTtsModel) {
      return { provider: 'kie', model: apiKeys.kieTtsModel };
    }
    if (apiKeys?.elevenlabsModel || apiKeys?.hasElevenLabsKey) {
      return { provider: 'elevenlabs', model: apiKeys?.elevenlabsModel || 'eleven_multilingual_v2' };
    }
    if (apiKeys?.openaiTtsModel || apiKeys?.hasOpenAIKey) {
      return { provider: 'openai-tts', model: apiKeys?.openaiTtsModel || 'tts-1' };
    }
    if (apiKeys?.modalTtsModel || apiKeys?.modalTtsEndpoint) {
      return { provider: 'modal', model: apiKeys?.modalTtsModel };
    }
    // Fall back to ttsProvider from API keys or project settings
    const provider = apiKeys?.ttsProvider || project.voiceSettings?.provider || 'gemini-tts';
    let model = undefined;

    switch (provider) {
      case 'kie':
        model = apiKeys?.kieTtsModel;
        break;
      case 'gemini-tts':
        model = 'gemini-tts'; // Gemini TTS doesn't have models
        break;
      case 'openai-tts':
        model = apiKeys?.openaiTtsModel || 'tts-1';
        break;
      case 'elevenlabs':
        model = apiKeys?.elevenlabsModel || 'eleven_multilingual_v2';
        break;
      case 'modal':
        model = apiKeys?.modalTtsModel;
        break;
    }

    return { provider, model };
  }, [project.voiceSettings]);

  // Credit check wrapper for single voiceover generation
  const handleGenerateAudioWithCreditCheck = useCallback(async (lineId: string, sceneId: string) => {
    setPendingVoiceoverGeneration({ type: 'single', lineId, sceneId });
    setIsInsufficientCreditsModalOpen(true);
  }, []);

  // Credit check wrapper for all voiceovers generation
  const handleGenerateAllWithCreditCheck = useCallback(async () => {
    const { provider } = getProviderAndModel(apiKeysData);

    // Check if user has their own API key for the current provider
    const hasOwnKey = hasOwnTtsApiKey(apiKeysData, provider);

    // If user has own API key, skip credit check and show confirmation dialog directly
    if (hasOwnKey) {
      setIsGenerateAllDialogOpen(true);
      return;
    }

    // If apiKeysData is still loading (null), don't check credits yet
    // Proceed with generation (API will check on backend)
    if (apiKeysData === null) {
      await handleGenerateAll();
      return;
    }

    // Only check credits if user doesn't have their own API key
    setPendingVoiceoverGeneration({ type: 'all' });
    setIsInsufficientCreditsModalOpen(true);
  }, [apiKeysData, getProviderAndModel, hasOwnTtsApiKey, handleGenerateAll]);

  // Proceed with generation using app credits
  const handleUseAppCredits = useCallback(async () => {
    if (!pendingVoiceoverGeneration) return;

    setIsInsufficientCreditsModalOpen(false);

    if (pendingVoiceoverGeneration.type === 'single' && pendingVoiceoverGeneration.lineId && pendingVoiceoverGeneration.sceneId) {
      await generateAudioForLine(pendingVoiceoverGeneration.lineId, pendingVoiceoverGeneration.sceneId, false); // Use app credits
    } else if (pendingVoiceoverGeneration.type === 'all') {
      await handleGenerateAll(false); // Use app credits
    }

    setPendingVoiceoverGeneration(null);
  }, [pendingVoiceoverGeneration, generateAudioForLine, handleGenerateAll]);

  // Confirm generation from the dialog (for users with own API key or premium users)
  const handleConfirmGenerateAll = useCallback(async () => {
    setIsGenerateAllDialogOpen(false);
    setIsGeneratingAll(true);

    try {
      await handleGenerateAll(true); // Skip credit check, use user's API key
    } finally {
      setIsGeneratingAll(false);
    }
  }, [handleGenerateAll]);

  // Save KIE AI API key handler
  const handleSaveKieApiKey = useCallback(async (
    apiKey: string,
    model: string,
    voiceAssignments?: Array<{ characterId: string; voiceId: string }>
  ): Promise<void> => {
    setIsSavingKieKey(true);

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kieApiKey: apiKey,
          kieTtsModel: model,
          ttsProvider: 'kie',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save API key');
      }

      // Update voice assignments for characters
      if (voiceAssignments && voiceAssignments.length > 0) {
        voiceAssignments.forEach(({ characterId, voiceId }) => {
          const voice = KIE_VOICES.find(v => v.id === voiceId);
          if (voice) {
            // Update character with voice settings
            updateCharacter(project.id, characterId, {
              voiceId,
              voiceName: voice.name,
            });

            // Update project voiceSettings characterVoices
            updateVoiceSettings(project.id, {
              characterVoices: {
                ...(project.voiceSettings?.characterVoices || {}),
                [characterId]: { voiceId, voiceName: voice.name },
              },
            });
          }
        });
      }

      // Update project voice settings to use KIE provider
      updateVoiceSettings(project.id, { provider: 'kie' });

      toast.success('KIE AI API Key uložený', {
        description: 'Generujem hlasový prejav...',
      });

      setIsKieModalOpen(false);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Process pending generation with KIE key (skip credit check by calling original handlers)
      if (pendingVoiceoverGeneration) {
        if (pendingVoiceoverGeneration.type === 'single' && pendingVoiceoverGeneration.lineId && pendingVoiceoverGeneration.sceneId) {
          await generateAudioForLine(pendingVoiceoverGeneration.lineId, pendingVoiceoverGeneration.sceneId, true); // Skip credit check, use KIE key
        } else if (pendingVoiceoverGeneration.type === 'all') {
          await handleGenerateAll(true); // Skip credit check, use KIE key
        }
        setPendingVoiceoverGeneration(null);
      }
    } catch (error) {
      toast.error('Failed to Save API Key', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      setIsSavingKieKey(false);
    }
  }, [pendingVoiceoverGeneration, generateAudioForLine, handleGenerateAll, project, updateCharacter, updateVoiceSettings]);

  return {
    isKieModalOpen,
    setIsKieModalOpen,
    isSavingKieKey,
    isInsufficientCreditsModalOpen,
    setIsInsufficientCreditsModalOpen,
    pendingVoiceoverGeneration,
    isGenerateAllDialogOpen,
    setIsGenerateAllDialogOpen,
    isGeneratingAll,
    getProviderAndModel,
    handleGenerateAudioWithCreditCheck,
    handleGenerateAllWithCreditCheck,
    handleUseAppCredits,
    handleSaveKieApiKey,
    handleConfirmGenerateAll,
  };
}
