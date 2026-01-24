import { toast } from '@/lib/toast';
import type { DialogueLineWithScene } from '../../types';

export interface ValidationResult {
  isValid: boolean;
  missingCharacters: string[];
}

/**
 * Validates that all characters have voices assigned
 * Returns true if all characters have voices, false otherwise
 */
export function validateVoiceAssignments(
  dialogueLines: DialogueLineWithScene[],
  characters: Array<{ id: string; voiceId?: string | null } | undefined> | undefined
): ValidationResult {
  const charactersWithoutVoice = new Set<string>();

  dialogueLines.forEach(line => {
    const character = characters?.find(c => c?.id === line.characterId);
    if (!character?.voiceId) {
      charactersWithoutVoice.add(line.characterName || 'Unknown');
    }
  });

  const missingCharacters = Array.from(charactersWithoutVoice);
  const isValid = missingCharacters.length === 0;

  return {
    isValid,
    missingCharacters,
  };
}

/**
 * Validates voices and shows error toast if any are missing
 * Returns true if validation passed
 */
export function validateAndNotifyVoices(
  dialogueLines: DialogueLineWithScene[],
  characters: Array<{ id: string; voiceId?: string | null } | undefined> | undefined
): boolean {
  const result = validateVoiceAssignments(dialogueLines, characters);

  if (!result.isValid) {
    const missingCharacters = result.missingCharacters.join(', ');
    toast.error('Please select voices for all characters', {
      description: `Missing voices for: ${missingCharacters}`,
      duration: 6000,
    });
  }

  return result.isValid;
}
