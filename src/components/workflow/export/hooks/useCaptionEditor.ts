'use client';

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useProjectStore } from '@/lib/stores/project-store';
import { defaultCaptionStyle } from '@/lib/constants/video-editor';
import type { Project, Caption, CaptionStyle, Scene } from '@/types/project';

export interface CaptionEditorState {
  selectedSceneIndex: number;
  editingCaption: Caption | null;
  isEditing: boolean;
}

export interface CaptionEditorActions {
  setSelectedSceneIndex: (index: number) => void;
  startEditingCaption: (caption: Caption) => void;
  startNewCaption: () => void;
  cancelEditing: () => void;
  saveCaption: (caption: Caption) => void;
  deleteCaption: (captionId: string) => void;
  updateCaptionField: <K extends keyof Caption>(field: K, value: Caption[K]) => void;
  updateCaptionStyle: <K extends keyof CaptionStyle>(field: K, value: CaptionStyle[K]) => void;
  autoGenerateCaptions: () => void;
  autoGenerateAllCaptions: () => void;
  clearAllCaptions: () => void;
  clearAllScenesCaptions: () => void;
}

export interface UseCaptionEditorReturn extends CaptionEditorState, CaptionEditorActions {
  currentScene: Scene | null;
  sceneCaptions: Caption[];
  hasUnsavedChanges: boolean;
}

const SCENE_DURATION = 6; // seconds

function createDefaultCaption(sceneIndex: number): Caption {
  return {
    id: uuidv4(),
    text: '',
    startTime: 0,
    endTime: SCENE_DURATION,
    style: { ...defaultCaptionStyle },
    animation: 'fadeIn',
  };
}

export function useCaptionEditor(project: Project): UseCaptionEditorReturn {
  const { updateScene } = useProjectStore();

  // Safe accessor for scenes array
  const scenes = project.scenes || [];

  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [editingCaption, setEditingCaption] = useState<Caption | null>(null);
  const [originalCaption, setOriginalCaption] = useState<Caption | null>(null);

  const currentScene = useMemo(() => {
    return scenes[selectedSceneIndex] || null;
  }, [scenes, selectedSceneIndex]);

  const sceneCaptions = useMemo(() => {
    return currentScene?.captions || [];
  }, [currentScene]);

  const isEditing = editingCaption !== null;

  const hasUnsavedChanges = useMemo(() => {
    if (!editingCaption || !originalCaption) return false;
    return JSON.stringify(editingCaption) !== JSON.stringify(originalCaption);
  }, [editingCaption, originalCaption]);

  const startEditingCaption = useCallback((caption: Caption) => {
    setEditingCaption({ ...caption });
    setOriginalCaption({ ...caption });
  }, []);

  const startNewCaption = useCallback(() => {
    const newCaption = createDefaultCaption(selectedSceneIndex);
    setEditingCaption(newCaption);
    setOriginalCaption(null);
  }, [selectedSceneIndex]);

  const cancelEditing = useCallback(() => {
    setEditingCaption(null);
    setOriginalCaption(null);
  }, []);

  const saveCaption = useCallback((caption: Caption) => {
    if (!currentScene) return;

    const existingCaptions = currentScene.captions || [];
    const captionIndex = existingCaptions.findIndex(c => c.id === caption.id);

    let updatedCaptions: Caption[];
    if (captionIndex >= 0) {
      // Update existing caption
      updatedCaptions = existingCaptions.map(c =>
        c.id === caption.id ? caption : c
      );
    } else {
      // Add new caption
      updatedCaptions = [...existingCaptions, caption];
    }

    // Sort captions by start time
    updatedCaptions.sort((a, b) => a.startTime - b.startTime);

    updateScene(project.id, currentScene.id, { captions: updatedCaptions });
    setEditingCaption(null);
    setOriginalCaption(null);
  }, [currentScene, project.id, updateScene]);

  const deleteCaption = useCallback((captionId: string) => {
    if (!currentScene) return;

    const updatedCaptions = (currentScene.captions || []).filter(
      c => c.id !== captionId
    );

    updateScene(project.id, currentScene.id, { captions: updatedCaptions });

    // Clear editing state if we deleted the caption being edited
    if (editingCaption?.id === captionId) {
      setEditingCaption(null);
      setOriginalCaption(null);
    }
  }, [currentScene, project.id, updateScene, editingCaption]);

  const updateCaptionField = useCallback(<K extends keyof Caption>(
    field: K,
    value: Caption[K]
  ) => {
    if (!editingCaption) return;
    setEditingCaption(prev => prev ? { ...prev, [field]: value } : null);
  }, [editingCaption]);

  const updateCaptionStyle = useCallback(<K extends keyof CaptionStyle>(
    field: K,
    value: CaptionStyle[K]
  ) => {
    if (!editingCaption) return;
    setEditingCaption(prev => prev ? {
      ...prev,
      style: { ...prev.style, [field]: value }
    } : null);
  }, [editingCaption]);

  const autoGenerateCaptions = useCallback(() => {
    if (!currentScene) return;

    // Generate captions from dialogue lines
    const dialogueLines = currentScene.dialogue || [];
    if (dialogueLines.length === 0) return;

    // Calculate timing for each dialogue line
    const timePerLine = SCENE_DURATION / dialogueLines.length;

    const generatedCaptions: Caption[] = dialogueLines.map((line, index) => ({
      id: uuidv4(),
      text: `${line.characterName}: ${line.text}`,
      startTime: index * timePerLine,
      endTime: (index + 1) * timePerLine,
      style: { ...defaultCaptionStyle },
      animation: 'fadeIn',
    }));

    updateScene(project.id, currentScene.id, { captions: generatedCaptions });
  }, [currentScene, project.id, updateScene]);

  const autoGenerateAllCaptions = useCallback(() => {
    // Generate captions for ALL scenes that have dialogue
    scenes.forEach((scene) => {
      const dialogueLines = scene.dialogue || [];
      if (dialogueLines.length === 0) return;

      // Calculate timing for each dialogue line
      const timePerLine = SCENE_DURATION / dialogueLines.length;

      const generatedCaptions: Caption[] = dialogueLines.map((line, index) => ({
        id: uuidv4(),
        text: `${line.characterName}: ${line.text}`,
        startTime: index * timePerLine,
        endTime: (index + 1) * timePerLine,
        style: { ...defaultCaptionStyle },
        animation: 'fadeIn',
      }));

      updateScene(project.id, scene.id, { captions: generatedCaptions });
    });
  }, [scenes, project.id, updateScene]);

  const clearAllCaptions = useCallback(() => {
    if (!currentScene) return;
    updateScene(project.id, currentScene.id, { captions: [] });
    setEditingCaption(null);
    setOriginalCaption(null);
  }, [currentScene, project.id, updateScene]);

  const clearAllScenesCaptions = useCallback(() => {
    // Clear captions from ALL scenes
    scenes.forEach((scene) => {
      updateScene(project.id, scene.id, { captions: [] });
    });
    setEditingCaption(null);
    setOriginalCaption(null);
  }, [scenes, project.id, updateScene]);

  return {
    // State
    selectedSceneIndex,
    editingCaption,
    isEditing,
    currentScene,
    sceneCaptions,
    hasUnsavedChanges,
    // Actions
    setSelectedSceneIndex,
    startEditingCaption,
    startNewCaption,
    cancelEditing,
    saveCaption,
    deleteCaption,
    updateCaptionField,
    updateCaptionStyle,
    autoGenerateCaptions,
    autoGenerateAllCaptions,
    clearAllCaptions,
    clearAllScenesCaptions,
  };
}
