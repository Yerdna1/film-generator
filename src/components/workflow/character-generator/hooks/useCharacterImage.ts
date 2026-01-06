import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import type { Character, Project } from '@/types/project';
import type { AspectRatio, ImageResolution } from '@/lib/services/real-costs';
import type { ImageProvider } from '@/types/project';
import type { CharacterImageState } from '../types';

export function useCharacterImage(project: Project, aspectRatio: AspectRatio, provider: ImageProvider = 'gemini') {
  const { updateCharacter } = useProjectStore();
  const { handleApiResponse } = useCredits();
  const [imageStates, setImageStates] = useState<CharacterImageState>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [generatingCharacterName, setGeneratingCharacterName] = useState<string>('');

  const generateCharacterImage = useCallback(async (character: Character) => {
    setIsGeneratingSingle(true);
    setGeneratingCharacterName(character.name);
    setGenerationProgress({ current: 0, total: 1 });

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
          imageProvider: provider,
          projectId: project.id,
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        setImageStates((prev) => ({
          ...prev,
          [character.id]: { status: 'idle', progress: 0 },
        }));
        setIsGeneratingSingle(false);
        setGenerationProgress({ current: 0, total: 0 });
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
          setGenerationProgress({ current: 1, total: 1 });
          window.dispatchEvent(new CustomEvent('credits-updated'));
          setIsGeneratingSingle(false);
          setTimeout(() => setGenerationProgress({ current: 0, total: 0 }), 500);
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
    } finally {
      setIsGeneratingSingle(false);
      setTimeout(() => setGenerationProgress({ current: 0, total: 0 }), 500);
    }
  }, [project.id, project.settings?.imageResolution, aspectRatio, provider, updateCharacter, handleApiResponse]);

  const handleGenerateAll = useCallback(async () => {
    const charactersWithoutImages = project.characters.filter((c) => !c.imageUrl);
    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: charactersWithoutImages.length });

    for (let i = 0; i < charactersWithoutImages.length; i++) {
      await generateCharacterImage(charactersWithoutImages[i]);
      setGenerationProgress({ current: i + 1, total: charactersWithoutImages.length });
    }

    setIsGeneratingAll(false);
    setGenerationProgress({ current: 0, total: 0 });
  }, [project.characters, generateCharacterImage]);

  const getCharacterStatus = useCallback((characterId: string) => {
    const character = project.characters.find((c) => c.id === characterId);
    if (character?.imageUrl) return 'complete';
    return imageStates[characterId]?.status || 'idle';
  }, [project.characters, imageStates]);

  return {
    imageStates,
    isGeneratingAll,
    isGeneratingSingle,
    generationProgress,
    generatingCharacterName,
    generateCharacterImage,
    handleGenerateAll,
    getCharacterStatus,
  };
}
