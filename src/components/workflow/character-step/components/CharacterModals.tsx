import {
  AddCharacterDialog,
  EditCharacterDialog,
  ImagePreviewModal,
  CopyPromptsDialog,
  KieApiKeyModal,
  InsufficientCreditsModal,
} from '../../character-generator/components';
import { LoadingModal } from '../../shared';
import type { Character } from '@/types/project';
import type { CharacterFormData, EditCharacterData } from '../../character-generator/types';
import type { AspectRatio } from '@/lib/services/real-costs';

interface CharacterModalsProps {
  // Add Character Dialog
  isAddingCharacter: boolean;
  onCloseAddDialog: () => void;
  onAddCharacter: (data: CharacterFormData) => void;
  characterImageProvider: 'gemini' | 'modal' | 'modal-edit' | 'kie';

  // Edit Character Dialog
  editingCharacterId: string | null;
  editCharacterData: EditCharacterData | null;
  onCloseEditDialog: () => void;
  onSaveEdit: (characterId: string, data: EditCharacterData) => void;

  // Image Preview Modal
  previewImage: string | null;
  onClosePreview: () => void;

  // Copy Prompts Dialog
  showPromptsDialog: boolean;
  characters: Character[];
  onCloseCopyPrompts: () => void;

  // Loading Modal
  isGeneratingSingle: boolean;
  generatingCharacterName: string | null;

  // KIE API Key Modal
  isKieModalOpen: boolean;
  isSavingKieKey: boolean;
  onCloseKieModal: () => void;
  onSaveKieApiKey: (apiKey: string, model: string) => Promise<void>;

  // Insufficient Credits Modal
  isInsufficientCreditsModalOpen: boolean;
  onCloseInsufficientCredits: () => void;
  onOpenKieModal: () => void;
  onUseAppCredits: () => void;
  creditsNeeded: number;
  currentCredits?: number;
}

export function CharacterModals({
  isAddingCharacter,
  onCloseAddDialog,
  onAddCharacter,
  characterImageProvider,
  editingCharacterId,
  editCharacterData,
  onCloseEditDialog,
  onSaveEdit,
  previewImage,
  onClosePreview,
  showPromptsDialog,
  characters,
  onCloseCopyPrompts,
  isGeneratingSingle,
  generatingCharacterName,
  isKieModalOpen,
  isSavingKieKey,
  onCloseKieModal,
  onSaveKieApiKey,
  isInsufficientCreditsModalOpen,
  onCloseInsufficientCredits,
  onOpenKieModal,
  onUseAppCredits,
  creditsNeeded,
  currentCredits,
}: CharacterModalsProps) {
  return (
    <>
      {/* Add Character Dialog */}
      <AddCharacterDialog
        open={isAddingCharacter}
        onOpenChange={onCloseAddDialog}
        onAddCharacter={onAddCharacter}
        currentCount={characters.length}
        maxCount={6} // MAX_CHARACTERS from types
      />

      {/* Edit Character Dialog */}
      <EditCharacterDialog
        open={!!editingCharacterId}
        onOpenChange={onCloseEditDialog}
        editData={editCharacterData}
        onEditDataChange={(data) => {/* handled in parent */}}
        onSave={() => editingCharacterId && editCharacterData && onSaveEdit(editingCharacterId, editCharacterData)}
        onCancel={onCloseEditDialog}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={onClosePreview}
      />

      {/* Copy Prompts Dialog */}
      <CopyPromptsDialog
        open={showPromptsDialog}
        onOpenChange={onCloseCopyPrompts}
        characters={characters}
      />

      {/* Loading Modal */}
      <LoadingModal
        isOpen={isGeneratingSingle}
        icon="user"
        title={generatingCharacterName ? `Generating: ${generatingCharacterName}` : 'Generating Character Image'}
        description="Generating image..."
        progress={100}
      />

      {/* KIE API Key Modal */}
      <KieApiKeyModal
        isOpen={isKieModalOpen}
        onClose={onCloseKieModal}
        onSave={onSaveKieApiKey}
        isLoading={isSavingKieKey}
      />

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={isInsufficientCreditsModalOpen}
        onClose={onCloseInsufficientCredits}
        onOpenKieModal={onOpenKieModal}
        onUseAppCredits={onUseAppCredits}
        creditsNeeded={creditsNeeded}
        currentCredits={currentCredits}
        generationType="image"
      />
    </>
  );
}