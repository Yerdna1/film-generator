'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, AspectRatio } from '@/types/project';
import type { ImageResolution } from '@/lib/services/real-costs';
import { useScenePolling } from './useScenePolling';
import { useSceneUIState } from './useSceneUIState';
import { useSceneEditing } from './useSceneEditing';
import { useImageGeneration } from './useImageGeneration';

export function useSceneGenerator(initialProject: Project) {
  const { projects, deleteScene, updateSettings } = useProjectStore();

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  // Store may contain summary data without scenes
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

  // Safe accessors for arrays that may be undefined in summary data
  const scenes = project.scenes || [];
  const characters = project.characters || [];
  const projectSettings = project.settings || { sceneCount: 12, imageResolution: '2k' };

  // Aspect ratio state (from model config or project settings)
  const [sceneAspectRatio, setSceneAspectRatio] = useState<AspectRatio>(
    project.modelConfig?.image?.sceneAspectRatio || projectSettings.aspectRatio || '16:9'
  );

  // Sync aspect ratio when project settings or model config changes
  useEffect(() => {
    const configAspectRatio = project.modelConfig?.image?.sceneAspectRatio;
    if (configAspectRatio) {
      setSceneAspectRatio(configAspectRatio);
    } else if (projectSettings.aspectRatio) {
      setSceneAspectRatio(projectSettings.aspectRatio);
    }
  }, [project.modelConfig?.image?.sceneAspectRatio, projectSettings.aspectRatio]);

  // Computed values
  const scenesWithImages = scenes.filter((s) => s.imageUrl).length;
  const imageResolution = project.modelConfig?.image?.sceneResolution || projectSettings.imageResolution || '2k';

  // Get model configuration from project
  const modelConfig = project.modelConfig;
  const imageProvider = modelConfig?.image?.provider;
  const imageModel = modelConfig?.image?.model;

  // Use sub-hooks for different concerns
  const polling = useScenePolling(project);
  const uiState = useSceneUIState(scenes);
  const editing = useSceneEditing(project, uiState.setEditingScene);
  const imageGen = useImageGeneration(project, sceneAspectRatio, imageResolution, imageProvider, imageModel);

  // Scene generation state
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);

  // Generate all scenes with AI via Inngest background job
  const handleGenerateAllScenes = useCallback(async (skipCreditCheck = false) => {
    if (characters.length === 0) {
      alert('Please add characters in Step 2 first');
      return;
    }

    if (polling.sceneJobId) {
      alert('A scene generation job is already running. Please wait for it to complete.');
      return;
    }

    setIsGeneratingScenes(true);

    try {
      console.log('[Scenes] Starting scene generation...', {
        projectId: project.id,
        sceneCount: project.settings.sceneCount,
        skipCreditCheck,
      });

      // Use Inngest background job for reliable scene generation
      const response = await fetch('/api/jobs/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          story: project.story,
          characters: characters.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            masterPrompt: c.masterPrompt,
          })),
          style: project.style,
          sceneCount: project.settings.sceneCount,
          skipCreditCheck, // Skip credit check when user provides own API key
        }),
      });

      console.log('[Scenes] Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to start scene generation';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
          console.log('[Scenes] Server error:', error);
        } catch (jsonError) {
          // Response body isn't valid JSON
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
          console.log('[Scenes] Could not parse error response:', jsonError);
        }
        throw new Error(errorMessage);
      }

      const { jobId, totalScenes } = await response.json();

      polling.startSceneJobPolling(jobId);

      console.log(`[Scenes] Started background job ${jobId} for ${totalScenes} scenes`);

    } catch (error) {
      console.error('[Scenes] Error starting scene generation:', error);
      console.error('[Scenes] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      alert(`Failed to start scene generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsGeneratingScenes(false);
    }
  }, [project, characters, polling]);

  // Cancel scene generation
  const handleCancelSceneGeneration = useCallback(async () => {
    const sceneJobPollRef = { current: null } as React.MutableRefObject<NodeJS.Timeout | null>;
    await imageGen.handleCancelSceneGeneration(polling.sceneJobId, setIsGeneratingScenes, (val) => {/* Do nothing, handled by polling */}, sceneJobPollRef);
  }, [polling.sceneJobId, imageGen]);

  // Wrapper for background generation that passes polling data
  const handleStartBackgroundGeneration = useCallback(async (limit?: number) => {
    await imageGen.handleStartBackgroundGeneration(limit, polling.backgroundJobId, polling.startPolling);
  }, [imageGen, polling.backgroundJobId, polling.startPolling]);

  // Wrapper for batch generation
  const handleGenerateBatch = useCallback((batchSize: number) => {
    imageGen.handleGenerateBatch(batchSize, handleStartBackgroundGeneration);
  }, [imageGen, handleStartBackgroundGeneration]);

  // Scene job start time ref for timeout tracking
  const sceneJobStartTime = useRef<number | null>(null);

  return {
    // Project data
    project,
    scenes,           // Safe accessor for project.scenes
    characters,       // Safe accessor for project.characters
    projectSettings,  // Safe accessor for project.settings
    scenesWithImages,
    imageResolution: imageResolution as ImageResolution,

    // UI State
    isAddingScene: uiState.isAddingScene,
    setIsAddingScene: uiState.setIsAddingScene,
    editingScene: uiState.editingScene,
    expandedScenes: uiState.expandedScenes,
    previewImage: uiState.previewImage,
    setPreviewImage: uiState.setPreviewImage,
    showPromptsDialog: uiState.showPromptsDialog,
    setShowPromptsDialog: uiState.setShowPromptsDialog,
    sceneAspectRatio,
    setSceneAspectRatio,

    // Generation State
    isGeneratingScenes,
    generatingImageForScene: imageGen.generatingImageForScene,
    isGeneratingAllImages: imageGen.isGeneratingAllImages,
    failedScenes: imageGen.failedScenes,

    // Selection State
    selectedScenes: uiState.selectedScenes,
    toggleSceneSelection: uiState.toggleSceneSelection,
    clearSelection: uiState.clearSelection,
    selectAllWithImages: uiState.selectAllWithImages,
    selectAll: (scenes: Project['scenes']) => uiState.selectAll(scenes || []),
    handleRegenerateSelected: () => imageGen.handleRegenerateSelected(uiState.selectedScenes, uiState.setSelectedScenes),

    // Background Job State (Inngest) - for images
    backgroundJobId: polling.backgroundJobId,
    backgroundJobProgress: polling.backgroundJobProgress,
    backgroundJobStatus: polling.backgroundJobStatus,
    isBackgroundJobRunning: polling.isBackgroundJobRunning,

    // Scene Generation Job State (Inngest)
    sceneJobId: polling.sceneJobId,
    sceneJobProgress: polling.sceneJobProgress,
    sceneJobStatus: polling.sceneJobStatus,
    sceneJobStartTime: undefined,
    isSceneJobRunning: polling.isSceneJobRunning,

    // Edit State
    editSceneData: editing.editSceneData,
    setEditSceneData: editing.setEditSceneData,

    // Actions
    toggleExpanded: uiState.toggleExpanded,
    handleAddScene: editing.handleAddScene,
    regeneratePrompts: editing.regeneratePrompts,
    startEditScene: editing.startEditScene,
    saveEditScene: editing.saveEditScene,
    cancelEditScene: editing.cancelEditScene,
    handleGenerateAllScenes,
    handleGenerateSceneImage: imageGen.handleGenerateSceneImage,
    handleGenerateAllSceneImages: imageGen.handleGenerateAllSceneImages,
    handleStopImageGeneration: imageGen.handleStopImageGeneration,
    handleRegenerateAllImages: imageGen.handleRegenerateAllImages,
    handleStartBackgroundGeneration,
    handleGenerateBatch,
    handleCancelSceneGeneration,
    deleteScene: (sceneId: string) => deleteScene(project.id, sceneId),
    updateSettings: (settings: Parameters<typeof updateSettings>[1]) => updateSettings(project.id, settings),
  };
}
