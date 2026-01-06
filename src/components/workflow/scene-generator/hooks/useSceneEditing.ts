import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { generateScenePrompt } from '@/lib/prompts/master-prompt';
import type { Project, Scene } from '@/types/project';
import type { EditSceneData, NewSceneData } from './types';

interface SceneEditingHookResult {
  editSceneData: EditSceneData | null;
  setEditSceneData: (data: EditSceneData | null) => void;
  handleAddScene: (newScene: NewSceneData) => void;
  regeneratePrompts: (scene: Scene) => void;
  startEditScene: (scene: Scene) => void;
  saveEditScene: () => void;
  cancelEditScene: () => void;
}

export function useSceneEditing(project: Project, setEditingScene: (value: string | null) => void): SceneEditingHookResult {
  const { addScene, updateScene } = useProjectStore();
  const [editSceneData, setEditSceneData] = useState<EditSceneData | null>(null);
  const editingScene = useRef<string | null>(null);

  // Add new scene
  const handleAddScene = useCallback((newScene: NewSceneData) => {
    if (!newScene.title.trim()) return;

    const { textToImagePrompt, imageToVideoPrompt } = generateScenePrompt(
      {
        title: newScene.title,
        description: newScene.description,
        cameraShot: newScene.cameraShot,
      },
      project.style,
      project.characters
    );

    const sceneNumber = (project.scenes?.length || 0) + 1;

    addScene(project.id, {
      number: sceneNumber,
      title: newScene.title,
      description: newScene.description,
      textToImagePrompt,
      imageToVideoPrompt,
      dialogue: newScene.dialogue.map((d, idx) => ({
        id: `${Date.now()}-${idx}`,
        characterId: d.characterId,
        characterName: d.characterName,
        text: d.text,
      })),
      cameraShot: newScene.cameraShot,
      duration: 6,
    });
  }, [project, addScene]);

  // Regenerate prompts for a scene
  const regeneratePrompts = useCallback((scene: Scene) => {
    const { textToImagePrompt, imageToVideoPrompt } = generateScenePrompt(
      {
        title: scene.title,
        description: scene.textToImagePrompt,
        cameraShot: scene.cameraShot,
      },
      project.style,
      project.characters
    );
    updateScene(project.id, scene.id, { textToImagePrompt, imageToVideoPrompt });
  }, [project, updateScene]);

  // Start editing a scene
  const startEditScene = useCallback((scene: Scene) => {
    setEditSceneData({
      title: scene.title,
      description: scene.description || '',
      cameraShot: scene.cameraShot,
      textToImagePrompt: scene.textToImagePrompt,
      imageToVideoPrompt: scene.imageToVideoPrompt,
      dialogue: [...scene.dialogue],
    });
    editingScene.current = scene.id;
    setEditingScene(scene.id);
  }, [setEditingScene]);

  // Save edited scene
  const saveEditScene = useCallback(() => {
    if (!editingScene.current || !editSceneData) return;

    updateScene(project.id, editingScene.current, {
      title: editSceneData.title,
      description: editSceneData.description,
      cameraShot: editSceneData.cameraShot,
      textToImagePrompt: editSceneData.textToImagePrompt,
      imageToVideoPrompt: editSceneData.imageToVideoPrompt,
      dialogue: editSceneData.dialogue,
    });

    editingScene.current = null;
    setEditingScene(null);
    setEditSceneData(null);
  }, [editingScene, editSceneData, project.id, updateScene, setEditingScene]);

  // Cancel editing
  const cancelEditScene = useCallback(() => {
    editingScene.current = null;
    setEditingScene(null);
    setEditSceneData(null);
  }, [setEditingScene]);

  return {
    editSceneData,
    setEditSceneData,
    handleAddScene,
    regeneratePrompts,
    startEditScene,
    saveEditScene,
    cancelEditScene,
  };
}
