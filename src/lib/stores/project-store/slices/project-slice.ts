import { v4 as uuidv4 } from 'uuid';
import type { Project, StoryConfig } from '@/types/project';
import type { StateCreator } from '../types';
import { defaultSettings, defaultStory, defaultVoiceSettings } from '../defaults';
import { debounceSync } from '../utils';

export interface ProjectSlice {
  loadProjectsFromDB: () => Promise<void>;
  createProject: (name: string, style: Project['style'], settings: Partial<Project['settings']>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Project | null;
  setCurrentProject: (id: string | null) => void;
  getProject: (id: string) => Project | undefined;
  clearProjects: () => void;
  updateStory: (projectId: string, story: Partial<StoryConfig>) => void;
  setMasterPrompt: (projectId: string, prompt: string) => void;
  exportProject: (id: string) => string | null;
  importProject: (json: string) => Project | null;
}

export const createProjectSlice: StateCreator<ProjectSlice> = (set, get) => ({
  loadProjectsFromDB: async () => {
    set({ isLoading: true, lastSyncError: null });
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const projects = await response.json();
        set({ projects, isLoading: false });
      } else if (response.status === 401) {
        set({ isLoading: false });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('API returned error, keeping localStorage projects:', errorData);
        set({
          isLoading: false,
          lastSyncError: errorData.error || `API error: ${response.status}`
        });
      }
    } catch (error) {
      console.warn('Network error loading projects, keeping localStorage data:', error);
      set({
        isLoading: false,
        lastSyncError: error instanceof Error ? error.message : 'Network error'
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

    set((state) => ({
      projects: [...state.projects, newProject],
      currentProject: newProject,
    }));

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

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
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
});
