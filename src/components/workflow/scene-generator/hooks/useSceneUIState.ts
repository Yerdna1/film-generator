import { useState, useCallback } from 'react';
import type { Scene } from '@/types/project';

interface UIStateHookResult {
  // UI State
  isAddingScene: boolean;
  setIsAddingScene: (value: boolean) => void;
  editingScene: string | null;
  setEditingScene: (value: string | null) => void;
  expandedScenes: string[];
  previewImage: string | null;
  setPreviewImage: (value: string | null) => void;
  showPromptsDialog: boolean;
  setShowPromptsDialog: (value: boolean) => void;

  // Selection State
  selectedScenes: Set<string>;
  setSelectedScenes: (setter: (prev: Set<string>) => Set<string>) => void;
  toggleSceneSelection: (sceneId: string) => void;
  clearSelection: () => void;
  selectAllWithImages: () => void;
  selectAll: (scenes: Scene[]) => void;

  // Actions
  toggleExpanded: (sceneId: string) => void;
}

export function useSceneUIState(scenes: Scene[]): UIStateHookResult {
  // UI State
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);

  // Selection State for batch regeneration
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());

  // Toggle scene expansion
  const toggleExpanded = useCallback((sceneId: string) => {
    setExpandedScenes((prev) =>
      prev.includes(sceneId)
        ? prev.filter((id) => id !== sceneId)
        : [...prev, sceneId]
    );
  }, []);

  // Selection functions for batch regeneration
  const toggleSceneSelection = useCallback((sceneId: string) => {
    setSelectedScenes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedScenes(new Set());
  }, []);

  const selectAllWithImages = useCallback(() => {
    const scenesWithImgs = scenes.filter(s => s.imageUrl).map(s => s.id);
    setSelectedScenes(new Set(scenesWithImgs));
  }, [scenes]);

  const selectAll = useCallback((scenes: Scene[]) => {
    const allIds = scenes.map(s => s.id);
    setSelectedScenes(new Set(allIds));
  }, []);

  return {
    // UI State
    isAddingScene,
    setIsAddingScene,
    editingScene,
    setEditingScene,
    expandedScenes,
    previewImage,
    setPreviewImage,
    showPromptsDialog,
    setShowPromptsDialog,

    // Selection State
    selectedScenes,
    setSelectedScenes,
    toggleSceneSelection,
    clearSelection,
    selectAllWithImages,
    selectAll,

    // Actions
    toggleExpanded,
  };
}
