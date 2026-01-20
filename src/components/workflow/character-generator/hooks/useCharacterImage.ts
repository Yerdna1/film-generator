import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { getUserPermissions, checkRequiredApiKeys, shouldUseOwnApiKeys } from '@/lib/client/user-permissions';
import type { Character, Project } from '@/types/project';
import type { AspectRatio, ImageResolution } from '@/lib/services/real-costs';
import type { ImageProvider } from '@/types/project';
import type { CharacterImageState } from '../types';
import { GenerateImageDialog } from '../components/GenerateImageDialog';

export function useCharacterImage(project: Project, aspectRatio: AspectRatio, provider: ImageProvider = 'gemini', model?: string) {
  const { updateCharacter } = useProjectStore();
  const { handleApiResponse } = useCredits();
  const { showApiKeyModal } = useApiKeys();
  const [imageStates, setImageStates] = useState<CharacterImageState>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [generatingCharacterName, setGeneratingCharacterName] = useState<string>('');

  // Dialog state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState<Character | null>(null);

  // Request to generate image (shows dialog first)
  const requestGenerateCharacterImage = useCallback((character: Character) => {
    setPendingCharacter(character);
    setShowGenerateDialog(true);
  }, []);

  // Actually generate the image (after dialog confirmation)
  const confirmGenerateImage = useCallback(async () => {
    if (!pendingCharacter) return;

    setShowGenerateDialog(false);
    setIsGeneratingSingle(true);
    setGeneratingCharacterName(pendingCharacter.name);
    setGenerationProgress({ current: 0, total: 1 });

    setImageStates((prev) => ({
      ...prev,
      [pendingCharacter.id]: { status: 'generating', progress: 10 },
    }));

    try {
      // Check user permissions and API keys
      const permissions = await getUserPermissions();
      const useOwnKeys = await shouldUseOwnApiKeys('image');

      if (useOwnKeys || permissions.requiresApiKeys) {
        const keyCheck = await checkRequiredApiKeys('image');

        if (!keyCheck.hasKeys) {
          // Reset states
          setImageStates((prev) => ({
            ...prev,
            [pendingCharacter.id]: { status: 'idle', progress: 0 },
          }));
          setIsGeneratingSingle(false);
          setGeneratingCharacterName('');
          setGenerationProgress({ current: 0, total: 0 });

          // Show API key modal
          showApiKeyModal({
            operation: 'image',
            missingKeys: keyCheck.missing,
            onSuccess: () => {
              // Retry generation after keys are saved
              requestGenerateCharacterImage(pendingCharacter);
            }
          });
          return;
        }
      }
      setImageStates((prev) => ({
        ...prev,
        [pendingCharacter.id]: { status: 'generating', progress: 30 },
      }));

      const imageResolution = project.modelConfig?.image?.sceneResolution || project.settings?.imageResolution || '2k';
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: pendingCharacter.masterPrompt,
          aspectRatio,
          resolution: imageResolution,
          imageProvider: provider,
          ...(model && { model }), // Include model if provided
          projectId: project.id,
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        setImageStates((prev) => ({
          ...prev,
          [pendingCharacter.id]: { status: 'idle', progress: 0 },
        }));
        setIsGeneratingSingle(false);
        setGenerationProgress({ current: 0, total: 0 });
        return;
      }

      setImageStates((prev) => ({
        ...prev,
        [pendingCharacter.id]: { status: 'generating', progress: 70 },
      }));

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          await updateCharacter(project.id, pendingCharacter.id, { imageUrl: data.imageUrl });
          console.log(`[Character ${pendingCharacter.name}] Image saved to DB`);
          setImageStates((prev) => ({
            ...prev,
            [pendingCharacter.id]: { status: 'complete', progress: 100 },
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
        [pendingCharacter.id]: {
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
        [pendingCharacter.id]: {
          status: 'error',
          progress: 0,
          error: errorMessage
        },
      }));
    } finally {
      setIsGeneratingSingle(false);
      setTimeout(() => setGenerationProgress({ current: 0, total: 0 }), 500);
      setPendingCharacter(null);
    }
  }, [pendingCharacter, project.id, project.settings?.imageResolution, aspectRatio, provider, model, updateCharacter, handleApiResponse, requestGenerateCharacterImage]);

  // Direct generate without dialog (for programmatic use)
  const generateCharacterImage = useCallback(async (character: Character) => {
    setPendingCharacter(character);
    await confirmGenerateImage();
  }, [confirmGenerateImage]);

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
    requestGenerateCharacterImage,
    confirmGenerateImage,
    handleGenerateAll,
    getCharacterStatus,
    showGenerateDialog,
    setShowGenerateDialog,
  };
}
