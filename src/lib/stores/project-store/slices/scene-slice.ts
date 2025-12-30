import { v4 as uuidv4 } from 'uuid';
import type { Scene } from '@/types/project';
import type { StateCreator } from '../types';
import { debounceSync } from '../utils';

export interface SceneSlice {
  addScene: (projectId: string, scene: Omit<Scene, 'id'>) => Promise<void>;
  updateScene: (projectId: string, sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (projectId: string, sceneId: string) => Promise<void>;
  setScenes: (projectId: string, scenes: Scene[]) => void;
}

export const createSceneSlice: StateCreator<SceneSlice> = (set, get) => ({
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

    try {
      const response = await fetch(`/api/projects/${projectId}/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scene),
      });

      if (response.ok) {
        const dbScene = await response.json();
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

    if (hasMediaUpdate) {
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
});
