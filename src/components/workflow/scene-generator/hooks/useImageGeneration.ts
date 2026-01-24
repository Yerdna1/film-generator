'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import type { ImageGenerationJob } from '@/types/job';
import type { AspectRatio, ImageResolution } from '@/lib/services/real-costs';
import { toast } from '@/lib/toast';
import { getProviderDisplayName, getModelDisplayName, formatDuration } from '@/lib/llm/toast-utils';

type GeneratingImageState = {
  [sceneId: string]: boolean;
};

// Simplified hook that always uses Inngest for all image generation
export function useImageGeneration(
  project: { id: string; scenes?: any[]; characters?: any[] },
  sceneAspectRatio: AspectRatio = '16:9',
  imageResolution: ImageResolution = '2k'
) {
  const { updateScene } = useProjectStore();
  const { handleApiResponse } = useCredits();

  // Image generation state
  const [generatingImages, setGeneratingImages] = useState<GeneratingImageState>({});
  const [failedScenes, setFailedScenes] = useState<string[]>([]);

  // Background job state
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ImageGenerationJob | null>(null);
  const jobPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Start image generation for specific scenes using Inngest
  const generateImages = useCallback(async (sceneIds: string[]) => {
    if (sceneIds.length === 0) return;

    // Update UI to show generating state
    const newGeneratingState: GeneratingImageState = {};
    sceneIds.forEach(id => {
      newGeneratingState[id] = true;
    });
    setGeneratingImages(prev => ({ ...prev, ...newGeneratingState }));

    try {
      const response = await fetch('/api/jobs/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          aspectRatio: sceneAspectRatio,
          resolution: imageResolution,
          sceneIds, // Pass specific scene IDs
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        // Clear generating state on error
        sceneIds.forEach(id => {
          setGeneratingImages(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        });
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start image generation');
      }

      const { jobId } = await response.json();
      setBackgroundJobId(jobId);

      // Start polling immediately
      pollJobStatus(jobId);

      // For single images, don't show the alert
      if (sceneIds.length === 1) {
        console.log(`[Image Generation] Started job ${jobId} for single scene`);
      } else {
        toast.info(`Started generating ${sceneIds.length} images`, {
          description: 'Progress will be shown below.',
        });
      }

    } catch (error) {
      console.error('Error starting image generation:', error);
      toast.error('Failed to start image generation', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clear generating state on error
      sceneIds.forEach(id => {
        setGeneratingImages(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      });
    }
  }, [project.id, sceneAspectRatio, imageResolution, handleApiResponse]);

  // Generate image for a single scene
  const handleGenerateSceneImage = useCallback(async (sceneId: string) => {
    await generateImages([sceneId]);
  }, [generateImages]);

  // Generate all images without images
  const handleGenerateAllSceneImages = useCallback(async () => {
    const scenesWithoutImages = (project.scenes || [])
      .filter(s => !s.imageUrl)
      .map(s => s.id);

    if (scenesWithoutImages.length === 0) {
      toast.info('All scenes already have images');
      return;
    }

    await generateImages(scenesWithoutImages);
  }, [project.scenes, generateImages]);

  // Generate batch of images
  const handleGenerateBatch = useCallback(async (batchSize: number) => {
    const scenesWithoutImages = (project.scenes || [])
      .filter(s => !s.imageUrl)
      .slice(0, batchSize)
      .map(s => s.id);

    if (scenesWithoutImages.length === 0) {
      toast.info('All scenes already have images');
      return;
    }

    await generateImages(scenesWithoutImages);
  }, [project.scenes, generateImages]);

  // Regenerate selected scenes
  const handleRegenerateSelected = useCallback(async (selectedScenes: Set<string>) => {
    const sceneIds = Array.from(selectedScenes);
    if (sceneIds.length === 0) return;

    await generateImages(sceneIds);
  }, [generateImages]);

  // Regenerate all images
  const handleRegenerateAllImages = useCallback(async () => {
    const allSceneIds = (project.scenes || []).map(s => s.id);
    if (allSceneIds.length === 0) return;

    const confirmRegenerate = window.confirm(
      `This will regenerate ALL ${allSceneIds.length} images. Are you sure?`
    );
    if (!confirmRegenerate) return;

    await generateImages(allSceneIds);
  }, [project.scenes, generateImages]);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    // Clear any existing polling
    if (jobPollingIntervalRef.current) {
      clearInterval(jobPollingIntervalRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/generate-images?jobId=${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch job status');

        const job = await response.json() as ImageGenerationJob;
        setJobStatus(job);

        // Update generating state based on job progress
        if (job.status === 'processing') {
          // Show loading toast with provider/model info if not already shown
          if (!toastIdRef.current && job.imageProvider && job.imageModel) {
            const providerDisplay = getProviderDisplayName(job.imageProvider);
            const modelDisplay = getModelDisplayName(job.imageModel);

            toastIdRef.current = toast.loading('Generating images...', {
              description: `${providerDisplay} ${modelDisplay}`,
            });
          }
          // Keep the generating state for scenes being processed
        } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'completed_with_errors') {
          // Clear all generating states
          setGeneratingImages({});

          // Clear polling
          if (jobPollingIntervalRef.current) {
            clearInterval(jobPollingIntervalRef.current);
            jobPollingIntervalRef.current = null;
          }

          // Clear job ID
          setBackgroundJobId(null);

          // Calculate duration
          let duration = null;
          if (job.startedAt && job.completedAt) {
            const startTime = new Date(job.startedAt).getTime();
            const endTime = new Date(job.completedAt).getTime();
            duration = endTime - startTime;
          }

          // Show completion toast with provider/model/duration
          if (toastIdRef.current) {
            const providerDisplay = job.imageProvider ? getProviderDisplayName(job.imageProvider) : 'Provider';
            const modelDisplay = job.imageModel ? getModelDisplayName(job.imageModel) : 'Model';
            const durationFormatted = duration ? formatDuration(duration) : null;

            let description = `${providerDisplay} ${modelDisplay}`;
            if (durationFormatted) {
              description += ` • ${durationFormatted}`;
            }

            if (job.status === 'completed') {
              toast.success('Images generated!', {
                id: toastIdRef.current,
                description,
              });
            } else if (job.status === 'completed_with_errors') {
              // Parse error details to get the first meaningful error message
              let firstError = 'Some images failed to generate';
              if (job.errorDetails) {
                try {
                  const errors = JSON.parse(job.errorDetails);
                  if (Array.isArray(errors) && errors.length > 0 && errors[0]?.error) {
                    firstError = errors[0].error;
                  }
                } catch (e) {
                  console.error('Failed to parse errorDetails:', e);
                }
              }

              toast.warning('Generation completed with errors', {
                id: toastIdRef.current,
                description: `${job.failedScenes || 0} failed: ${firstError}`,
              });
            } else if (job.status === 'failed') {
              // Parse error details to get the first meaningful error message
              let errorMessage = job.errorDetails || 'Unknown error';
              if (job.errorDetails) {
                try {
                  const errors = JSON.parse(job.errorDetails);
                  if (Array.isArray(errors) && errors.length > 0 && errors[0]?.error) {
                    errorMessage = errors[0].error;
                  }
                } catch (e) {
                  console.error('Failed to parse errorDetails:', e);
                }
              }

              toast.error('Image generation failed', {
                id: toastIdRef.current,
                description: errorMessage,
              });
            }
            toastIdRef.current = null;
          }

          // Refresh the page to show updated images
          if (job.status === 'completed' || job.status === 'completed_with_errors') {
            setTimeout(() => {
              window.location.reload();
            }, 2000); // Wait 2 seconds to let user see the toast
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    // Poll immediately
    poll();

    // Then poll every 2 seconds
    jobPollingIntervalRef.current = setInterval(poll, 2000);
  }, []);

  // Start polling if we have a job ID
  const startPolling = useCallback((jobId: string) => {
    setBackgroundJobId(jobId);
    pollJobStatus(jobId);
  }, [pollJobStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (jobPollingIntervalRef.current) {
        clearInterval(jobPollingIntervalRef.current);
      }
      // Dismiss toast on unmount
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };
  }, []);

  // Check for active jobs on mount
  useEffect(() => {
    const checkActiveJobs = async () => {
      try {
        const response = await fetch(`/api/jobs/generate-images?projectId=${project.id}`);
        if (response.ok) {
          const { activeJob } = await response.json();
          if (activeJob) {
            setBackgroundJobId(activeJob.id);
            setJobStatus(activeJob);
            pollJobStatus(activeJob.id);
          }
        }
      } catch (error) {
        console.error('Error checking active jobs:', error);
      }
    };

    checkActiveJobs();
  }, [project.id, pollJobStatus]);

  // Helper to check if a scene is generating
  const isSceneGenerating = useCallback((sceneId: string): boolean => {
    return generatingImages[sceneId] || false;
  }, [generatingImages]);

  // Helper to check if any generation is happening
  const isGeneratingAny = useCallback((): boolean => {
    return Object.keys(generatingImages).length > 0 || backgroundJobId !== null;
  }, [generatingImages, backgroundJobId]);

  return {
    // State
    generatingImages,
    failedScenes,
    backgroundJobId,
    jobStatus,
    generatingImageForScene: null, // Deprecated - using generatingImages instead
    isGeneratingAllImages: isGeneratingAny(), // For compatibility

    // Actions
    handleGenerateSceneImage,
    handleGenerateAllSceneImages,
    handleGenerateBatch,
    handleRegenerateSelected,
    handleRegenerateAllImages,
    handleStartBackgroundGeneration: handleGenerateAllSceneImages, // Alias for compatibility
    handleStopImageGeneration: async () => {
      if (backgroundJobId) {
        try {
          // Cancel the job on the server
          await fetch(`/api/jobs/generate-images?jobId=${backgroundJobId}`, {
            method: 'DELETE',
          });

          // Stop local polling
          if (jobPollingIntervalRef.current) {
            clearInterval(jobPollingIntervalRef.current);
            jobPollingIntervalRef.current = null;
          }

          // Clear local state
          setBackgroundJobId(null);
          setJobStatus(null);
          setGeneratingImages({});

          if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
          }

          toast.info('Image generation stopped');
        } catch (error) {
          console.error('Failed to stop image generation:', error);
          toast.error('Failed to stop generation');
        }
      }
    },
    handleCancelSceneGeneration: async () => { }, // No longer needed
    startPolling,

    // Helpers
    isSceneGenerating,
    isGeneratingAny,
  };
}