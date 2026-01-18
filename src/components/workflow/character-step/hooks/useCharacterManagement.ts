import { useCallback } from 'react';
import { toast } from 'sonner';
import { useProjectStore } from '@/lib/stores/project-store';
import { generateCharacterPrompt } from '@/lib/prompts/master-prompt';
import type { Character, StylePreset } from '@/types/project';
import type { CharacterFormData } from '../../character-generator/types';

export function useCharacterManagement(projectId: string, projectStyle: StylePreset) {
  const { addCharacter, updateCharacter, deleteCharacter } = useProjectStore();

  const handleAddCharacter = useCallback(async (data: CharacterFormData) => {
    const masterPrompt = generateCharacterPrompt(data, projectStyle);

    const characterData: Omit<Character, 'id'> = {
      name: data.name,
      description: data.description,
      visualDescription: data.visualDescription,
      personality: data.personality,
      masterPrompt,
      voiceId: '',
      voiceName: '',
    };

    // Add to store (awaits DB creation and returns DB-confirmed character)
    const dbCharacter = await addCharacter(projectId, characterData);

    return dbCharacter;
  }, [projectId, projectStyle, addCharacter]);

  const handleUpdateCharacter = useCallback((characterId: string, data: Partial<Character>) => {
    updateCharacter(projectId, characterId, data);
    toast.success('Character updated');
  }, [projectId, updateCharacter]);

  const handleDeleteCharacter = useCallback(async (characterId: string, characterName: string) => {
    deleteCharacter(projectId, characterId);
    toast.success(`${characterName} deleted`);
  }, [projectId, deleteCharacter]);

  return {
    handleAddCharacter,
    handleUpdateCharacter,
    handleDeleteCharacter,
  };
}