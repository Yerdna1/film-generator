'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import { SCENES_PER_PAGE } from '@/lib/constants/workflow';
import type { Project, Scene } from '@/types/project';
import type { VideoMode, VideoStatus, SceneVideoState } from '../types';

export function useVideoGenerator(initialProject: Project) {
  const { updateScene, projects } = useProjectStore();
  const { handleApiResponse, handleBulkApiResponse } = useCredits();

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  // Store may contain summary data without scenes
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

  // Safe accessor for scenes array
  const scenes = project.scenes || [];

  // State
  const [videoStates, setVideoStates] = useState<SceneVideoState>({});
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [videoMode, setVideoMode] = useState<VideoMode>('normal');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());

  // Refs
  const stopGenerationRef = useRef(false);
  const videoBlobCache = useRef<Map<string, string>>(new Map());

  // Computed values
  const scenesWithImages = scenes.filter((s) => s.imageUrl);
  const scenesWithVideos = scenes.filter((s) => s.videoUrl);

  // Pagination
  const totalPages = Math.ceil(scenes.length / SCENES_PER_PAGE);
  const startIndex = (currentPage - 1) * SCENES_PER_PAGE;
  const endIndex = startIndex + SCENES_PER_PAGE;
  const paginatedScenes = scenes.slice(startIndex, endIndex);

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
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene?.videoUrl) return 'complete';
    return (videoStates[sceneId]?.status as VideoStatus) || 'idle';
  }, [scenes, videoStates]);

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
  const pollForVideoCompletion = useCallback(async (
    taskId: string,
    sceneId: string,
    isRegeneration: boolean = false
  ): Promise<string | null> => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const progress = 50 + (i / maxAttempts) * 50;
      setVideoStates((prev) => ({
        ...prev,
        [sceneId]: { status: 'generating', progress: Math.min(progress, 95) },
      }));

      try {
        // Pass isRegeneration and sceneId for credit tracking
        const params = new URLSearchParams({
          taskId,
          projectId: project.id,
          isRegeneration: String(isRegeneration),
          sceneId,
        });
        const response = await fetch(`/api/video?${params}`);
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
  // bulkContext is optional - when provided, uses bulk handler for insufficient credits modal
  const generateSceneVideo = useCallback(async (
    scene: Scene,
    forceRegenerationOrBulkContext: boolean | { projectId: string; scenes: Array<{ id: string; title: string; number: number; imageUrl?: string | null }>; targetType: 'video' } = false,
    skipCreditCheck = false
  ) => {
    if (!scene.imageUrl) return;

    // Handle both overload patterns
    const forceRegeneration = typeof forceRegenerationOrBulkContext === 'boolean' ? forceRegenerationOrBulkContext : false;
    const bulkContext = typeof forceRegenerationOrBulkContext === 'object' ? forceRegenerationOrBulkContext : null;

    // Detect if this is a regeneration (scene already has a video)
    const isRegeneration = forceRegeneration || !!scene.videoUrl;

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
      // Use model configuration if available
      const modelConfig = project.modelConfig;
      const videoProvider = modelConfig?.video?.provider;
      const videoModel = modelConfig?.video?.model;

      // Use unified video endpoint - routes based on user's videoProvider setting
      const response = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: scene.imageUrl,
          prompt: fullPrompt,
          mode: videoMode,
          projectId: project.id,
          isRegeneration,
          sceneId: scene.id,
          skipCreditCheck, // Skip credit check when user provides own API key
          ...(videoProvider && { videoProvider }), // Include provider from model config
          ...(videoModel && { model: videoModel }), // Include model from config
        }),
      });

      // Use bulk or single context based on what was provided
      let isInsufficientCredits: boolean;
      if (bulkContext) {
        isInsufficientCredits = await handleBulkApiResponse(response, bulkContext);
      } else {
        isInsufficientCredits = await handleApiResponse(response, {
          projectId: project.id,
          sceneId: scene.id,
          sceneName: scene.title,
          sceneNumber: scene.number,
          targetType: 'video',
          imageUrl: scene.imageUrl,
        });
      }
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
          // Pass isRegeneration from the response (set during POST)
          const videoUrl = await pollForVideoCompletion(data.taskId, scene.id, data.isRegeneration || isRegeneration);
          if (videoUrl) {
            // Track when video was generated from which image version
            updateScene(project.id, scene.id, {
              videoUrl,
              videoGeneratedFromImageAt: scene.imageUpdatedAt || new Date().toISOString(),
            });
            setVideoStates((prev) => ({
              ...prev,
              [scene.id]: { status: 'complete', progress: 100 },
            }));
            window.dispatchEvent(new CustomEvent('credits-updated'));
            return;
          }
        }

        if (data.videoUrl) {
          // Track when video was generated from which image version
          updateScene(project.id, scene.id, {
            videoUrl: data.videoUrl,
            videoGeneratedFromImageAt: scene.imageUpdatedAt || new Date().toISOString(),
          });
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
  }, [project.id, videoMode, buildFullI2VPrompt, handleApiResponse, handleBulkApiResponse, pollForVideoCompletion, updateScene]);

  // Handle generate video for a single scene
  const handleGenerateVideo = useCallback(async (scene: Scene, skipCreditCheck = false) => {
    if (!scene.imageUrl) return;
    await generateSceneVideo(scene, false, skipCreditCheck);
  }, [generateSceneVideo]);

  // Handle generate all videos
  const handleGenerateAll = useCallback(async (skipCreditCheck = false) => {
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
        await generateSceneVideo(scene, false, skipCreditCheck);
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

  // Selection functions
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

  const selectAll = useCallback(() => {
    const allIds = scenesWithImages.map(s => s.id);
    setSelectedScenes(new Set(allIds));
  }, [scenesWithImages]);

  const selectAllWithVideos = useCallback(() => {
    const ids = scenesWithVideos.map(s => s.id);
    setSelectedScenes(new Set(ids));
  }, [scenesWithVideos]);

  const selectAllWithoutVideos = useCallback(() => {
    const ids = scenesWithImages.filter(s => !s.videoUrl).map(s => s.id);
    setSelectedScenes(new Set(ids));
  }, [scenesWithImages]);

  const clearSelection = useCallback(() => {
    setSelectedScenes(new Set());
  }, []);

  // Generate selected videos
  const handleGenerateSelected = useCallback(async (skipCreditCheck = false) => {
    if (selectedScenes.size === 0) return;
    if (isGeneratingAll) return;

    setIsGeneratingAll(true);
    stopGenerationRef.current = false;

    const RATE_LIMIT_DELAY_MS = 1500;
    const scenesToGenerate = scenesWithImages.filter(s => selectedScenes.has(s.id));

    for (const scene of scenesToGenerate) {
      if (stopGenerationRef.current) break;

      // Generate the video using generateSceneVideo with skipCreditCheck
      await generateSceneVideo(scene, false, skipCreditCheck);
      // Remove from selection after generation
      setSelectedScenes(prev => {
        const newSet = new Set(prev);
        newSet.delete(scene.id);
        return newSet;
      });
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    setIsGeneratingAll(false);
    stopGenerationRef.current = false;
  }, [selectedScenes, scenesWithImages, isGeneratingAll, generateSceneVideo]);

  return {
    // Project data
    project,
    scenes,  // Safe accessor for project.scenes
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

    // Selection
    selectedScenes,
    toggleSceneSelection,
    selectAll,
    selectAllWithVideos,
    selectAllWithoutVideos,
    clearSelection,
    handleGenerateSelected,
  };
}
