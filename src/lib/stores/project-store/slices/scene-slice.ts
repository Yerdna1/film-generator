import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { Scene } from '@/types/project';
import type { StateCreator } from '../types';
import { debounceSync } from '../utils';

export interface SceneSlice {
  addScene: (projectId: string, scene: Omit<Scene, 'id'>) => Promise<void>;
  updateScene: (projectId: string, sceneId: string, updates: Partial<Scene>) => Promise<void>;
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
      } else {
        const data = await response.json().catch(() => ({ error: 'Failed to create scene' }));
        toast.error(data.error || 'Failed to create scene');
      }
    } catch (error) {
      console.error('Error syncing new scene to DB:', error);
      toast.error('Network error - scene may not be saved');
    }
  },

  updateScene: async (projectId, sceneId, updates) => {
    const hasMediaUpdate = 'imageUrl' in updates || 'videoUrl' in updates || 'audioUrl' in updates;

    // Update local state first for responsive UI
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

    // Sync to DB - await for media updates to ensure they're saved
    const syncToDb = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to save changes' }));
          const errorMessage = data.error || 'Failed to save changes';
          console.error('Failed to sync scene to DB:', errorMessage);
          toast.error(errorMessage);
        }
      } catch (error) {
        console.error('Error syncing scene update to DB:', error);
        toast.error('Network error - changes may not be saved');
      }
    };

    if (hasMediaUpdate) {
      // For media updates (images, videos, audio), await the sync to ensure it's saved
      await syncToDb();
    } else {
      // For other updates, debounce to avoid too many requests
      debounceSync(syncToDb);
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
      const response = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to delete scene' }));
        toast.error(data.error || 'Failed to delete scene');
      }
    } catch (error) {
      console.error('Error deleting scene from DB:', error);
      toast.error('Network error - scene may not be deleted');
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
        const response = await fetch(`/api/projects/${projectId}/scenes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenes }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to save scenes' }));
          toast.error(data.error || 'Failed to save scenes');
        }
      } catch (error) {
        console.error('Error syncing scenes to DB:', error);
        toast.error('Network error - changes may not be saved');
      }
    });
  },
});
