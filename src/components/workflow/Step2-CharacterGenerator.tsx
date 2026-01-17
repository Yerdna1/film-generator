'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useProjectStore } from '@/lib/stores/project-store';
import { generateCharacterPrompt } from '@/lib/prompts/master-prompt';
import { useCredits } from '@/hooks';
import { getImageCreditCost } from '@/lib/services/credits';
import type { Character } from '@/types/project';
import type { AspectRatio } from '@/lib/services/real-costs';
import {
  Step2Props,
  MAX_CHARACTERS,
  CharacterFormData,
  EditCharacterData,
} from './character-generator/types';
import { useCharacterImage } from './character-generator/hooks';
import {
  CharacterCard,
  AddCharacterDialog,
  EditCharacterDialog,
  ImagePreviewModal,
  CopyPromptsDialog,
  CharacterProgress,
  CharacterImageLoadingModal,
  KieApiKeyModal,
  InsufficientCreditsModal,
} from './character-generator/components';

export function Step2CharacterGenerator({ project: initialProject, isReadOnly = false }: Step2Props) {
  const t = useTranslations();
  const { data: session } = useSession();
  const { addCharacter, updateCharacter, deleteCharacter, updateSettings, projects, userConstants, updateUserConstants } = useProjectStore();
  const { data: creditsData } = useCredits();

  // Get live project data from store, but prefer initialProject for full data (characters array)
  // Store may contain summary data without characters
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.characters ? storeProject : initialProject;

  // Safe accessors for arrays that may be undefined in summary data
  const characters = project.characters || [];
  const settings = project.settings || { imageResolution: '2k' };

  // State
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);
  const [editCharacterData, setEditCharacterData] = useState<EditCharacterData | null>(null);

  // KIE API key modal state
  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);
  const [userApiKeys, setUserApiKeys] = useState<{
    hasKieKey: boolean;
    kieImageModel: string;
  } | null>(null);
  const [pendingCharacterGeneration, setPendingCharacterGeneration] = useState<Character | null>(null);
  const [modalReason, setModalReason] = useState<'no-key' | 'insufficient-credits'>('no-key');

  // Insufficient credits modal state
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);

  // Fetch user's API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!session) return;
      try {
        const res = await fetch('/api/user/api-keys');
        if (res.ok) {
          const data = await res.json();
          setUserApiKeys({
            hasKieKey: data.hasKieKey || false,
            kieImageModel: data.kieImageModel || 'seedream/4-5-text-to-image',
          });
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      }
    };
    fetchApiKeys();
  }, [session]);

  // Use user constants for character generation, fallback to defaults
  const characterAspectRatio = (userConstants?.characterAspectRatio || '1:1') as AspectRatio;
  const characterImageProvider = (userConstants?.characterImageProvider || 'gemini') as 'gemini' | 'modal' | 'modal-edit' | 'kie';

  // Custom hook for image generation
  const {
    imageStates,
    isGeneratingAll,
    isGeneratingSingle,
    generationProgress,
    generatingCharacterName,
    generateCharacterImage,
    handleGenerateAll,
  } = useCharacterImage(project, characterAspectRatio, characterImageProvider);

  // Handlers
  const handleAddCharacter = (data: CharacterFormData) => {
    if (!data.name.trim()) return;

    const masterPrompt = generateCharacterPrompt(
      {
        name: data.name,
        description: data.description,
        visualDescription: data.visualDescription,
      },
      project.style
    );

    addCharacter(project.id, {
      name: data.name,
      description: data.description,
      visualDescription: data.visualDescription,
      personality: data.personality,
      masterPrompt,
    });

    setIsAddingCharacter(false);
  };

  const regeneratePrompt = (character: Character) => {
    const masterPrompt = generateCharacterPrompt(character, project.style);
    updateCharacter(project.id, character.id, { masterPrompt });
  };

  const startEditCharacter = (character: Character) => {
    setEditCharacterData({
      name: character.name,
      description: character.description || '',
      visualDescription: character.visualDescription || '',
      personality: character.personality || '',
      masterPrompt: character.masterPrompt,
    });
    setEditingCharacter(character.id);
  };

  const saveEditCharacter = () => {
    if (!editingCharacter || !editCharacterData) return;

    const newMasterPrompt = generateCharacterPrompt(
      {
        name: editCharacterData.name,
        description: editCharacterData.description,
        visualDescription: editCharacterData.visualDescription,
      },
      project.style
    );

    updateCharacter(project.id, editingCharacter, {
      name: editCharacterData.name,
      description: editCharacterData.description,
      visualDescription: editCharacterData.visualDescription,
      personality: editCharacterData.personality,
      masterPrompt: editCharacterData.masterPrompt !== newMasterPrompt ? editCharacterData.masterPrompt : newMasterPrompt,
    });

    setEditingCharacter(null);
    setEditCharacterData(null);
  };

  const cancelEditCharacter = () => {
    setEditingCharacter(null);
    setEditCharacterData(null);
  };

  // Wrapper for image generation - shows Insufficient Credits modal with KIE option
  const handleGenerateCharacterImage = useCallback(async (character: Character) => {
    // Always show the Insufficient Credits modal first, giving users the choice:
    // - Use their app credits (if they have enough)
    // - Or use their own KIE AI key (bypasses app credits)
    setPendingCharacterGeneration(character);
    setIsInsufficientCreditsModalOpen(true);
  }, []);

  // Wrapper for "Generate All" - checks KIE key before starting batch
  const handleGenerateAllWithCheck = useCallback(async () => {
    // Check if user has KIE API key for image generation
    const needsKieKey = !userApiKeys?.hasKieKey && characterImageProvider === 'kie';

    if (needsKieKey) {
      // For "Generate All", show modal but don't set a specific pending character
      setIsKieModalOpen(true);
      return;
    }

    await handleGenerateAll();
  }, [userApiKeys?.hasKieKey, characterImageProvider, handleGenerateAll]);

  // Save KIE API key handler
  const handleSaveKieApiKey = async (apiKey: string, model: string): Promise<void> => {
    setIsSavingKieKey(true);

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kieApiKey: apiKey,
          kieImageModel: model,
          imageProvider: 'kie',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save API key');
      }

      // Update local state and userConstants
      setUserApiKeys(prev => prev ? { ...prev, hasKieKey: true, kieImageModel: model } : null);
      updateUserConstants({ characterImageProvider: 'kie' });

      toast.success('KIE AI API Key Saved', {
        description: 'Generating character images...',
      });

      setIsKieModalOpen(false);

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate the pending character image (individual generation) or all (batch)
      if (pendingCharacterGeneration) {
        // Direct API call with skipCreditCheck since user is using their own KIE key
        const imageResolution = project.settings?.imageResolution || '2k';
        const apiResponse = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: pendingCharacterGeneration.masterPrompt,
            aspectRatio: characterAspectRatio,
            resolution: imageResolution,
            imageProvider: 'kie',
            projectId: project.id,
            skipCreditCheck: true, // Bypass credit check - using user's KIE credits
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          if (data.imageUrl) {
            await updateCharacter(project.id, pendingCharacterGeneration.id, { imageUrl: data.imageUrl });
            toast.success('Image Generated', {
              description: `Character image for ${pendingCharacterGeneration.name} saved`,
            });
          }
        } else {
          const error = await apiResponse.json();
          const errorMessage = error.error || 'Failed to generate image';

          // Special handling for KIE AI quota exceeded error
          if (errorMessage.includes('exceeded the total limit') || errorMessage.includes('points used')) {
            toast.error('KIE AI Credits Exhausted', {
              description: 'Your KIE AI account has run out of credits. Please top up at kie.ai to continue generating images.',
              duration: 8000,
            });
          } else {
            toast.error('Generation Failed', {
              description: errorMessage,
            });
          }
        }

        setPendingCharacterGeneration(null);
      } else {
        // No pending character means "Generate All" was clicked
        await handleGenerateAll();
      }
    } catch (error) {
      toast.error('Failed to Save API Key', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      setIsSavingKieKey(false);
    }
  };

  // Handle image upload
  const handleUploadImage = useCallback(async (character: Character, file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid File', {
        description: 'Please upload an image file (PNG, JPG, etc.)',
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File Too Large', {
        description: 'Please upload an image smaller than 10MB',
      });
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        updateCharacter(project.id, character.id, { imageUrl: base64 });
        toast.success('Image Uploaded', {
          description: `Custom image set for ${character.name}`,
        });
      };
      reader.onerror = () => {
        toast.error('Upload Failed', {
          description: 'Failed to read the image file',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Upload Failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }, [project.id, updateCharacter]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4">
      {/* Characters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {characters.map((character, index) => (
          <motion.div
            key={character.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CharacterCard
              character={character}
              project={project}
              imageState={imageStates[character.id]}
              isReadOnly={isReadOnly}
              onEdit={startEditCharacter}
              onDelete={(id) => deleteCharacter(project.id, id)}
              onGenerateImage={handleGenerateCharacterImage}
              onRegeneratePrompt={regeneratePrompt}
              onPreviewImage={setPreviewImage}
              onUploadImage={handleUploadImage}
              characterAspectRatio={characterAspectRatio}
            />
          </motion.div>
        ))}

        {/* Add Character Card - only for editors */}
        {!isReadOnly && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: characters.length * 0.1 }}
          >
            <AddCharacterDialog
              open={isAddingCharacter}
              onOpenChange={setIsAddingCharacter}
              onAddCharacter={handleAddCharacter}
              currentCount={characters.length}
              maxCount={MAX_CHARACTERS}
            />
          </motion.div>
        )}
      </div>

      {/* Progress & Quick Actions - only for editors */}
      {!isReadOnly && (
        <CharacterProgress
          characters={characters}
          isGeneratingAll={isGeneratingAll}
          imageResolution={settings.imageResolution || '2k'}
          onGenerateAll={handleGenerateAllWithCheck}
        />
      )}

      {/* Edit Character Dialog */}
      <EditCharacterDialog
        open={editingCharacter !== null}
        onOpenChange={(open) => !open && cancelEditCharacter()}
        editData={editCharacterData}
        onEditDataChange={setEditCharacterData}
        onSave={saveEditCharacter}
        onCancel={cancelEditCharacter}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Copy Prompts for Gemini Dialog */}
      <CopyPromptsDialog
        open={showPromptsDialog}
        onOpenChange={setShowPromptsDialog}
        characters={characters}
      />

      {/* Character Image Generation Loading Modal */}
      <CharacterImageLoadingModal
        isOpen={isGeneratingAll || isGeneratingSingle}
        current={generationProgress.current}
        total={generationProgress.total}
        characterName={generatingCharacterName}
      />

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={isInsufficientCreditsModalOpen}
        onClose={() => setIsInsufficientCreditsModalOpen(false)}
        onOpenKieModal={() => {
          setIsInsufficientCreditsModalOpen(false);
          setIsKieModalOpen(true);
        }}
        onUseAppCredits={async () => {
          if (pendingCharacterGeneration) {
            await generateCharacterImage(pendingCharacterGeneration);
            setPendingCharacterGeneration(null);
          }
        }}
        creditsNeeded={getImageCreditCost(project.settings?.imageResolution || '2k')}
        currentCredits={creditsData?.credits.balance}
      />

      {/* KIE AI API Key Modal */}
      <KieApiKeyModal
        isOpen={isKieModalOpen}
        onClose={() => setIsKieModalOpen(false)}
        onSave={handleSaveKieApiKey}
        isLoading={isSavingKieKey}
      />
    </div>
  );
}
