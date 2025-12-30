import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Character,
  Scene,
  StylePreset,
  ProjectSettings,
  StoryConfig,
  VoiceSettings,
  ApiConfig,
  DialogueLine,
} from '@/types/project';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  apiConfig: ApiConfig;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;

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

const defaultSettings: ProjectSettings = {
  sceneCount: 12,
  characterCount: 2,
  aspectRatio: '21:9',
  resolution: '4k',
  voiceLanguage: 'en',
  voiceProvider: 'elevenlabs',
};

const defaultStory: StoryConfig = {
  title: '',
  concept: '',
  genre: 'adventure',
  tone: 'heartfelt',
  setting: '',
};

const defaultVoiceSettings: VoiceSettings = {
  language: 'en',
  provider: 'elevenlabs',
  characterVoices: {},
};

// Debounce helper for syncing
let syncTimeout: NodeJS.Timeout | null = null;
const debounceSync = (fn: () => void, delay: number = 500) => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(fn, delay);
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      apiConfig: {},
      isLoading: false,
      isSyncing: false,
      lastSyncError: null,

      // Load projects from database
      loadProjectsFromDB: async () => {
        set({ isLoading: true, lastSyncError: null });
        try {
          const response = await fetch('/api/projects');
          if (response.ok) {
            const projects = await response.json();
            set({ projects, isLoading: false });
          } else if (response.status === 401) {
            // Not logged in, keep localStorage projects
            set({ isLoading: false });
          } else {
            throw new Error('Failed to load projects');
          }
        } catch (error) {
          console.error('Error loading projects from DB:', error);
          set({
            isLoading: false,
            lastSyncError: error instanceof Error ? error.message : 'Failed to load projects'
          });
        }
      },

      createProject: async (name, style, settings) => {
        const tempId = uuidv4();
        const newProject: Project = {
          id: tempId,
          name,
          userId: 'local-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          style,
          settings: { ...defaultSettings, ...settings },
          story: defaultStory,
          characters: [],
          scenes: [],
          voiceSettings: defaultVoiceSettings,
          currentStep: 1,
          isComplete: false,
        };

        // Optimistically add to local state
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProject: newProject,
        }));

        // Sync to database
        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              style,
              settings: { ...defaultSettings, ...settings },
              story: defaultStory,
              voiceSettings: defaultVoiceSettings,
            }),
          });

          if (response.ok) {
            const dbProject = await response.json();
            // Update with real ID from database
            set((state) => ({
              projects: state.projects.map((p) =>
                p.id === tempId ? dbProject : p
              ),
              currentProject: state.currentProject?.id === tempId ? dbProject : state.currentProject,
            }));
            return dbProject;
          }
        } catch (error) {
          console.error('Error syncing new project to DB:', error);
        }

        return newProject;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates, updatedAt: new Date().toISOString() }
              : state.currentProject,
        }));

        // Debounced sync to database
        debounceSync(async () => {
          try {
            await fetch(`/api/projects/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
          } catch (error) {
            console.error('Error syncing project update to DB:', error);
          }
        });
      },

      deleteProject: async (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        }));

        // Sync to database
        try {
          await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error deleting project from DB:', error);
        }
      },

      duplicateProject: (id) => {
        const project = get().projects.find((p) => p.id === id);
        if (!project) return null;

        const duplicated: Project = {
          ...project,
          id: uuidv4(),
          name: `${project.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          projects: [...state.projects, duplicated],
        }));

        // Sync to database (create new project with same data)
        fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: duplicated.name,
            style: duplicated.style,
            settings: duplicated.settings,
            story: duplicated.story,
            voiceSettings: duplicated.voiceSettings,
            masterPrompt: duplicated.masterPrompt,
          }),
        }).catch(console.error);

        return duplicated;
      },

      setCurrentProject: (id) => {
        if (id === null) {
          set({ currentProject: null });
          return;
        }
        const project = get().projects.find((p) => p.id === id);
        set({ currentProject: project || null });
      },

      getProject: (id) => {
        return get().projects.find((p) => p.id === id);
      },

      clearProjects: () => {
        set({ projects: [], currentProject: null });
      },

      updateStory: (projectId, story) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return;

        const updatedStory = { ...project.story, ...story };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, story: updatedStory, updatedAt: new Date().toISOString() }
              : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, story: updatedStory, updatedAt: new Date().toISOString() }
              : state.currentProject,
        }));

        // Sync to database
        debounceSync(async () => {
          try {
            await fetch(`/api/projects/${projectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ story: updatedStory }),
            });
          } catch (error) {
            console.error('Error syncing story update to DB:', error);
          }
        });
      },

      setMasterPrompt: (projectId, prompt) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, masterPrompt: prompt, updatedAt: new Date().toISOString() } : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, masterPrompt: prompt, updatedAt: new Date().toISOString() }
              : state.currentProject,
        }));

        // Sync to database
        debounceSync(async () => {
          try {
            await fetch(`/api/projects/${projectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ masterPrompt: prompt }),
            });
          } catch (error) {
            console.error('Error syncing master prompt to DB:', error);
          }
        });
      },

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

        // Sync to database
        try {
          const response = await fetch(`/api/projects/${projectId}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(character),
          });

          if (response.ok) {
            const dbCharacter = await response.json();
            // Update with real ID from database
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
        // Sync to database FIRST (before localStorage which might fail)
        // Use immediate sync for imageUrl updates to prevent data loss
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

        // Immediate sync for images, debounced for other updates
        if (hasImageUpdate) {
          syncToDb(); // Fire immediately, don't await
        } else {
          debounceSync(syncToDb);
        }

        // Update local state (may fail for localStorage quota but DB is already synced)
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

        // Sync to database
        try {
          await fetch(`/api/projects/${projectId}/characters/${characterId}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error deleting character from DB:', error);
        }
      },

      addScene: async (projectId, scene) => {
        const tempId = uuidv4();
        const newScene: Scene = { ...scene, id: tempId };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, scenes: [...p.scenes, newScene], updatedAt: new Date().toISOString() }
              : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? {
                  ...state.currentProject,
                  scenes: [...state.currentProject.scenes, newScene],
                  updatedAt: new Date().toISOString(),
                }
              : state.currentProject,
        }));

        // Sync to database
        try {
          const response = await fetch(`/api/projects/${projectId}/scenes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scene),
          });

          if (response.ok) {
            const dbScene = await response.json();
            // Update with real ID from database
            set((state) => ({
              projects: state.projects.map((p) =>
                p.id === projectId
                  ? {
                      ...p,
                      scenes: p.scenes.map((s) =>
                        s.id === tempId ? dbScene : s
                      ),
                    }
                  : p
              ),
              currentProject:
                state.currentProject?.id === projectId
                  ? {
                      ...state.currentProject,
                      scenes: state.currentProject.scenes.map((s) =>
                        s.id === tempId ? dbScene : s
                      ),
                    }
                  : state.currentProject,
            }));
          }
        } catch (error) {
          console.error('Error syncing new scene to DB:', error);
        }
      },

      updateScene: (projectId, sceneId, updates) => {
        // Sync to database FIRST (before localStorage which might fail)
        const hasMediaUpdate = 'imageUrl' in updates || 'videoUrl' in updates || 'audioUrl' in updates;

        const syncToDb = async () => {
          try {
            await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
          } catch (error) {
            console.error('Error syncing scene update to DB:', error);
          }
        };

        // Immediate sync for media, debounced for other updates
        if (hasMediaUpdate) {
          syncToDb();
        } else {
          debounceSync(syncToDb);
        }

        // Update local state
        try {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === projectId
                ? {
                    ...p,
                    scenes: p.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)),
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
            currentProject:
              state.currentProject?.id === projectId
                ? {
                    ...state.currentProject,
                    scenes: state.currentProject.scenes.map((s) =>
                      s.id === sceneId ? { ...s, ...updates } : s
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : state.currentProject,
          }));
        } catch (error) {
          console.warn('LocalStorage update failed (quota exceeded), but data is synced to DB:', error);
        }
      },

      deleteScene: async (projectId, sceneId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  scenes: p.scenes.filter((s) => s.id !== sceneId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? {
                  ...state.currentProject,
                  scenes: state.currentProject.scenes.filter((s) => s.id !== sceneId),
                  updatedAt: new Date().toISOString(),
                }
              : state.currentProject,
        }));

        // Sync to database
        try {
          await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error deleting scene from DB:', error);
        }
      },

      setScenes: (projectId, scenes) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, scenes, updatedAt: new Date().toISOString() } : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, scenes, updatedAt: new Date().toISOString() }
              : state.currentProject,
        }));

        // Sync to database (batch update)
        debounceSync(async () => {
          try {
            await fetch(`/api/projects/${projectId}/scenes`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scenes }),
            });
          } catch (error) {
            console.error('Error syncing scenes to DB:', error);
          }
        });
      },

      updateSettings: (projectId, settings) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return;

        const updatedSettings = { ...project.settings, ...settings };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, settings: updatedSettings, updatedAt: new Date().toISOString() }
              : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, settings: updatedSettings, updatedAt: new Date().toISOString() }
              : state.currentProject,
        }));

        // Sync to database
        debounceSync(async () => {
          try {
            await fetch(`/api/projects/${projectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ settings: updatedSettings }),
            });
          } catch (error) {
            console.error('Error syncing settings to DB:', error);
          }
        });
      },

      updateVoiceSettings: (projectId, settings) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return;

        const updatedVoiceSettings = { ...project.voiceSettings, ...settings };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, voiceSettings: updatedVoiceSettings, updatedAt: new Date().toISOString() }
              : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, voiceSettings: updatedVoiceSettings, updatedAt: new Date().toISOString() }
              : state.currentProject,
        }));

        // Sync to database
        debounceSync(async () => {
          try {
            await fetch(`/api/projects/${projectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voiceSettings: updatedVoiceSettings }),
            });
          } catch (error) {
            console.error('Error syncing voice settings to DB:', error);
          }
        });
      },

      setCurrentStep: (projectId, step) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, currentStep: step, updatedAt: new Date().toISOString() } : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, currentStep: step, updatedAt: new Date().toISOString() }
              : state.currentProject,
        }));

        // Sync to database
        debounceSync(async () => {
          try {
            await fetch(`/api/projects/${projectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ currentStep: step }),
            });
          } catch (error) {
            console.error('Error syncing current step to DB:', error);
          }
        });
      },

      nextStep: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (project && project.currentStep < 6) {
          get().setCurrentStep(projectId, project.currentStep + 1);
        }
      },

      previousStep: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (project && project.currentStep > 1) {
          get().setCurrentStep(projectId, project.currentStep - 1);
        }
      },

      setApiConfig: (config) => {
        set((state) => ({
          apiConfig: { ...state.apiConfig, ...config },
        }));
      },

      exportProject: (id) => {
        const project = get().projects.find((p) => p.id === id);
        if (!project) return null;
        return JSON.stringify(project, null, 2);
      },

      importProject: (json) => {
        try {
          const project = JSON.parse(json) as Project;
          project.id = uuidv4();
          project.createdAt = new Date().toISOString();
          project.updatedAt = new Date().toISOString();

          set((state) => ({
            projects: [...state.projects, project],
          }));

          // Sync to database
          fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: project.name,
              style: project.style,
              settings: project.settings,
              story: project.story,
              voiceSettings: project.voiceSettings,
              masterPrompt: project.masterPrompt,
            }),
          }).catch(console.error);

          return project;
        } catch {
          return null;
        }
      },
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
            imageUrl: undefined, // Don't persist base64 images to localStorage
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
