import { useState, useRef, useCallback, useEffect } from 'react';
import { useCredits } from '@/contexts/CreditsContext';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, Scene } from '@/types/project';
import type { ImageResolution, AspectRatio } from '@/types/project';
import { fetchWithRetry, MAX_RETRIES } from './utils';

interface ImageGenerationHookResult {
  isGeneratingAllImages: boolean;
  generatingImageForScene: string | null;
  failedScenes: number[];
  handleGenerateSceneImage: (scene: Scene) => Promise<void>;
  handleGenerateAllSceneImages: () => Promise<void>;
  handleStopImageGeneration: () => void;
  handleRegenerateAllImages: () => Promise<void>;
  handleRegenerateSelected: (selectedScenes: Set<string>, setSelectedScenes: (setter: (prev: Set<string>) => Set<string>) => void) => Promise<void>;
  handleStartBackgroundGeneration: (limit?: number, backgroundJobId?: string | null, startPolling?: (jobId: string) => void) => Promise<void>;
  handleGenerateBatch: (batchSize: number, handleStartBg: (limit?: number) => Promise<void>) => void;
  handleCancelSceneGeneration: (sceneJobId: string | null, setIsGenerating: (value: boolean) => void, setSceneJobId: (value: string | null) => void, sceneJobPollRef: React.MutableRefObject<NodeJS.Timeout | null>) => Promise<void>;
  isVisibleRef: React.MutableRefObject<boolean>;
}

export function useImageGeneration(
  project: Project,
  sceneAspectRatio: AspectRatio,
  imageResolution: ImageResolution
): ImageGenerationHookResult {
  const { updateScene } = useProjectStore();
  const { handleApiResponse, handleBulkApiResponse } = useCredits();

  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [generatingImageForScene, setGeneratingImageForScene] = useState<string | null>(null);
  const stopGenerationRef = useRef(false);
  const isVisibleRef = useRef(true);
  const [failedScenes, setFailedScenes] = useState<number[]>([]);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      console.log(`[Visibility] Tab is now ${isVisibleRef.current ? 'visible' : 'hidden'}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Generate image for a single scene with retry logic
  const handleGenerateSceneImage = useCallback(async (scene: Scene) => {
    if (!scene.textToImagePrompt?.trim()) {
      alert('This scene has no prompt. Please regenerate the prompt first or edit the scene.');
      return;
    }

    setGeneratingImageForScene(scene.id);

    try {
      const referenceImages = project.characters
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

    const scenesWithoutImages = (project.scenes || []).filter((s) => !s.imageUrl);
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
    for (const scene of project.scenes || []) {
      if (scene.imageUrl) {
        await updateScene(project.id, scene.id, { imageUrl: undefined });
      }
    }
    // Small delay to ensure state updates
    await new Promise(resolve => setTimeout(resolve, 100));
    // Now generate all
    handleGenerateAllSceneImages();
  }, [project.id, project.scenes, updateScene, handleGenerateAllSceneImages]);

  // Start background generation (Inngest) - works even when tab is closed
  const handleStartBackgroundGeneration = useCallback(async (limit?: number, backgroundJobId: string | null | undefined, startPolling?: (jobId: string) => void) => {
    if (backgroundJobId) {
      alert('A background job is already running. Please wait for it to complete.');
      return;
    }

    const scenesWithoutImages = (project.scenes || []).filter((s) => !s.imageUrl);
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

      if (startPolling) {
        startPolling(jobId);
      }

      console.log(`[Background] Started job ${jobId} for ${totalScenes} scenes`);
      alert(`Background generation started for ${totalScenes} images. You can safely close this tab - generation will continue on the server.`);

    } catch (error) {
      console.error('Error starting background generation:', error);
      alert(`Failed to start background generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [project, sceneAspectRatio, imageResolution]);

  // Generate a batch of images (limited number)
  const handleGenerateBatch = useCallback((batchSize: number, handleStartBg: (limit?: number) => Promise<void>) => {
    handleStartBg(batchSize);
  }, []);

  // Regenerate selected scenes
  const handleRegenerateSelected = useCallback(async (selectedScenes: Set<string>, setSelectedScenes: (setter: (prev: Set<string>) => Set<string>) => void) => {
    if (selectedScenes.size === 0) return;

    const scenesToRegenerate = (project.scenes || []).filter(s => selectedScenes.has(s.id));
    if (scenesToRegenerate.length === 0) return;

    setIsGeneratingAllImages(true);
    stopGenerationRef.current = false;

    // Get character reference images for consistency
    const referenceImages = project.characters
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
            setSelectedScenes((prev) => {
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
  }, [project, sceneAspectRatio, imageResolution, handleBulkApiResponse, updateScene]);

  // Cancel scene generation job
  const handleCancelSceneGeneration = useCallback(async (sceneJobId: string | null, setIsGenerating: (value: boolean) => void, setSceneJobId: (value: string | null) => void, sceneJobPollRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
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
      setIsGenerating(false);

      alert('Scene generation has been cancelled.');
    } catch (error) {
      console.error('Error cancelling scene generation:', error);
      alert(`Failed to cancel scene generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  return {
    isGeneratingAllImages,
    generatingImageForScene,
    failedScenes,
    handleGenerateSceneImage,
    handleGenerateAllSceneImages,
    handleStopImageGeneration,
    handleRegenerateAllImages,
    handleRegenerateSelected,
    handleStartBackgroundGeneration,
    handleGenerateBatch,
    handleCancelSceneGeneration,
    isVisibleRef,
  };
}
