import type { Project, Character } from '@/types/project';
import type { AspectRatio, ImageResolution } from '@/lib/services/real-costs';
import { ItemGenerationState } from '@/lib/constants/workflow';

export interface Step2Props {
  project: Project;
}

export type CharacterImageState = Record<string, ItemGenerationState>;

export const MAX_CHARACTERS = 4;

export interface CharacterFormData {
  name: string;
  description: string;
  visualDescription: string;
  personality: string;
}

export interface EditCharacterData extends CharacterFormData {
  masterPrompt: string;
}

export interface CharacterCardProps {
  character: Character;
  project: Project;
  imageState?: ItemGenerationState;
  onEdit: (character: Character) => void;
  onDelete: (characterId: string) => void;
  onGenerateImage: (character: Character) => void;
  onRegeneratePrompt: (character: Character) => void;
  onPreviewImage: (imageUrl: string) => void;
  onUploadImage: (character: Character, file: File) => void;
  characterAspectRatio: AspectRatio;
}

export interface AddCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCharacter: (data: CharacterFormData) => void;
  currentCount: number;
  maxCount: number;
}

export interface EditCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData: EditCharacterData | null;
  onEditDataChange: (data: EditCharacterData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export interface CopyPromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
}

export interface CharacterPromptCardProps {
  character: Character;
  index: number;
  hasImage: boolean;
}

export interface ImageGenerationSettingsProps {
  imageResolution: ImageResolution;
  aspectRatio: AspectRatio;
  onResolutionChange: (resolution: ImageResolution) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

export interface CharacterProgressProps {
  characters: Character[];
  charactersWithImages: number;
  isGeneratingAll: boolean;
  imageResolution: ImageResolution;
  onGenerateAll: () => void;
  onShowPromptsDialog: () => void;
}
