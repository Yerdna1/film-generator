import { useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import type { Project, AudioVersion, VoiceProvider } from '@/types/project';
import type { DialogueLineWithScene } from '../types';
import { getValidGeminiVoice, getVoiceForProvider, getProviderDisplayName } from '../types';
import type { ItemGenerationState } from '@/lib/constants/workflow';

interface AudioGenerationHookResult {
  generateAudioForLine: (
    lineId: string,
    sceneId: string,
    setAudioStates: React.Dispatch<React.SetStateAction<Record<string, ItemGenerationState>>>,
    skipCreditCheck?: boolean
  ) => Promise<boolean | 'insufficient_credits'>;
  handleGenerateAll: (
    allDialogueLines: DialogueLineWithScene[],
    abortRef: React.MutableRefObject<boolean>,
    setAudioStates: React.Dispatch<React.SetStateAction<Record<string, ItemGenerationState>>>,
    setIsGeneratingAll: (value: boolean) => void,
    skipCreditCheck?: boolean
  ) => Promise<void>;
  stopGeneratingAll: (
    abortRef: React.MutableRefObject<boolean>,
    setIsGeneratingAll: (value: boolean) => void
  ) => void;
}

export function useAudioGeneration(project: Project): AudioGenerationHookResult {
  const { updateScene } = useProjectStore();
  const { handleApiResponse } = useCredits();

  // Return type indicates: true = success, false = failed, 'insufficient_credits' = stop batch
  const generateAudioForLine = useCallback(async (
    lineId: string,
    sceneId: string,
    setAudioStates: React.Dispatch<React.SetStateAction<Record<string, ItemGenerationState>>>,
    skipCreditCheck = false
  ): Promise<boolean | 'insufficient_credits'> => {
    // Read fresh data from store to avoid race conditions when generating multiple lines
    const freshProject = useProjectStore.getState().projects.find(p => p.id === project.id);
    const scene = (freshProject?.scenes || project.scenes || []).find((s) => s.id === sceneId);
    const line = scene?.dialogue?.find((l) => l.id === lineId);
    if (!line) return false;

    const character = (freshProject?.characters || project.characters || []).find((c) => c.id === line.characterId);

    setAudioStates((prev) => ({
      ...prev,
      [lineId]: { status: 'generating', progress: 10 },
    }));

    try {
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: { status: 'generating', progress: 30 },
      }));

      // Use unified TTS endpoint - pass provider from model config or UI selection
      // When skipCreditCheck is true, force provider to 'kie' (user's own API key)
      const modelConfig = freshProject?.modelConfig || project.modelConfig;
      let provider = modelConfig?.tts?.provider || project.voiceSettings?.provider || 'gemini-tts';
      const ttsModel = modelConfig?.tts?.model;
      if (skipCreditCheck) {
        provider = 'kie';
      }

      // Get valid voice for the current provider
      // Returns null if character doesn't have a voice configured for this provider
      const voiceId = getVoiceForProvider(character?.voiceId, provider);

      if (!voiceId) {
        const characterName = character?.name || line.characterName || 'Unknown';
        const providerName = getProviderDisplayName(provider);
        setAudioStates((prev) => ({
          ...prev,
          [lineId]: {
            status: 'error',
            progress: 0,
            error: `${characterName} has no voice for ${providerName}. Open Voice Settings to assign voices.`
          },
        }));
        return false;
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.text,
          voiceName: getValidGeminiVoice(voiceId),
          voiceId,
          language: modelConfig?.tts?.defaultLanguage || project.voiceSettings?.language || 'sk',
          provider,
          ...(ttsModel && { model: ttsModel }), // Include TTS model if specified
          projectId: project.id,
          skipCreditCheck, // Pass skipCreditCheck to API
          // Voice customization settings
          voiceInstructions: character?.voiceInstructions,
          voiceStability: character?.voiceStability,
          voiceSimilarityBoost: character?.voiceSimilarityBoost,
          voiceStyle: character?.voiceStyle,
        }),
      });

      // Only check credits if not skipping credit check (user using own API key)
      if (!skipCreditCheck) {
        const isInsufficientCredits = await handleApiResponse(response);
        if (isInsufficientCredits) {
          setAudioStates((prev) => ({
            ...prev,
            [lineId]: { status: 'idle', progress: 0 },
          }));
          return 'insufficient_credits';
        }
      }

      setAudioStates((prev) => ({
        ...prev,
        [lineId]: { status: 'generating', progress: 70 },
      }));

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          // CRITICAL: Read fresh scene data from store before updating to avoid race conditions
          // When generating multiple lines, each update must use the latest scene state
          const currentProject = useProjectStore.getState().projects.find(p => p.id === project.id);
          const currentScene = (currentProject?.scenes || project.scenes || []).find((s) => s.id === sceneId);

          if (!currentScene?.dialogue) {
            console.error('Scene not found for audio update:', sceneId);
            return false;
          }

          const usedProvider = project.voiceSettings?.provider || 'gemini-tts';
          const usedLanguage = project.voiceSettings?.language || 'sk';

          // Create new audio version entry
          const newVersion: AudioVersion = {
            audioUrl: data.audioUrl,
            provider: usedProvider as VoiceProvider,
            language: usedLanguage,
            voiceId: character?.voiceId,
            voiceName: character?.voiceName,
            duration: data.duration,
            createdAt: new Date().toISOString(),
          };

          const updatedDialogue = currentScene.dialogue.map((d) => {
            if (d.id !== lineId) return d;

            // Add new version to audioVersions array (or create it)
            const existingVersions = d.audioVersions || [];
            // Check if we already have this provider+language combo and update it
            const versionKey = `${usedProvider}_${usedLanguage}`;
            const filteredVersions = existingVersions.filter(
              (v) => `${v.provider}_${v.language}` !== versionKey
            );

            return {
              ...d,
              audioUrl: data.audioUrl,
              audioDuration: data.duration,
              ttsProvider: usedProvider,
              audioVersions: [...filteredVersions, newVersion],
            };
          });

          updateScene(project.id, sceneId, { dialogue: updatedDialogue });

          setAudioStates((prev) => ({
            ...prev,
            [lineId]: { status: 'complete', progress: 100 },
          }));
          window.dispatchEvent(new CustomEvent('credits-updated'));
          return true;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      console.warn('TTS API failed:', errorData);
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: {
          status: 'error',
          progress: 0,
          error: errorData.error || 'TTS API not configured - check Settings'
        },
      }));
      return false;
    } catch (error) {
      console.error('Error generating audio:', error);
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Generation failed'
        },
      }));
      return false;
    }
  }, [project, updateScene, handleApiResponse]);

  const handleGenerateAll = useCallback(async (
    allDialogueLines: DialogueLineWithScene[],
    abortRef: React.MutableRefObject<boolean>,
    setAudioStates: React.Dispatch<React.SetStateAction<Record<string, ItemGenerationState>>>,
    setIsGeneratingAll: (value: boolean) => void,
    skipCreditCheck = false
  ) => {
    abortRef.current = false;  // Reset abort flag
    setIsGeneratingAll(true);

    // Get current provider+language to check for existing versions
    const currentProvider = project.voiceSettings?.provider || 'gemini-tts';
    const currentLanguage = project.voiceSettings?.language || 'sk';
    const versionKey = `${currentProvider}_${currentLanguage}`;

    for (let i = 0; i < allDialogueLines.length; i++) {
      if (abortRef.current) {
        console.log('TTS generation stopped by user');
        break;
      }
      const line = allDialogueLines[i];

      // Check if THIS provider+language version already exists (not just any audio)
      const hasThisVersion = line.audioVersions?.some(
        v => `${v.provider}_${v.language}` === versionKey
      );

      if (!hasThisVersion) {
        console.log(`[TTS] Generating ${i + 1}/${allDialogueLines.length}: ${line.id}`);
        const result = await generateAudioForLine(line.id, line.sceneId, setAudioStates, skipCreditCheck);
        // Stop batch generation if insufficient credits
        if (result === 'insufficient_credits') {
          console.log('TTS generation stopped: insufficient credits');
          break;
        }
        // Add delay between requests to avoid rate limits
        // Gemini: ~10 req/min (6s), OpenAI: generous (2s), ElevenLabs: moderate (3s)
        if (i < allDialogueLines.length - 1 && !abortRef.current) {
          const delay = currentProvider === 'gemini-tts' ? 5000
            : currentProvider === 'elevenlabs' ? 3000
              : currentProvider === 'openai-tts' ? 2000
                : 3000; // Modal or other
          console.log(`[TTS] Waiting ${delay / 1000}s before next request...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        console.log(`[TTS] Skipping ${i + 1}/${allDialogueLines.length}: already has ${versionKey} version`);
      }
    }
    setIsGeneratingAll(false);
  }, [generateAudioForLine, project.voiceSettings?.provider, project.voiceSettings?.language]);

  // Stop batch TTS generation
  const stopGeneratingAll = useCallback(
    (abortRef: React.MutableRefObject<boolean>, setIsGeneratingAll: (value: boolean) => void) => {
      abortRef.current = true;
      setIsGeneratingAll(false);
    },
    []
  );

  return {
    generateAudioForLine,
    handleGenerateAll,
    stopGeneratingAll,
  };
}
