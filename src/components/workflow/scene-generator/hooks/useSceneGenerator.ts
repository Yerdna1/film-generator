'use client';

import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import { generateScenePrompt } from '@/lib/prompts/master-prompt';
import type { Project, Scene, CameraShot, DialogueLine } from '@/types/project';
import type { AspectRatio, ImageResolution } from '@/lib/services/real-costs';

interface EditSceneData {
  title: string;
  description: string;
  cameraShot: CameraShot;
  textToImagePrompt: string;
  imageToVideoPrompt: string;
  dialogue: DialogueLine[];
}

interface NewSceneData {
  title: string;
  description: string;
  cameraShot: CameraShot;
  dialogue: { characterId: string; characterName: string; text: string }[];
}

export function useSceneGenerator(initialProject: Project) {
  const { addScene, updateScene, deleteScene, updateSettings, projects } = useProjectStore();
  const { handleApiResponse } = useCredits();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  // UI State
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);
  const [sceneAspectRatio, setSceneAspectRatio] = useState<AspectRatio>('16:9');

  // Generation State
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [generatingImageForScene, setGeneratingImageForScene] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const stopGenerationRef = useRef(false);

  // Edit State
  const [editSceneData, setEditSceneData] = useState<EditSceneData | null>(null);

  // Computed values
  const scenesWithImages = project.scenes.filter((s) => s.imageUrl).length;
  const imageResolution = project.settings?.imageResolution || '2k';

  // Toggle scene expansion
  const toggleExpanded = useCallback((sceneId: string) => {
    setExpandedScenes((prev) =>
      prev.includes(sceneId)
        ? prev.filter((id) => id !== sceneId)
        : [...prev, sceneId]
    );
  }, []);

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

    const sceneNumber = project.scenes.length + 1;

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
    setEditingScene(scene.id);
  }, []);

  // Save edited scene
  const saveEditScene = useCallback(() => {
    if (!editingScene || !editSceneData) return;

    updateScene(project.id, editingScene, {
      title: editSceneData.title,
      description: editSceneData.description,
      cameraShot: editSceneData.cameraShot,
      textToImagePrompt: editSceneData.textToImagePrompt,
      imageToVideoPrompt: editSceneData.imageToVideoPrompt,
      dialogue: editSceneData.dialogue,
    });

    setEditingScene(null);
    setEditSceneData(null);
  }, [editingScene, editSceneData, project.id, updateScene]);

  // Cancel editing
  const cancelEditScene = useCallback(() => {
    setEditingScene(null);
    setEditSceneData(null);
  }, []);

  // Handle scene count change
  const handleSceneCountChange = useCallback((value: string) => {
    updateSettings(project.id, { sceneCount: parseInt(value) as 12 | 24 | 36 | 48 | 60 });
  }, [project.id, updateSettings]);

  // Generate all scenes with AI
  const handleGenerateAllScenes = useCallback(async () => {
    if (project.characters.length === 0) {
      alert('Please add characters in Step 2 first');
      return;
    }

    setIsGeneratingScenes(true);

    try {
      const response = await fetch('/api/claude/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          story: project.story,
          characters: project.characters.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            masterPrompt: c.masterPrompt,
          })),
          style: project.style,
          sceneCount: project.settings.sceneCount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate scenes');
      }

      const { scenes: generatedScenes } = await response.json();

      for (const sceneData of generatedScenes) {
        await addScene(project.id, {
          number: sceneData.number,
          title: sceneData.title,
          description: sceneData.description || '',
          textToImagePrompt: sceneData.textToImagePrompt,
          imageToVideoPrompt: sceneData.imageToVideoPrompt,
          dialogue: sceneData.dialogue || [],
          cameraShot: sceneData.cameraShot === 'close-up' ? 'close-up' : 'medium',
          duration: 6,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error generating scenes:', error);
      alert(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingScenes(false);
    }
  }, [project, addScene]);

  // Generate image for a single scene
  const handleGenerateSceneImage = useCallback(async (scene: Scene) => {
    setGeneratingImageForScene(scene.id);

    try {
      const referenceImages = project.characters
        .filter((c) => c.imageUrl)
        .map((c) => ({
          name: c.name,
          imageUrl: c.imageUrl!,
        }));

      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scene.textToImagePrompt,
          aspectRatio: sceneAspectRatio,
          resolution: imageResolution,
          projectId: project.id,
          referenceImages,
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData?.error || errorData?.message || 'Failed to generate image');
      }

      const { imageUrl } = await response.json();
      await updateScene(project.id, scene.id, { imageUrl });

      window.dispatchEvent(new CustomEvent('credits-updated'));
    } catch (error) {
      console.error('Error generating scene image:', error);
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingImageForScene(null);
    }
  }, [project, sceneAspectRatio, imageResolution, handleApiResponse, updateScene]);

  // Generate all scene images
  const handleGenerateAllSceneImages = useCallback(async () => {
    if (isGeneratingAllImages) {
      console.log('Generation already in progress, ignoring duplicate call');
      return;
    }

    const scenesWithoutImages = project.scenes.filter((s) => !s.imageUrl);
    if (scenesWithoutImages.length === 0) {
      alert('All scenes already have images');
      return;
    }

    const referenceImages = project.characters
      .filter((c) => c.imageUrl)
      .map((c) => ({
        name: c.name,
        imageUrl: c.imageUrl!,
      }));

    setIsGeneratingAllImages(true);
    stopGenerationRef.current = false;

    try {
      for (const scene of scenesWithoutImages) {
        if (stopGenerationRef.current) {
          console.log('Image generation stopped by user');
          break;
        }

        setGeneratingImageForScene(scene.id);

        const response = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: scene.textToImagePrompt,
            aspectRatio: sceneAspectRatio,
            resolution: imageResolution,
            projectId: project.id,
            referenceImages,
          }),
        });

        const isInsufficientCredits = await handleApiResponse(response);
        if (isInsufficientCredits) {
          break;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          const errorMessage = errorData?.error || errorData?.message || 'Unknown error';
          console.error(`Failed to generate image for scene ${scene.number}: ${errorMessage}`);
          alert(`Scene ${scene.number} failed: ${errorMessage}`);
          continue;
        }

        const { imageUrl } = await response.json();
        await updateScene(project.id, scene.id, { imageUrl });
        console.log(`[Scene ${scene.number}] Image saved to DB`);

        window.dispatchEvent(new CustomEvent('credits-updated'));
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error generating scene images:', error);
      alert(`Error during batch generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingImageForScene(null);
      setIsGeneratingAllImages(false);
      stopGenerationRef.current = false;
    }
  }, [project, isGeneratingAllImages, sceneAspectRatio, imageResolution, handleApiResponse, updateScene]);

  // Stop image generation
  const handleStopImageGeneration = useCallback(() => {
    stopGenerationRef.current = true;
    console.log('Stop image generation requested');
  }, []);

  // Handle regenerate all images
  const handleRegenerateAllImages = useCallback(async () => {
    // Clear all existing images first
    for (const scene of project.scenes) {
      if (scene.imageUrl) {
        await updateScene(project.id, scene.id, { imageUrl: undefined });
      }
    }
    // Small delay to ensure state updates
    await new Promise(resolve => setTimeout(resolve, 100));
    // Now generate all
    handleGenerateAllSceneImages();
  }, [project, updateScene, handleGenerateAllSceneImages]);

  return {
    // Project data
    project,
    scenesWithImages,
    imageResolution: imageResolution as ImageResolution,

    // UI State
    isAddingScene,
    setIsAddingScene,
    editingScene,
    expandedScenes,
    previewImage,
    setPreviewImage,
    showPromptsDialog,
    setShowPromptsDialog,
    sceneAspectRatio,
    setSceneAspectRatio,

    // Generation State
    isGeneratingScenes,
    generatingImageForScene,
    isGeneratingAllImages,

    // Edit State
    editSceneData,
    setEditSceneData,

    // Actions
    toggleExpanded,
    handleAddScene,
    regeneratePrompts,
    startEditScene,
    saveEditScene,
    cancelEditScene,
    handleSceneCountChange,
    handleGenerateAllScenes,
    handleGenerateSceneImage,
    handleGenerateAllSceneImages,
    handleStopImageGeneration,
    handleRegenerateAllImages,
    deleteScene: (sceneId: string) => deleteScene(project.id, sceneId),
    updateSettings: (settings: Parameters<typeof updateSettings>[1]) => updateSettings(project.id, settings),
  };
}
