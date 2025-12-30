import { v4 as uuidv4 } from 'uuid';
import type { Character } from '@/types/project';
import type { StateCreator } from '../types';
import { debounceSync } from '../utils';

export interface CharacterSlice {
  addCharacter: (projectId: string, character: Omit<Character, 'id'>) => Promise<void>;
  updateCharacter: (projectId: string, characterId: string, updates: Partial<Character>) => void;
  deleteCharacter: (projectId: string, characterId: string) => Promise<void>;
}

export const createCharacterSlice: StateCreator<CharacterSlice> = (set, get) => ({
  addCharacter: async (projectId, character) => {
    const tempId = uuidv4();
    const newCharacter: Character = { ...character, id: tempId };

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, characters: [...p.characters, newCharacter], updatedAt: new Date().toISOString() }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              characters: [...state.currentProject.characters, newCharacter],
              updatedAt: new Date().toISOString(),
            }
          : state.currentProject,
    }));

    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(character),
      });

      if (response.ok) {
        const dbCharacter = await response.json();
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  characters: p.characters.map((c) =>
                    c.id === tempId ? dbCharacter : c
                  ),
                }
              : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? {
                  ...state.currentProject,
                  characters: state.currentProject.characters.map((c) =>
                    c.id === tempId ? dbCharacter : c
                  ),
                }
              : state.currentProject,
        }));
      }
    } catch (error) {
      console.error('Error syncing new character to DB:', error);
    }
  },

  updateCharacter: (projectId, characterId, updates) => {
    const hasImageUpdate = 'imageUrl' in updates;

    const syncToDb = async () => {
      try {
        await fetch(`/api/projects/${projectId}/characters/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (error) {
        console.error('Error syncing character update to DB:', error);
      }
    };

    if (hasImageUpdate) {
      syncToDb();
    } else {
      debounceSync(syncToDb);
    }

    try {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                characters: p.characters.map((c) => (c.id === characterId ? { ...c, ...updates } : c)),
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
        currentProject:
          state.currentProject?.id === projectId
            ? {
                ...state.currentProject,
                characters: state.currentProject.characters.map((c) =>
                  c.id === characterId ? { ...c, ...updates } : c
                ),
                updatedAt: new Date().toISOString(),
              }
            : state.currentProject,
      }));
    } catch (error) {
      console.warn('LocalStorage update failed (quota exceeded), but data is synced to DB:', error);
    }
  },

  deleteCharacter: async (projectId, characterId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              characters: p.characters.filter((c) => c.id !== characterId),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              characters: state.currentProject.characters.filter((c) => c.id !== characterId),
              updatedAt: new Date().toISOString(),
            }
          : state.currentProject,
    }));

    try {
      await fetch(`/api/projects/${projectId}/characters/${characterId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting character from DB:', error);
    }
  },
});
