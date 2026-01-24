import { useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';

/**
 * Hook for refreshing project data from the server
 * Used to keep the UI in sync with database changes during background jobs
 */
export function useProjectRefresh(project: Project) {
  /**
   * Fetches fresh project data from the server and syncs scenes to the store
   */
  const refreshProjectData = useCallback(async () => {
    try {
      const projectResponse = await fetch(`/api/projects?refresh=true`);
      if (projectResponse.ok) {
        const projects = await projectResponse.json();
        const updatedProject = projects.find((p: { id: string }) => p.id === project.id);
        if (updatedProject && updatedProject.scenes) {
          // Sync ALL scenes from DB to ensure UI stays in sync
          const { setScenes } = useProjectStore.getState();
          setScenes(project.id, updatedProject.scenes);
          console.log(`[Refresh] Synced ${updatedProject.scenes.length} scenes from DB`);
        }
      }
    } catch (error) {
      console.error('Error refreshing project data:', error);
    }
  }, [project.id]);

  /**
   * Fetches fresh project data and updates specific scene fields
   * Used when only certain scene properties need updating (e.g., image URLs)
   */
  const refreshSceneImages = useCallback(async () => {
    try {
      const projectResponse = await fetch(`/api/projects?refresh=true`);
      if (projectResponse.ok) {
        const projects = await projectResponse.json();
        const updatedProject = projects.find((p: { id: string }) => p.id === project.id);
        if (updatedProject && updatedProject.scenes) {
          const { updateScene } = useProjectStore.getState();
          // Update only scenes with image URLs
          for (const scene of updatedProject.scenes) {
            if (scene.imageUrl) {
              updateScene(project.id, scene.id, { imageUrl: scene.imageUrl });
            }
          }
          console.log(`[Refresh] Synced images for ${updatedProject.scenes.filter((s: any) => s.imageUrl).length} scenes`);
        }
      }
    } catch (error) {
      console.error('Error refreshing scene images:', error);
    }
  }, [project.id]);

  return {
    refreshProjectData,
    refreshSceneImages,
  };
}
