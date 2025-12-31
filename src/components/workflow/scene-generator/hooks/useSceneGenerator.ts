'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import { generateScenePrompt } from '@/lib/prompts/master-prompt';
import type { Project, Scene, CameraShot, DialogueLine } from '@/types/project';
import type { AspectRatio, ImageResolution } from '@/lib/services/real-costs';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

// Helper function for exponential backoff retry - continues even when tab is hidden
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a network/termination error that should be retried
      const isRetryableError =
        lastError.message.includes('terminated') ||
        lastError.message.includes('signal') ||
        lastError.message.includes('network') ||
        lastError.message.includes('abort') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('Failed to fetch');

      if (!isRetryableError || attempt === maxRetries) {
        throw lastError;
      }

      // Longer delay when retrying to give Modal time to recover
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

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
  const isVisibleRef = useRef(true);
  const [failedScenes, setFailedScenes] = useState<number[]>([]);

  // Background job state (Inngest)
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const [backgroundJobProgress, setBackgroundJobProgress] = useState(0);
  const [backgroundJobStatus, setBackgroundJobStatus] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      console.log(`[Visibility] Tab is now ${isVisibleRef.current ? 'visible' : 'hidden'}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Check for existing background job on mount
  useEffect(() => {
    const checkExistingJob = async () => {
      try {
        const response = await fetch(`/api/jobs/generate-images?projectId=${project.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.activeJob) {
            setBackgroundJobId(data.activeJob.id);
            setBackgroundJobProgress(data.activeJob.progress);
            setBackgroundJobStatus(data.activeJob.status);
            startPolling(data.activeJob.id);
          }
        }
      } catch (error) {
        console.error('Error checking for existing job:', error);
      }
    };
    checkExistingJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Start polling for job status
  const startPolling = useCallback((jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/generate-images?jobId=${jobId}`);
        if (response.ok) {
          const job = await response.json();
          setBackgroundJobProgress(job.progress);
          setBackgroundJobStatus(job.status);

          // If job is complete, stop polling and refresh scenes
          if (job.status === 'completed' || job.status === 'completed_with_errors' || job.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            // Trigger a refresh of the project data
            window.dispatchEvent(new CustomEvent('credits-updated'));

            // Show completion message
            if (job.status === 'completed') {
              alert(`All ${job.completedScenes} images generated successfully!`);
            } else if (job.status === 'completed_with_errors') {
              alert(`Generation complete: ${job.completedScenes} succeeded, ${job.failedScenes} failed.`);
            } else {
              alert('Image generation failed. Please try again.');
            }

            setBackgroundJobId(null);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    // Poll immediately then every 3 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 3000);
  }, []);

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

  // Generate image for a single scene with retry logic
  const handleGenerateSceneImage = useCallback(async (scene: Scene) => {
    setGeneratingImageForScene(scene.id);

    try {
      const referenceImages = project.characters
        .filter((c) => c.imageUrl)
        .map((c) => ({
          name: c.name,
          imageUrl: c.imageUrl!,
        }));

      const response = await fetchWithRetry(
        '/api/image',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: scene.textToImagePrompt,
            aspectRatio: sceneAspectRatio,
            resolution: imageResolution,
            projectId: project.id,
            referenceImages,
          }),
        },
        MAX_RETRIES
      );

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

  // Generate all scene images with retry logic and visibility handling
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
    const newFailedScenes: number[] = [];

    try {
      for (const scene of scenesWithoutImages) {
        if (stopGenerationRef.current) {
          console.log('Image generation stopped by user');
          break;
        }

        setGeneratingImageForScene(scene.id);
        console.log(`[Scene ${scene.number}] Starting image generation... (tab visible: ${isVisibleRef.current})`);

        try {
          const response = await fetchWithRetry(
            '/api/image',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: scene.textToImagePrompt,
                aspectRatio: sceneAspectRatio,
                resolution: imageResolution,
                projectId: project.id,
                referenceImages,
              }),
            },
            MAX_RETRIES
          );

          const isInsufficientCredits = await handleApiResponse(response);
          if (isInsufficientCredits) {
            break;
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            const errorMessage = errorData?.error || errorData?.message || 'Unknown error';
            console.error(`[Scene ${scene.number}] Failed: ${errorMessage}`);
            newFailedScenes.push(scene.number);
            continue;
          }

          const { imageUrl } = await response.json();
          await updateScene(project.id, scene.id, { imageUrl });
          console.log(`[Scene ${scene.number}] Image saved to DB`);

          window.dispatchEvent(new CustomEvent('credits-updated'));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Scene ${scene.number}] Error after retries: ${errorMessage}`);
          newFailedScenes.push(scene.number);
        }

        // Small delay between scenes
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error generating scene images:', error);
    } finally {
      setGeneratingImageForScene(null);
      setIsGeneratingAllImages(false);
      stopGenerationRef.current = false;
      setFailedScenes(newFailedScenes);

      // Show summary of failed scenes if any
      if (newFailedScenes.length > 0) {
        alert(`Generation complete. ${newFailedScenes.length} scene(s) failed: ${newFailedScenes.join(', ')}. You can retry by clicking "Generate All Images" again.`);
      }
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

  // Start background generation (Inngest) - works even when tab is closed
  const handleStartBackgroundGeneration = useCallback(async () => {
    if (backgroundJobId) {
      alert('A background job is already running. Please wait for it to complete.');
      return;
    }

    const scenesWithoutImages = project.scenes.filter((s) => !s.imageUrl);
    if (scenesWithoutImages.length === 0) {
      alert('All scenes already have images');
      return;
    }

    try {
      const response = await fetch('/api/jobs/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          aspectRatio: sceneAspectRatio,
          resolution: imageResolution,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start background generation');
      }

      const { jobId, totalScenes } = await response.json();

      setBackgroundJobId(jobId);
      setBackgroundJobProgress(0);
      setBackgroundJobStatus('pending');
      startPolling(jobId);

      console.log(`[Background] Started job ${jobId} for ${totalScenes} scenes`);
      alert(`Background generation started for ${totalScenes} scenes. You can safely close this tab - generation will continue on the server.`);

    } catch (error) {
      console.error('Error starting background generation:', error);
      alert(`Failed to start background generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [project, backgroundJobId, sceneAspectRatio, imageResolution, startPolling]);

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
    failedScenes,

    // Background Job State (Inngest)
    backgroundJobId,
    backgroundJobProgress,
    backgroundJobStatus,
    isBackgroundJobRunning: !!backgroundJobId && ['pending', 'processing'].includes(backgroundJobStatus || ''),

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
    handleStartBackgroundGeneration,
    deleteScene: (sceneId: string) => deleteScene(project.id, sceneId),
    updateSettings: (settings: Parameters<typeof updateSettings>[1]) => updateSettings(project.id, settings),
  };
}
