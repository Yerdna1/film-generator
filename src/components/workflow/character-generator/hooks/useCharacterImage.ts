import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import type { Character, Project } from '@/types/project';
import type { AspectRatio, ImageResolution } from '@/lib/services/real-costs';
import type { CharacterImageState } from '../types';

export function useCharacterImage(project: Project, aspectRatio: AspectRatio) {
  const { updateCharacter } = useProjectStore();
  const { handleApiResponse } = useCredits();
  const [imageStates, setImageStates] = useState<CharacterImageState>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const generateCharacterImage = useCallback(async (character: Character) => {
    setImageStates((prev) => ({
      ...prev,
      [character.id]: { status: 'generating', progress: 10 },
    }));

    try {
      setImageStates((prev) => ({
        ...prev,
        [character.id]: { status: 'generating', progress: 30 },
      }));

      const imageResolution = project.settings?.imageResolution || '2k';
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: character.masterPrompt,
          aspectRatio,
          resolution: imageResolution,
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        setImageStates((prev) => ({
          ...prev,
          [character.id]: { status: 'idle', progress: 0 },
        }));
        return;
      }

      setImageStates((prev) => ({
        ...prev,
        [character.id]: { status: 'generating', progress: 70 },
      }));

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          await updateCharacter(project.id, character.id, { imageUrl: data.imageUrl });
          console.log(`[Character ${character.name}] Image saved to DB`);
          setImageStates((prev) => ({
            ...prev,
            [character.id]: { status: 'complete', progress: 100 },
          }));
          window.dispatchEvent(new CustomEvent('credits-updated'));
          return;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'API not configured - set GEMINI_API_KEY in settings';
      console.warn('Image generation API failed:', errorData);
      toast.error('Image Generation Failed', {
        description: errorMessage,
        duration: 5000,
      });
      setImageStates((prev) => ({
        ...prev,
        [character.id]: {
          status: 'error',
          progress: 0,
          error: errorMessage
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      console.error('Error generating character image:', error);
      toast.error('Image Generation Failed', {
        description: errorMessage,
        duration: 5000,
      });
      setImageStates((prev) => ({
        ...prev,
        [character.id]: {
          status: 'error',
          progress: 0,
          error: errorMessage
        },
      }));
    }
  }, [project.id, project.settings?.imageResolution, aspectRatio, updateCharacter, handleApiResponse]);

  const handleGenerateAll = useCallback(async () => {
    setIsGeneratingAll(true);
    for (const character of project.characters) {
      if (!character.imageUrl) {
        await generateCharacterImage(character);
      }
    }
    setIsGeneratingAll(false);
  }, [project.characters, generateCharacterImage]);

  const getCharacterStatus = useCallback((characterId: string) => {
    const character = project.characters.find((c) => c.id === characterId);
    if (character?.imageUrl) return 'complete';
    return imageStates[characterId]?.status || 'idle';
  }, [project.characters, imageStates]);

  return {
    imageStates,
    isGeneratingAll,
    generateCharacterImage,
    handleGenerateAll,
    getCharacterStatus,
  };
}
