'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/hooks';
import { getImageCreditCost } from '@/lib/services/credits';
import type { Character } from '@/types/project';
import type { AspectRatio, ImageResolution } from '@/lib/services/real-costs';
import {
  Step2Props,
  MAX_CHARACTERS,
  CharacterFormData,
  EditCharacterData,
} from '../character-generator/types';
import { useCharacterImage } from '../character-generator/hooks';

// Hooks
import {
  useCharacterManagement,
  useApiKeyManagement,
} from './hooks';

// Components
import {
  CharacterHeader,
  CharacterList,
  CharacterModals,
} from './components';
import { PaymentMethodToggle } from '../PaymentMethodToggle';
import { StepApiKeyButton } from '../StepApiKeyButton';

export function Step2CharacterGenerator({ project: initialProject, isReadOnly = false }: Step2Props) {
  const t = useTranslations();
  const { updateSettings, projects, userConstants } = useProjectStore();
  const { data: creditsData } = useCredits();

  // Get live project data from store, but prefer initialProject for full data
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.characters ? storeProject : initialProject;

  // Safe accessors
  const characters = project.characters || [];
  const settings = project.settings || { imageResolution: '2k' };

  // State
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);
  const [editCharacterData, setEditCharacterData] = useState<EditCharacterData | null>(null);
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);

  // Use model configuration for character generation
  const modelConfig = project.modelConfig;
  const characterAspectRatio = (modelConfig?.image?.characterAspectRatio || userConstants?.characterAspectRatio || '1:1') as AspectRatio;
  const characterImageProvider = (modelConfig?.image?.provider || userConstants?.characterImageProvider || 'gemini') as 'gemini' | 'modal' | 'modal-edit' | 'kie';
  const characterImageModel = modelConfig?.image?.model || 'seedream/4-5-text-to-image';

  // Check if project is configured to use KIE with an API key
  // When a project uses KIE provider, it means the user has configured their API key for it
  const projectHasKieApiKey = modelConfig?.image?.provider === 'kie';

  // Custom hooks
  const {
    handleAddCharacter,
    handleUpdateCharacter,
    handleDeleteCharacter,
  } = useCharacterManagement(project.id, project.style);

  const {
    userApiKeys,
    isKieModalOpen,
    setIsKieModalOpen,
    isSavingKieKey,
    pendingCharacterGeneration,
    setPendingCharacterGeneration,
    modalReason,
    setModalReason,
    handleSaveKieApiKey: saveKieApiKey,
  } = useApiKeyManagement();

  const {
    imageStates,
    isGeneratingAll,
    isGeneratingSingle,
    generationProgress,
    generatingCharacterName,
    generateCharacterImage,
    handleGenerateAll,
    getCharacterStatus,
  } = useCharacterImage(project, characterAspectRatio, characterImageProvider, characterImageModel);

  // Count generated images
  const generatedCount = characters.filter(char => !!char.imageUrl).length;

  // Calculate credits needed for KIE provider
  const creditsNeeded = getImageCreditCost((settings.imageResolution || '2k') as ImageResolution);

  // Add character handler
  const handleAddCharacterWithImage = useCallback(async (data: CharacterFormData) => {
    const newCharacter = await handleAddCharacter(data);
    setIsAddingCharacter(false);

    // Determine image provider
    const shouldGenerateWithKie = characterImageProvider === 'kie';

    // Update settings if needed
    if (settings.imageResolution !== '2k') {
      updateSettings(project.id, { imageResolution: '2k' });
    }

    // Generate image based on provider
    if (shouldGenerateWithKie) {
      // Check if user has KIE API key configured either globally or for this project
      const hasKieApiKey = userApiKeys?.hasKieKey || projectHasKieApiKey;

      // Only show modal if we've confirmed user doesn't have a key
      if (!projectHasKieApiKey && userApiKeys !== null && !userApiKeys.hasKieKey) {
        setModalReason('no-key');
        setIsKieModalOpen(true);
        setPendingCharacterGeneration(newCharacter);
        return;
      }

      // Only check credits if user doesn't have their own KIE API key
      if (!hasKieApiKey) {
        const hasCredits = creditsData && creditsData.credits.balance >= creditsNeeded;
        if (!hasCredits) {
          setModalReason('insufficient-credits');
          setIsInsufficientCreditsModalOpen(true);
          setPendingCharacterGeneration(newCharacter);
          return;
        }
      }

      // Generate with KIE
      await generateCharacterImage(newCharacter);
    } else {
      // Generate with default provider
      generateCharacterImage(newCharacter);
    }
  }, [
    handleAddCharacter,
    characterImageProvider,
    characterAspectRatio,
    characterImageModel,
    settings.imageResolution,
    updateSettings,
    project.id,
    userApiKeys?.hasKieKey,
    projectHasKieApiKey,
    creditsData,
    creditsNeeded,
    generateCharacterImage,
    setModalReason,
    setIsKieModalOpen,
    setPendingCharacterGeneration,
    setIsInsufficientCreditsModalOpen,
  ]);

  // Generate single character image
  const handleGenerateCharacterImage = useCallback(async (character: Character) => {
    if (!character.masterPrompt) return;

    if (characterImageProvider === 'kie') {
      // Check if user has KIE API key configured either globally or for this project
      const hasKieApiKey = userApiKeys?.hasKieKey || projectHasKieApiKey;

      // Only show modal if we've confirmed user doesn't have a key
      if (!projectHasKieApiKey && userApiKeys !== null && !userApiKeys.hasKieKey) {
        setModalReason('no-key');
        setIsKieModalOpen(true);
        setPendingCharacterGeneration(character);
        return;
      }

      // Only check credits if user doesn't have their own KIE API key
      // If they have their own key, they're paying KIE directly, not using platform credits
      if (!hasKieApiKey) {
        const hasCredits = creditsData && creditsData.credits.balance >= creditsNeeded;
        if (!hasCredits) {
          setModalReason('insufficient-credits');
          setIsInsufficientCreditsModalOpen(true);
          setPendingCharacterGeneration(character);
          return;
        }
      }
    }

    generateCharacterImage(character);
  }, [
    characterImageProvider,
    characterAspectRatio,
    characterImageModel,
    userApiKeys?.hasKieKey,
    projectHasKieApiKey,
    creditsData,
    creditsNeeded,
    generateCharacterImage,
    setModalReason,
    setIsKieModalOpen,
    setPendingCharacterGeneration,
    setIsInsufficientCreditsModalOpen,
  ]);

  // Generate all images with credit check
  const handleGenerateAllWithCheck = useCallback(async () => {
    // Check if user has KIE API key configured either globally or for this project
    const hasKieApiKey = userApiKeys?.hasKieKey || projectHasKieApiKey;

    // Only check credits if user doesn't have their own KIE API key
    if (characterImageProvider === 'kie' && !hasKieApiKey) {
      const totalCreditsNeeded = characters.filter(c => !c.imageUrl).length * creditsNeeded;
      const hasEnoughCredits = creditsData && creditsData.credits.balance >= totalCreditsNeeded;

      if (!hasEnoughCredits) {
        setModalReason('insufficient-credits');
        setIsInsufficientCreditsModalOpen(true);
        return;
      }
    }

    await handleGenerateAll();
  }, [
    characters,
    creditsNeeded,
    creditsData,
    characterImageProvider,
    characterAspectRatio,
    characterImageModel,
    handleGenerateAll,
    userApiKeys?.hasKieKey,
    projectHasKieApiKey,
    setModalReason,
    setIsInsufficientCreditsModalOpen,
  ]);

  // Save KIE API key and continue generation
  const handleSaveKieApiKey = async (apiKey: string, model: string): Promise<void> => {
    await saveKieApiKey(apiKey, model);

    if (pendingCharacterGeneration) {
      await generateCharacterImage(pendingCharacterGeneration);
    }
  };

  // Use app credits for generation
  const handleUseAppCredits = useCallback(() => {
    setIsInsufficientCreditsModalOpen(false);
    if (pendingCharacterGeneration) {
      generateCharacterImage(pendingCharacterGeneration);
      setPendingCharacterGeneration(null);
    }
  }, [
    pendingCharacterGeneration,
    characterImageProvider,
    characterAspectRatio,
    characterImageModel,
    generateCharacterImage,
    setPendingCharacterGeneration,
    setIsInsufficientCreditsModalOpen,
  ]);

  // Upload image handler
  const handleUploadImage = useCallback(async (character: Character, file: File) => {
    // TODO: Implement uploadImage
    console.log('Upload image not implemented yet', character.id, file);
  }, []);

  // Select image handler
  const handleSelectImage = useCallback((character: Character, imageIndex: number) => {
    // TODO: Implement image selection when multiple images are supported
    console.log('Image selection not implemented yet', character.id, imageIndex);
  }, []);

  // Edit character handlers
  const handleEditCharacter = useCallback((characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    if (character) {
      setEditCharacterData({
        name: character.name,
        description: character.description,
        visualDescription: character.visualDescription,
        personality: character.personality,
        masterPrompt: character.masterPrompt,
      });
      setEditingCharacter(characterId);
    }
  }, [characters]);

  const handleSaveEdit = useCallback((characterId: string, data: EditCharacterData) => {
    handleUpdateCharacter(characterId, data);
    setEditingCharacter(null);
    setEditCharacterData(null);
  }, [handleUpdateCharacter]);

  return (
    <div className="space-y-6">
      {/* API Key Configuration Button */}
      <StepApiKeyButton operation="image" stepName="Step 2 - Character Generator" />

      {/* Payment Method Toggle */}
      {!isReadOnly && (
        <PaymentMethodToggle
          operation="image"
          className="mb-2"
        />
      )}

      <CharacterHeader
        characters={characters}
        maxCharacters={MAX_CHARACTERS}
        isGeneratingAll={isGeneratingAll}
        generatedCount={generatedCount}
        isReadOnly={isReadOnly}
        onAddCharacter={() => setIsAddingCharacter(true)}
        onGenerateAll={handleGenerateAllWithCheck}
        onStopGenerating={() => {}}
      />

      <CharacterList
        project={project}
        characters={characters}
        imageStates={imageStates}
        isReadOnly={isReadOnly}
        characterAspectRatio={characterAspectRatio}
        onEdit={(character) => handleEditCharacter(character.id)}
        onDelete={(characterId) => handleDeleteCharacter(characterId, characters.find(c => c.id === characterId)?.name || '')}
        onPreviewImage={setPreviewImage}
        onGenerateImage={handleGenerateCharacterImage}
        onRegeneratePrompt={(character) => {
          // TODO: Implement regenerate prompt
        }}
        onUploadImage={handleUploadImage}
      />

      <CharacterModals
        // Add Character
        isAddingCharacter={isAddingCharacter}
        onCloseAddDialog={() => setIsAddingCharacter(false)}
        onAddCharacter={handleAddCharacterWithImage}
        characterImageProvider={characterImageProvider}

        // Edit Character
        editingCharacterId={editingCharacter}
        editCharacterData={editCharacterData}
        onCloseEditDialog={() => {
          setEditingCharacter(null);
          setEditCharacterData(null);
        }}
        onSaveEdit={handleSaveEdit}

        // Image Preview
        previewImage={previewImage}
        onClosePreview={() => setPreviewImage(null)}

        // Copy Prompts
        showPromptsDialog={showPromptsDialog}
        characters={characters}
        onCloseCopyPrompts={() => setShowPromptsDialog(false)}

        // Loading
        isGeneratingSingle={isGeneratingSingle}
        generatingCharacterName={generatingCharacterName}

        // KIE Modal
        isKieModalOpen={isKieModalOpen}
        isSavingKieKey={isSavingKieKey}
        onCloseKieModal={() => setIsKieModalOpen(false)}
        onSaveKieApiKey={handleSaveKieApiKey}

        // Insufficient Credits
        isInsufficientCreditsModalOpen={isInsufficientCreditsModalOpen}
        onCloseInsufficientCredits={() => setIsInsufficientCreditsModalOpen(false)}
        onOpenKieModal={() => {
          setIsInsufficientCreditsModalOpen(false);
          setIsKieModalOpen(true);
        }}
        onUseAppCredits={handleUseAppCredits}
        creditsNeeded={creditsNeeded}
        currentCredits={creditsData?.credits.balance}
      />
    </div>
  );
}