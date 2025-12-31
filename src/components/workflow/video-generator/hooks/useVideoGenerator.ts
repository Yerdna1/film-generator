'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import { SCENES_PER_PAGE } from '@/lib/constants/workflow';
import type { Project, Scene } from '@/types/project';
import type { VideoMode, VideoStatus, SceneVideoState } from '../types';

export function useVideoGenerator(initialProject: Project) {
  const { updateScene, projects } = useProjectStore();
  const { handleApiResponse } = useCredits();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  // State
  const [videoStates, setVideoStates] = useState<SceneVideoState>({});
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [videoMode, setVideoMode] = useState<VideoMode>('normal');
  const [currentPage, setCurrentPage] = useState(1);

  // Refs
  const stopGenerationRef = useRef(false);
  const videoBlobCache = useRef<Map<string, string>>(new Map());

  // Computed values
  const scenesWithImages = project.scenes.filter((s) => s.imageUrl);
  const scenesWithVideos = project.scenes.filter((s) => s.videoUrl);

  // Pagination
  const totalPages = Math.ceil(project.scenes.length / SCENES_PER_PAGE);
  const startIndex = (currentPage - 1) * SCENES_PER_PAGE;
  const endIndex = startIndex + SCENES_PER_PAGE;
  const paginatedScenes = project.scenes.slice(startIndex, endIndex);

  // Scenes needing generation
  const scenesNeedingGeneration = scenesWithImages.filter((s) => {
    const status = videoStates[s.id]?.status;
    return !s.videoUrl || status === 'error';
  });

  // Get cached video URL
  const getCachedVideoUrl = useCallback((originalUrl: string): string => {
    if (videoBlobCache.current.has(originalUrl)) {
      return videoBlobCache.current.get(originalUrl)!;
    }
    return originalUrl;
  }, []);

  // Prefetch videos for current page
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const prefetchVideos = async () => {
      for (const scene of paginatedScenes) {
        if (!isMounted) break;

        if (scene.videoUrl && !videoBlobCache.current.has(scene.videoUrl)) {
          try {
            if (scene.videoUrl.startsWith('blob:') || scene.videoUrl.startsWith('data:')) {
              continue;
            }

            const response = await fetch(scene.videoUrl, { signal: abortController.signal });
            if (response.ok && isMounted) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              videoBlobCache.current.set(scene.videoUrl, blobUrl);
              if (isMounted) {
                setVideoStates(prev => ({ ...prev }));
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              continue;
            }
            console.warn(`Failed to cache video for scene ${scene.id}:`, error);
          }
        }
      }
    };

    prefetchVideos();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentPage, paginatedScenes]);

  // Get scene status
  const getSceneStatus = useCallback((sceneId: string): VideoStatus => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (scene?.videoUrl) return 'complete';
    return (videoStates[sceneId]?.status as VideoStatus) || 'idle';
  }, [project.scenes, videoStates]);

  // Build full I2V prompt with dialogue
  const buildFullI2VPrompt = useCallback((scene: Scene): string => {
    let prompt = scene.imageToVideoPrompt || '';

    if (scene.dialogue && scene.dialogue.length > 0) {
      const dialogueText = scene.dialogue
        .map((d) => `${d.characterName}: "${d.text}"`)
        .join('\n');
      prompt += `\n\nDialogue:\n${dialogueText}`;
    }

    return prompt;
  }, []);

  // Poll for video completion
  const pollForVideoCompletion = useCallback(async (taskId: string, sceneId: string): Promise<string | null> => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const progress = 50 + (i / maxAttempts) * 50;
      setVideoStates((prev) => ({
        ...prev,
        [sceneId]: { status: 'generating', progress: Math.min(progress, 95) },
      }));

      try {
        const response = await fetch(`/api/video?taskId=${taskId}&projectId=${project.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'complete' && data.videoUrl) {
            return data.videoUrl;
          }
          if (data.status === 'error') {
            throw new Error('Video generation failed');
          }
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        return null;
      }
    }
    return null;
  }, [project.id]);

  // Generate video for a scene
  const generateSceneVideo = useCallback(async (scene: Scene) => {
    if (!scene.imageUrl) return;

    setVideoStates((prev) => ({
      ...prev,
      [scene.id]: { status: 'generating', progress: 10 },
    }));

    try {
      setVideoStates((prev) => ({
        ...prev,
        [scene.id]: { status: 'generating', progress: 30 },
      }));

      const fullPrompt = buildFullI2VPrompt(scene);
      // Use unified video endpoint - routes based on user's videoProvider setting
      const response = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: scene.imageUrl,
          prompt: fullPrompt,
          mode: videoMode,
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        setVideoStates((prev) => ({
          ...prev,
          [scene.id]: { status: 'idle', progress: 0 },
        }));
        return;
      }

      setVideoStates((prev) => ({
        ...prev,
        [scene.id]: { status: 'generating', progress: 50 },
      }));

      if (response.ok) {
        const data = await response.json();

        if (data.taskId && data.status === 'processing') {
          const videoUrl = await pollForVideoCompletion(data.taskId, scene.id);
          if (videoUrl) {
            updateScene(project.id, scene.id, { videoUrl });
            setVideoStates((prev) => ({
              ...prev,
              [scene.id]: { status: 'complete', progress: 100 },
            }));
            window.dispatchEvent(new CustomEvent('credits-updated'));
            return;
          }
        }

        if (data.videoUrl) {
          updateScene(project.id, scene.id, { videoUrl: data.videoUrl });
          setVideoStates((prev) => ({
            ...prev,
            [scene.id]: { status: 'complete', progress: 100 },
          }));
          window.dispatchEvent(new CustomEvent('credits-updated'));
          return;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      console.warn('Video generation API failed:', errorData);
      setVideoStates((prev) => ({
        ...prev,
        [scene.id]: {
          status: 'error',
          progress: 0,
          error: errorData.error || 'Video API not configured - check Settings'
        },
      }));
    } catch (error) {
      console.error('Error generating video:', error);
      setVideoStates((prev) => ({
        ...prev,
        [scene.id]: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Generation failed'
        },
      }));
    }
  }, [project.id, videoMode, buildFullI2VPrompt, handleApiResponse, pollForVideoCompletion, updateScene]);

  // Handle generate video for a single scene
  const handleGenerateVideo = useCallback(async (scene: Scene) => {
    if (!scene.imageUrl) return;
    await generateSceneVideo(scene);
  }, [generateSceneVideo]);

  // Handle generate all videos
  const handleGenerateAll = useCallback(async () => {
    if (isGeneratingAll) {
      console.log('Video generation already in progress, ignoring duplicate call');
      return;
    }

    setIsGeneratingAll(true);
    stopGenerationRef.current = false;

    const RATE_LIMIT_DELAY_MS = 1500;

    for (const scene of scenesWithImages) {
      if (stopGenerationRef.current) {
        console.log('Video generation stopped by user');
        break;
      }

      const currentStatus = videoStates[scene.id]?.status;
      const needsGeneration = !scene.videoUrl || currentStatus === 'error';

      if (needsGeneration) {
        await generateSceneVideo(scene);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }
    setIsGeneratingAll(false);
    stopGenerationRef.current = false;
  }, [isGeneratingAll, scenesWithImages, videoStates, generateSceneVideo]);

  // Handle stop generation
  const handleStopGeneration = useCallback(() => {
    stopGenerationRef.current = true;
    console.log('Stop generation requested');
  }, []);

  return {
    // Project data
    project,
    scenesWithImages,
    scenesWithVideos,
    scenesNeedingGeneration,
    paginatedScenes,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,

    // State
    videoStates,
    playingVideo,
    setPlayingVideo,
    isGeneratingAll,
    videoMode,
    setVideoMode,

    // Helpers
    getSceneStatus,
    getCachedVideoUrl,
    buildFullI2VPrompt,
    videoBlobCache,

    // Actions
    handleGenerateVideo,
    handleGenerateAll,
    handleStopGeneration,
  };
}
