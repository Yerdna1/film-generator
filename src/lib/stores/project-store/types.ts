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

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  apiConfig: ApiConfig;
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
  setCurrentProject: (id: string | null) => void;
  getProject: (id: string) => Project | undefined;
  clearProjects: () => void;

  // Story actions
  updateStory: (projectId: string, story: Partial<StoryConfig>) => void;
  setMasterPrompt: (projectId: string, prompt: string) => void;

  // Character actions
  addCharacter: (projectId: string, character: Omit<Character, 'id'>) => Promise<void>;
  updateCharacter: (projectId: string, characterId: string, updates: Partial<Character>) => void;
  deleteCharacter: (projectId: string, characterId: string) => Promise<void>;

  // Scene actions
  addScene: (projectId: string, scene: Omit<Scene, 'id'>) => Promise<void>;
  updateScene: (projectId: string, sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (projectId: string, sceneId: string) => Promise<void>;
  setScenes: (projectId: string, scenes: Scene[]) => void;

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

  // Import/Export
  exportProject: (id: string) => string | null;
  importProject: (json: string) => Project | null;
}

export type ProjectStore = ProjectState & ProjectActions;

export type StateCreator<T> = (
  set: (partial: Partial<ProjectStore> | ((state: ProjectStore) => Partial<ProjectStore>)) => void,
  get: () => ProjectStore
) => T;
