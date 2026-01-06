'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import { generateScenePrompt } from '@/lib/prompts/master-prompt';
import type { Project, Scene, CameraShot, DialogueLine, AspectRatio } from '@/types/project';
import type { ImageResolution } from '@/lib/services/real-costs';

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
  const { handleApiResponse, handleBulkApiResponse } = useCredits();

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  // Store may contain summary data without scenes
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

  // Safe accessors for arrays that may be undefined in summary data
  const scenes = project.scenes || [];
  const characters = project.characters || [];
  const projectSettings = project.settings || { sceneCount: 12, imageResolution: '2k' };

  // UI State
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);
  const [sceneAspectRatio, setSceneAspectRatio] = useState<AspectRatio>(
    projectSettings.aspectRatio || '16:9'
  );

  // Generation State
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [generatingImageForScene, setGeneratingImageForScene] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const stopGenerationRef = useRef(false);
  const isVisibleRef = useRef(true);
  const [failedScenes, setFailedScenes] = useState<number[]>([]);

  // Selection State for batch regeneration
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());

  // Background job state (Inngest) - for images
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const [backgroundJobProgress, setBackgroundJobProgress] = useState(0);
  const [backgroundJobStatus, setBackgroundJobStatus] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scene generation job state (Inngest)
  const [sceneJobId, setSceneJobId] = useState<string | null>(null);
  const [sceneJobProgress, setSceneJobProgress] = useState(0);
  const [sceneJobStatus, setSceneJobStatus] = useState<string | null>(null);
  const sceneJobPollRef = useRef<NodeJS.Timeout | null>(null);
  const sceneJobStartTime = useRef<number | null>(null);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      console.log(`[Visibility] Tab is now ${isVisibleRef.current ? 'visible' : 'hidden'}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Refresh project data from server with cache bypass
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

  // Check for existing background job on mount (only if job was running)
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

    // Only check for existing jobs - project data is already loaded server-side
    checkExistingJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (sceneJobPollRef.current) {
        clearInterval(sceneJobPollRef.current);
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

            // Trigger a refresh of the project data with cache bypass
            window.dispatchEvent(new CustomEvent('credits-updated'));

            // Reload project data from DB with cache bypass
            try {
              const projectResponse = await fetch(`/api/projects?refresh=true`);
              if (projectResponse.ok) {
                const projects = await projectResponse.json();
                const updatedProject = projects.find((p: { id: string }) => p.id === project.id);
                if (updatedProject) {
                  // Update scenes in store with fresh data from DB
                  for (const scene of updatedProject.scenes) {
                    if (scene.imageUrl) {
                      updateScene(project.id, scene.id, { imageUrl: scene.imageUrl });
                    }
                  }
                }
              }
            } catch (refreshError) {
              console.error('Error refreshing project data:', refreshError);
            }

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
  }, [project.id, updateScene]);

  // Start polling for scene generation job status
  const startSceneJobPolling = useCallback((jobId: string) => {
    if (sceneJobPollRef.current) {
      clearInterval(sceneJobPollRef.current);
    }

    // Record start time for timeout tracking
    sceneJobStartTime.current = Date.now();

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/generate-scenes?jobId=${jobId}`);
        if (response.ok) {
          const job = await response.json();
          setSceneJobProgress(job.progress);
          setSceneJobStatus(job.status);

          // Check for stuck job timeout (30 seconds in pending at 0%)
          if (
            job.status === 'pending' &&
            job.progress === 0 &&
            sceneJobStartTime.current &&
            Date.now() - sceneJobStartTime.current > 30000
          ) {
            console.warn('[Scenes] Job appears to be stuck in pending state for over 30 seconds');
            // The UI will show the warning message based on the status and progress
          }

          // If job is complete, stop polling and refresh scenes
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            if (sceneJobPollRef.current) {
              clearInterval(sceneJobPollRef.current);
              sceneJobPollRef.current = null;
            }

            // Trigger a refresh of the project data with cache bypass
            window.dispatchEvent(new CustomEvent('credits-updated'));

            // Reload scenes from DB
            await refreshProjectData();

            // Show completion message
            if (job.status === 'completed') {
              alert(`All ${job.completedScenes} scenes generated successfully!`);
            } else if (job.status === 'cancelled') {
              // Don't show alert for cancelled jobs as user already knows
              console.log('[Scenes] Job was cancelled');
            } else {
              alert(`Scene generation failed: ${job.errorDetails || 'Unknown error'}`);
            }

            setSceneJobId(null);
            setIsGeneratingScenes(false);
            sceneJobStartTime.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling scene job status:', error);
      }
    };

    // Poll immediately then every 3 seconds
    poll();
    sceneJobPollRef.current = setInterval(poll, 3000);
  }, [refreshProjectData]);

  // Check for existing scene generation job on mount
  useEffect(() => {
    const checkExistingSceneJob = async () => {
      try {
        const response = await fetch(`/api/jobs/generate-scenes?projectId=${project.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.activeJob) {
            setSceneJobId(data.activeJob.id);
            setSceneJobProgress(data.activeJob.progress);
            setSceneJobStatus(data.activeJob.status);
            setIsGeneratingScenes(true);
            startSceneJobPolling(data.activeJob.id);
          }
        }
      } catch (error) {
        console.error('Error checking for existing scene job:', error);
      }
    };

    checkExistingSceneJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // Edit State
  const [editSceneData, setEditSceneData] = useState<EditSceneData | null>(null);

  // Computed values
  const scenesWithImages = scenes.filter((s) => s.imageUrl).length;
  const imageResolution = projectSettings.imageResolution || '2k';

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
      characters
    );

    const sceneNumber = scenes.length + 1;

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
      characters
    );
    updateScene(project.id, scene.id, { textToImagePrompt, imageToVideoPrompt });
  }, [project, characters, updateScene]);

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
    updateSettings(project.id, { sceneCount: parseInt(value) as 12 | 24 | 36 | 48 | 60 | 120 | 240 | 360 });
  }, [project.id, updateSettings]);

  // Generate all scenes with AI via Inngest background job
  const handleGenerateAllScenes = useCallback(async () => {
    if (characters.length === 0) {
      alert('Please add characters in Step 2 first');
      return;
    }

    if (sceneJobId) {
      alert('A scene generation job is already running. Please wait for it to complete.');
      return;
    }

    setIsGeneratingScenes(true);

    try {
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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start scene generation');
      }

      const { jobId, totalScenes } = await response.json();

      setSceneJobId(jobId);
      setSceneJobProgress(0);
      setSceneJobStatus('pending');
      startSceneJobPolling(jobId);

      console.log(`[Scenes] Started background job ${jobId} for ${totalScenes} scenes`);

    } catch (error) {
      console.error('Error starting scene generation:', error);
      alert(`Failed to start scene generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsGeneratingScenes(false);
    }
  }, [project, sceneJobId, startSceneJobPolling]);

  // Generate image for a single scene with retry logic
  const handleGenerateSceneImage = useCallback(async (scene: Scene) => {
    if (!scene.textToImagePrompt?.trim()) {
      alert('This scene has no prompt. Please regenerate the prompt first or edit the scene.');
      return;
    }

    setGeneratingImageForScene(scene.id);

    try {
      const referenceImages = characters
        .filter((c) => c.imageUrl)
        .map((c) => ({
          name: c.name,
          imageUrl: c.imageUrl!,
        }));

      // Detect if this is a regeneration (scene already has an image)
      const isRegeneration = !!scene.imageUrl;

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
            isRegeneration,
            sceneId: scene.id,
          }),
        },
        MAX_RETRIES
      );

      // Pass regeneration context so user can request admin approval if insufficient credits
      const isInsufficientCredits = await handleApiResponse(response, {
        projectId: project.id,
        sceneId: scene.id,
        sceneName: scene.title,
        sceneNumber: scene.number,
        targetType: 'image',
        imageUrl: scene.imageUrl,
      });
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

    const scenesWithoutImages = scenes.filter((s) => !s.imageUrl);
    if (scenesWithoutImages.length === 0) {
      alert('All scenes already have images');
      return;
    }

    const referenceImages = characters
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
                isRegeneration: false, // These are all new generations (scenes without images)
                sceneId: scene.id,
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
    for (const scene of scenes) {
      if (scene.imageUrl) {
        await updateScene(project.id, scene.id, { imageUrl: undefined });
      }
    }
    // Small delay to ensure state updates
    await new Promise(resolve => setTimeout(resolve, 100));
    // Now generate all
    handleGenerateAllSceneImages();
  }, [project.id, scenes, updateScene, handleGenerateAllSceneImages]);

  // Start background generation (Inngest) - works even when tab is closed
  const handleStartBackgroundGeneration = useCallback(async (limit?: number) => {
    if (backgroundJobId) {
      alert('A background job is already running. Please wait for it to complete.');
      return;
    }

    const scenesWithoutImages = scenes.filter((s) => !s.imageUrl);
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
          limit,
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
      alert(`Background generation started for ${totalScenes} images. You can safely close this tab - generation will continue on the server.`);

    } catch (error) {
      console.error('Error starting background generation:', error);
      alert(`Failed to start background generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [project, backgroundJobId, sceneAspectRatio, imageResolution, startPolling]);

  // Generate a batch of images (limited number)
  const handleGenerateBatch = useCallback((batchSize: number) => {
    handleStartBackgroundGeneration(batchSize);
  }, [handleStartBackgroundGeneration]);

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

  const selectAll = useCallback(() => {
    const allIds = scenes.map(s => s.id);
    setSelectedScenes(new Set(allIds));
  }, [scenes]);

  // Regenerate selected scenes
  const handleRegenerateSelected = useCallback(async () => {
    if (selectedScenes.size === 0) return;

    const scenesToRegenerate = scenes.filter(s => selectedScenes.has(s.id));
    if (scenesToRegenerate.length === 0) return;

    setIsGeneratingAllImages(true);
    stopGenerationRef.current = false;

    // Get character reference images for consistency
    const referenceImages = characters
      .filter((c) => c.imageUrl)
      .map((c) => ({
        name: c.name,
        imageUrl: c.imageUrl!,
      }));

    // Prepare bulk context for the case of insufficient credits
    const bulkContext = {
      projectId: project.id,
      scenes: scenesToRegenerate.map(s => ({
        id: s.id,
        title: s.title,
        number: s.number,
        imageUrl: s.imageUrl,
      })),
      targetType: 'image' as const,
    };

    try {
      for (const scene of scenesToRegenerate) {
        if (stopGenerationRef.current) break;

        setGeneratingImageForScene(scene.id);

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
                isRegeneration: true, // This is always a regeneration
                sceneId: scene.id,
              }),
            },
            MAX_RETRIES
          );

          // Use bulk handler to show all selected scenes in the modal
          const isInsufficientCredits = await handleBulkApiResponse(response, bulkContext);
          if (isInsufficientCredits) {
            break;
          }

          if (!response.ok) {
            console.error(`Error regenerating scene ${scene.number}: API returned ${response.status}`);
            continue;
          }

          const data = await response.json();
          if (data.imageUrl) {
            await updateScene(project.id, scene.id, { imageUrl: data.imageUrl });
            // Remove from selection after successful regeneration
            setSelectedScenes(prev => {
              const newSet = new Set(prev);
              newSet.delete(scene.id);
              return newSet;
            });
          }

          window.dispatchEvent(new CustomEvent('credits-updated'));
        } catch (error) {
          console.error(`Error regenerating scene ${scene.number}:`, error);
        }

        setGeneratingImageForScene(null);
      }
    } finally {
      setIsGeneratingAllImages(false);
      setGeneratingImageForScene(null);
    }
  }, [selectedScenes, project, sceneAspectRatio, imageResolution, handleBulkApiResponse, updateScene]);

  // Cancel scene generation job
  const handleCancelSceneGeneration = useCallback(async () => {
    if (!sceneJobId) return;

    try {
      const response = await fetch(`/api/jobs/generate-scenes?jobId=${sceneJobId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel scene generation');
      }

      // Stop polling
      if (sceneJobPollRef.current) {
        clearInterval(sceneJobPollRef.current);
        sceneJobPollRef.current = null;
      }

      // Reset state
      setSceneJobId(null);
      setSceneJobProgress(0);
      setSceneJobStatus(null);
      setIsGeneratingScenes(false);
      sceneJobStartTime.current = null;

      alert('Scene generation has been cancelled.');
    } catch (error) {
      console.error('Error cancelling scene generation:', error);
      alert(`Failed to cancel scene generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [sceneJobId]);

  return {
    // Project data
    project,
    scenes,           // Safe accessor for project.scenes
    characters,       // Safe accessor for project.characters
    projectSettings,  // Safe accessor for project.settings
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

    // Selection State
    selectedScenes,
    toggleSceneSelection,
    clearSelection,
    selectAllWithImages,
    selectAll,
    handleRegenerateSelected,

    // Background Job State (Inngest) - for images
    backgroundJobId,
    backgroundJobProgress,
    backgroundJobStatus,
    isBackgroundJobRunning: !!backgroundJobId && ['pending', 'processing'].includes(backgroundJobStatus || ''),

    // Scene Generation Job State (Inngest)
    sceneJobId,
    sceneJobProgress,
    sceneJobStatus,
    isSceneJobRunning: !!sceneJobId && ['pending', 'processing'].includes(sceneJobStatus || ''),

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
    handleGenerateBatch,
    handleCancelSceneGeneration,
    deleteScene: (sceneId: string) => deleteScene(project.id, sceneId),
    updateSettings: (settings: Parameters<typeof updateSettings>[1]) => updateSettings(project.id, settings),
  };
}
