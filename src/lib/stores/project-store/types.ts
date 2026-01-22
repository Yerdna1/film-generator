import type {
  Project,
  Character,
  Scene,
  StylePreset,
  ProjectSettings,
  StoryConfig,
  VoiceSettings,
  ApiConfig,
} from '@/types/project';

export interface UserConstants {
  characterImageProvider: string; // "gemini" | "modal" | "modal-edit"
  characterAspectRatio: string; // "1:1" | "16:9" | "21:9" | "4:3" | "9:16" | "3:4"
  sceneImageProvider: string; // "gemini" | "modal" | "modal-edit"
  sceneAspectRatio: string; // "16:9" | "21:9" | "4:3" | "1:1" | "9:16" | "3:4"
  sceneImageResolution: string; // "1k" | "2k" | "4k"
  videoResolution: string; // "hd" | "4k"
}

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  apiConfig: ApiConfig;
  userConstants: UserConstants | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;
}

export interface ProjectActions {
  // Initialization
  loadProjectsFromDB: () => Promise<void>;

  // Project actions
  createProject: (name: string, style: StylePreset, settings: Partial<ProjectSettings>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Project | null;
  setCurrentProject: (id: string | null) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  addSharedProject: (project: Project) => void;
  clearProjects: () => void;

  // Story actions
  updateStory: (projectId: string, story: Partial<StoryConfig>) => void;
  setMasterPrompt: (projectId: string, prompt: string) => void;

  // Character actions
  addCharacter: (projectId: string, character: Omit<Character, 'id'>) => Promise<Character>;
  updateCharacter: (projectId: string, characterId: string, updates: Partial<Character>) => Promise<void>;
  deleteCharacter: (projectId: string, characterId: string) => Promise<void>;

  // Scene actions
  addScene: (projectId: string, scene: Omit<Scene, 'id'>) => Promise<void>;
  updateScene: (projectId: string, sceneId: string, updates: Partial<Scene>) => Promise<void>;
  deleteScene: (projectId: string, sceneId: string) => Promise<void>;
  setScenes: (projectId: string, scenes: Scene[]) => void;
  refreshScenes: (projectId: string, scenes: Scene[]) => void;

  // Settings actions
  updateSettings: (projectId: string, settings: Partial<ProjectSettings>) => void;

  // Voice actions
  updateVoiceSettings: (projectId: string, settings: Partial<VoiceSettings>) => void;

  // Step navigation
  setCurrentStep: (projectId: string, step: number) => void;
  nextStep: (projectId: string) => void;
  previousStep: (projectId: string) => void;

  // API Config
  setApiConfig: (config: Partial<ApiConfig>) => void;

  // User Constants
  loadUserConstants: () => Promise<void>;
  updateUserConstants: (constants: Partial<UserConstants>) => Promise<void>;

  // Import/Export
  exportProject: (id: string) => string | null;
  importProject: (json: string) => Project | null;
}

export type ProjectStore = ProjectState & ProjectActions;

export type StateCreator<T> = (
  set: (partial: Partial<ProjectStore> | ((state: ProjectStore) => Partial<ProjectStore>)) => void,
  get: () => ProjectStore
) => T;
