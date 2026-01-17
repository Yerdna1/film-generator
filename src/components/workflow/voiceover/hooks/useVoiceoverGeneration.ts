import { useState, useCallback } from 'react';
import { toast } from 'sonner';
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
  generateAudioForLine: (lineId: string, sceneId: string, skipCreditCheck?: boolean) => Promise<void>,
  handleGenerateAll: (skipCreditCheck?: boolean) => Promise<void>
) {
  const { updateVoiceSettings, updateCharacter } = useProjectStore();

  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);
  const [pendingVoiceoverGeneration, setPendingVoiceoverGeneration] = useState<PendingGeneration | null>(null);

  // Credit check wrapper for single voiceover generation
  const handleGenerateAudioWithCreditCheck = useCallback(async (lineId: string, sceneId: string) => {
    setPendingVoiceoverGeneration({ type: 'single', lineId, sceneId });
    setIsInsufficientCreditsModalOpen(true);
  }, []);

  // Credit check wrapper for all voiceovers generation
  const handleGenerateAllWithCreditCheck = useCallback(async () => {
    setPendingVoiceoverGeneration({ type: 'all' });
    setIsInsufficientCreditsModalOpen(true);
  }, []);

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
    handleGenerateAudioWithCreditCheck,
    handleGenerateAllWithCreditCheck,
    handleUseAppCredits,
    handleSaveKieApiKey,
  };
}