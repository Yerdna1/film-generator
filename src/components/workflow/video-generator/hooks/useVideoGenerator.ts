'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import { SCENES_PER_PAGE } from '@/lib/constants/workflow';
import type { Project, Scene } from '@/types/project';
import type { VideoMode } from '../types';
import type { VideoGenerationJob } from '@/types/job';

// Simplified hook that always uses Inngest for all video generation
export function useVideoGenerator(initialProject: Project) {
  const { updateScene, projects } = useProjectStore();
  const { handleApiResponse } = useCredits();

  // Get live project data from store
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;
  const scenes = project.scenes || [];

  // State
  const [generatingVideos, setGeneratingVideos] = useState<Set<string>>(new Set());
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<VideoMode>('normal');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());

  // Background job state
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<VideoGenerationJob | null>(null);
  const jobPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Video cache
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
  const scenesNeedingGeneration = scenesWithImages.filter((s) => !s.videoUrl);

  // Generate videos using Inngest
  const generateVideos = useCallback(async (sceneIds: string[]) => {
    if (sceneIds.length === 0) return;

    // Update UI to show generating state
    setGeneratingVideos(prev => {
      const next = new Set(prev);
      sceneIds.forEach(id => next.add(id));
      return next;
    });

    try {
      const response = await fetch('/api/jobs/generate-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          videoMode,
          sceneIds, // Pass specific scene IDs
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        // Clear generating state on error
        setGeneratingVideos(prev => {
          const next = new Set(prev);
          sceneIds.forEach(id => next.delete(id));
          return next;
        });
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start video generation');
      }

      const { jobId } = await response.json();
      setBackgroundJobId(jobId);

      // Start polling immediately
      pollJobStatus(jobId);

      // For single videos, don't show the alert
      if (sceneIds.length === 1) {
        console.log(`[Video Generation] Started job ${jobId} for single scene`);
      } else {
        alert(`Started generating ${sceneIds.length} videos. Progress will be shown below.`);
      }

    } catch (error) {
      console.error('Error starting video generation:', error);
      alert(`Failed to start video generation: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Clear generating state on error
      setGeneratingVideos(prev => {
        const next = new Set(prev);
        sceneIds.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [project.id, videoMode, handleApiResponse]);

  // Generate video for a single scene
  const handleGenerateVideo = useCallback(async (scene: Scene) => {
    if (!scene.imageUrl) return;
    await generateVideos([scene.id]);
  }, [generateVideos]);

  // Generate all videos
  const handleGenerateAll = useCallback(async () => {
    if (scenesNeedingGeneration.length === 0) {
      alert('All scenes already have videos');
      return;
    }

    const sceneIds = scenesNeedingGeneration.map(s => s.id);
    await generateVideos(sceneIds);
  }, [scenesNeedingGeneration, generateVideos]);

  // Generate selected videos
  const handleGenerateSelected = useCallback(async () => {
    if (selectedScenes.size === 0) return;

    const sceneIds = Array.from(selectedScenes);
    const validScenes = scenes.filter(s => sceneIds.includes(s.id) && s.imageUrl);

    if (validScenes.length === 0) {
      alert('Selected scenes need images first');
      return;
    }

    await generateVideos(validScenes.map(s => s.id));
    setSelectedScenes(new Set()); // Clear selection after starting
  }, [selectedScenes, scenes, generateVideos]);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    // Clear any existing polling
    if (jobPollingIntervalRef.current) {
      clearInterval(jobPollingIntervalRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/generate-videos?jobId=${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch job status');

        const { job } = await response.json();
        setJobStatus(job);

        // Update generating state based on job progress
        if (job.status === 'processing') {
          // Keep the generating state
        } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled' || job.status === 'completed_with_errors') {
          // Clear all generating states
          setGeneratingVideos(new Set());

          // Clear polling
          if (jobPollingIntervalRef.current) {
            clearInterval(jobPollingIntervalRef.current);
            jobPollingIntervalRef.current = null;
          }

          // Clear job ID
          setBackgroundJobId(null);

          // Refresh the page to show updated videos
          if (job.status === 'completed' || job.status === 'completed_with_errors') {
            window.location.reload();
          }

          // Show completion message
          if (job.status === 'failed' && job.errorDetails) {
            alert(`Video generation failed: ${job.errorDetails}`);
          } else if (job.status === 'completed_with_errors' && job.errorDetails) {
            alert(`Video generation completed with errors: ${job.errorDetails}`);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    // Poll immediately
    poll();

    // Then poll every 3 seconds
    jobPollingIntervalRef.current = setInterval(poll, 3000);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (jobPollingIntervalRef.current) {
        clearInterval(jobPollingIntervalRef.current);
      }
    };
  }, []);

  // Get cached video URL
  const getCachedVideoUrl = useCallback((originalUrl: string): string => {
    if (videoBlobCache.current.has(originalUrl)) {
      return videoBlobCache.current.get(originalUrl)!;
    }
    return originalUrl;
  }, []);

  // Check if scene is generating
  const getSceneStatus = useCallback((sceneId: string): 'idle' | 'generating' | 'complete' | 'error' => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene?.videoUrl) return 'complete';
    if (generatingVideos.has(sceneId)) return 'generating';
    return 'idle';
  }, [scenes, generatingVideos]);

  // Build full I2V prompt
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

  return {
    // Project data
    project,
    scenes,
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
    videoStates: {}, // Kept for compatibility, but not used
    playingVideo,
    setPlayingVideo,
    isGeneratingAll: backgroundJobId !== null,
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
    handleStopGeneration: () => {}, // No longer needed with Inngest

    // Selection
    selectedScenes,
    toggleSceneSelection,
    selectAll,
    selectAllWithVideos,
    selectAllWithoutVideos,
    clearSelection,
    handleGenerateSelected,

    // Background generation (now used for all generation)
    backgroundJobId,
    backgroundJobStatus: jobStatus,
    startBackgroundGeneration: handleGenerateAll, // Alias for consistency
    cancelBackgroundJob: () => {}, // Not implemented yet
  };
}