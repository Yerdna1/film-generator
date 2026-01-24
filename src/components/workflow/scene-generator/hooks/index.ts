'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, AspectRatio } from '@/types/project';
import type { ImageResolution } from '@/lib/services/real-costs';
import { useScenePolling } from './useScenePolling';
import { useSceneUIState } from './useSceneUIState';
import { useSceneEditing } from './useSceneEditing';
import { useImageGeneration } from './useImageGeneration';
import { toast } from '@/lib/toast';

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

  // Aspect ratio state (from project settings)
  const [sceneAspectRatio, setSceneAspectRatio] = useState<AspectRatio>(
    projectSettings.aspectRatio || '16:9'
  );

  // Sync aspect ratio when project settings change
  useEffect(() => {
    if (projectSettings.aspectRatio) {
      setSceneAspectRatio(projectSettings.aspectRatio);
    }
  }, [projectSettings.aspectRatio]);

  // Computed values
  const scenesWithImages = scenes.filter((s) => s.imageUrl).length;
  const imageResolution = projectSettings.imageResolution || '2k';

  // Use sub-hooks for different concerns
  const polling = useScenePolling(project);
  const uiState = useSceneUIState(scenes);
  const editing = useSceneEditing(project, uiState.setEditingScene);
  const imageGen = useImageGeneration(project, sceneAspectRatio, imageResolution as ImageResolution);

  // Scene generation state
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);

  // Generate all scenes with AI via Inngest background job
  const handleGenerateAllScenes = useCallback(async (skipCreditCheck = false) => {
    if (characters.length === 0) {
      toast.error('No characters found', {
        description: 'Please add characters in Step 2 to generate scenes.',
      });
      return;
    }

    if (polling.sceneJobId) {
      toast.warning('Generation in progress', {
        description: 'A scene generation job is already running. Please wait for it to complete.',
      });
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
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.log('[Scenes] Could not parse error response:', jsonError);
        }

        // Handle 409 Conflict (Job already running)
        if (response.status === 409 && errorData.jobId) {
          console.log('[Scenes] Found existing job, resuming polling:', errorData.jobId);
          polling.startSceneJobPolling(errorData.jobId);
          toast.info('Resuming existing generation', {
            description: 'Found an active background job.',
          });
          setIsGeneratingScenes(false); // Reset state since we're not starting a new job
          return; // Exit successfully
        }

        let errorMessage = errorData.error || 'Failed to start scene generation';
        if (!errorData.error && !errorData.message) {
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const { jobId, totalScenes } = await response.json();

      polling.startSceneJobPolling(jobId);

      console.log(`[Scenes] Started background job ${jobId} for ${totalScenes} scenes`);

      setIsGeneratingScenes(false);
    } catch (error) {
      console.error('[Scenes] Error starting scene generation:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for specific error types
      if (errorMessage.includes('insufficient credits') || errorMessage.includes('Insufficient credits')) {
        toast.error('Insufficient Credits', {
          description: 'Your OpenRouter account has insufficient credits. Please add credits at openrouter.ai.',
          duration: 8000,
          action: {
            label: 'Add Credits',
            onClick: () => window.open('https://openrouter.ai/credits', '_blank'),
          },
        });
      } else {
        toast.error('Failed to start scene generation', {
          description: errorMessage,
        });
      }

      setIsGeneratingScenes(false);
    }
  }, [project, characters, polling]);

  // Cancel scene generation
  // Cancel scene generation
  const handleCancelSceneGeneration = useCallback(async () => {
    if (polling.sceneJobId) {
      try {
        console.log('[Scenes] Cancelling scene generation job:', polling.sceneJobId);

        // Cancel the job on the server
        const response = await fetch(`/api/jobs/generate-scenes?jobId=${polling.sceneJobId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to cancel scene generation');
        }

        console.log('[Scenes] Job cancelled successfully');

        // Stop local polling and clear state
        polling.stopSceneJobPolling();
        setIsGeneratingScenes(false);

      } catch (error) {
        console.error('Failed to cancel scene generation:', error);
        toast.error('Failed to stop generation');
      }
    }
  }, [polling]);

  // Wrapper for background generation that passes polling data
  const handleStartBackgroundGeneration = useCallback(async (limit?: number) => {
    // With unified Inngest approach, all generation is background generation
    await imageGen.handleGenerateAllSceneImages();
  }, [imageGen]);

  // Wrapper for batch generation
  const handleGenerateBatch = useCallback((batchSize: number) => {
    imageGen.handleGenerateBatch(batchSize);
  }, [imageGen]);

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
    handleRegenerateSelected: () => imageGen.handleRegenerateSelected(uiState.selectedScenes),

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

// Re-export specialized hooks
export { useStep3Collaboration } from './useStep3Collaboration';
export { useStep3Pagination } from './useStep3Pagination';
