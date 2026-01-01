import { create } from 'zustand';
import type { ProjectStore } from './types';
import {
  createProjectSlice,
  createCharacterSlice,
  createSceneSlice,
  createSettingsSlice,
  createNavigationSlice,
} from './slices';

// No localStorage persistence - DB is the source of truth
export const useProjectStore = create<ProjectStore>()((set, get) => ({
  // Initial state
  projects: [],
  currentProject: null,
  apiConfig: {},
  isLoading: true, // Start as true until first DB load completes
  isSyncing: false,
  lastSyncError: null,

  // Combine all slices
  ...createProjectSlice(set, get),
  ...createCharacterSlice(set, get),
  ...createSceneSlice(set, get),
  ...createSettingsSlice(set, get),
  ...createNavigationSlice(set, get),
}));

// Re-export types
export * from './types';
export * from './defaults';
