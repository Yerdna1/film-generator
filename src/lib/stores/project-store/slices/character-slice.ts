import { v4 as uuidv4 } from 'uuid';
import type { Character } from '@/types/project';
import type { StateCreator } from '../types';
import { debounceSync } from '../utils';

export interface CharacterSlice {
  addCharacter: (projectId: string, character: Omit<Character, 'id'>) => Promise<Character>;
  updateCharacter: (projectId: string, characterId: string, updates: Partial<Character>) => Promise<void>;
  deleteCharacter: (projectId: string, characterId: string) => Promise<void>;
}

export const createCharacterSlice: StateCreator<CharacterSlice> = (set, get) => ({
  addCharacter: async (projectId, character) => {
    // Create character in database first to get the real ID
    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(character),
      });

      if (!response.ok) {
        throw new Error(`Failed to create character in DB: ${response.statusText}`);
      }

      const dbCharacter: Character = await response.json();

      // Update local state with the database character (has real DB ID)
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? { ...p, characters: [...p.characters, dbCharacter], updatedAt: new Date().toISOString() }
            : p
        ),
        currentProject:
          state.currentProject?.id === projectId
            ? {
                ...state.currentProject,
                characters: [...state.currentProject.characters, dbCharacter],
                updatedAt: new Date().toISOString(),
              }
            : state.currentProject,
      }));

      // Return the database-confirmed character
      return dbCharacter;
    } catch (error) {
      console.error('Error creating character in DB:', error);
      throw error;
    }
  },

  updateCharacter: async (projectId, characterId, updates) => {
    const hasImageUpdate = 'imageUrl' in updates;

    // Update local state first for responsive UI
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

    // Sync to DB - await for image updates to ensure they're saved
    const syncToDb = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/characters/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          console.error('Failed to sync character to DB:', await response.text());
        }
      } catch (error) {
        console.error('Error syncing character update to DB:', error);
      }
    };

    if (hasImageUpdate) {
      // For image updates, await the sync to ensure it's saved
      await syncToDb();
    } else {
      // For other updates, debounce to avoid too many requests
      debounceSync(syncToDb);
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
