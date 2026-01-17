import { useState, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';

export function useDialogueLoader(project: Project) {
  const [dialogueLoaded, setDialogueLoaded] = useState(false);
  const [isLoadingDialogue, setIsLoadingDialogue] = useState(false);
  const { updateProject } = useProjectStore();

  useEffect(() => {
    const hasDialogue = project.scenes?.some(s => s.dialogue && s.dialogue.length > 0);

    // If we already have dialogue data or it's already loaded, skip
    if (hasDialogue || dialogueLoaded) return;

    const loadDialogue = async () => {
      setIsLoadingDialogue(true);
      try {
        // Fetch all scenes with dialogue in one call
        const response = await fetch(
          `/api/projects/${project.id}/scenes?withDialogue=true&limit=1000`
        );
        if (response.ok) {
          const data = await response.json();
          // Update project in store with dialogue data
          updateProject(project.id, {
            scenes: data.scenes || [],
          });
          setDialogueLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load dialogue data:', error);
      } finally {
        setIsLoadingDialogue(false);
      }
    };

    loadDialogue();
  }, [project.id, project.scenes, dialogueLoaded, updateProject]);

  return {
    dialogueLoaded,
    isLoadingDialogue,
  };
}