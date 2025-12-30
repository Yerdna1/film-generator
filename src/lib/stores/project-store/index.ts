import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectStore } from './types';
import {
  createProjectSlice,
  createCharacterSlice,
  createSceneSlice,
  createSettingsSlice,
  createNavigationSlice,
} from './slices';

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProject: null,
      apiConfig: {},
      isLoading: false,
      isSyncing: false,
      lastSyncError: null,

      // Combine all slices
      ...createProjectSlice(set, get),
      ...createCharacterSlice(set, get),
      ...createSceneSlice(set, get),
      ...createSettingsSlice(set, get),
      ...createNavigationSlice(set, get),
    }),
    {
      name: 'film-generator-storage',
      partialize: (state) => ({
        // Exclude large binary data (imageUrl, videoUrl, audioUrl) from localStorage
        // These are synced to database and reloaded on auth
        projects: state.projects.map((project) => ({
          ...project,
          characters: project.characters.map((c) => ({
            ...c,
            imageUrl: undefined,
          })),
          scenes: project.scenes.map((s) => ({
            ...s,
            imageUrl: undefined,
            videoUrl: undefined,
            audioUrl: undefined,
          })),
        })),
        apiConfig: state.apiConfig,
      }),
    }
  )
);

// Re-export types
export * from './types';
export * from './defaults';
