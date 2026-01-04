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

// ============================================
// OPTIMIZED SELECTOR HOOKS
// Use these instead of destructuring to prevent unnecessary re-renders
// ============================================

// Project selectors
export const useCurrentProject = () => useProjectStore((state) => state.currentProject);
export const useProjects = () => useProjectStore((state) => state.projects);
export const useIsLoading = () => useProjectStore((state) => state.isLoading);

// Current project data selectors (memoized access to nested data)
export const useCurrentScenes = () => useProjectStore((state) => state.currentProject?.scenes);
export const useCurrentCharacters = () => useProjectStore((state) => state.currentProject?.characters);
export const useCurrentSettings = () => useProjectStore((state) => state.currentProject?.settings);
export const useCurrentStory = () => useProjectStore((state) => state.currentProject?.story);
export const useCurrentStep = () => useProjectStore((state) => state.currentProject?.currentStep);

// API config selector
export const useApiConfig = () => useProjectStore((state) => state.apiConfig);

// Action selectors (these don't cause re-renders as functions are stable)
export const useProjectActions = () => useProjectStore((state) => ({
  createProject: state.createProject,
  deleteProject: state.deleteProject,
  duplicateProject: state.duplicateProject,
  updateProject: state.updateProject,
  getProject: state.getProject,
  setCurrentProject: state.setCurrentProject,
  loadProjectsFromDB: state.loadProjectsFromDB,
}));

export const useSceneActions = () => useProjectStore((state) => ({
  addScene: state.addScene,
  updateScene: state.updateScene,
  deleteScene: state.deleteScene,
  setScenes: state.setScenes,
  refreshScenes: state.refreshScenes,
}));

export const useCharacterActions = () => useProjectStore((state) => ({
  addCharacter: state.addCharacter,
  updateCharacter: state.updateCharacter,
  deleteCharacter: state.deleteCharacter,
}));

export const useNavigationActions = () => useProjectStore((state) => ({
  setCurrentStep: state.setCurrentStep,
  nextStep: state.nextStep,
  previousStep: state.previousStep,
}));

// Re-export types
export * from './types';
export * from './defaults';
