import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { toast } from '@/lib/toast';
import type { Project } from '@/types/project';

export interface ImageJobState {
  backgroundJobId: string | null;
  backgroundJobProgress: number;
  backgroundJobStatus: string | null;
  isBackgroundJobRunning: boolean;
}

export interface ImageJobActions {
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

/**
 * Hook for polling image generation job status
 * Manages background job state for image generation via Inngest
 */
export function useImageJobPolling(project: Project) {
  const { updateScene } = useProjectStore();
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const [backgroundJobProgress, setBackgroundJobProgress] = useState(0);
  const [backgroundJobStatus, setBackgroundJobStatus] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  /**
   * Start polling for image generation job status
   */
  const startPolling = useCallback((jobId: string) => {
    console.log('[ImageJobPolling] Starting polling for jobId:', jobId);
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
              toast.success(`All ${job.completedScenes} images generated successfully!`);
            } else if (job.status === 'completed_with_errors') {
              toast.warning(`Generation complete: ${job.completedScenes} succeeded, ${job.failedScenes} failed.`);
            } else {
              toast.error('Image generation failed', {
                description: 'Please try again.',
              });
            }

            setBackgroundJobId(null);
          }
        }
      } catch (error) {
        console.error('Error polling image job status:', error);
      }
    };

    // Poll immediately then every 3 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 3000);
  }, [project.id, updateScene]);

  /**
   * Stop polling for image generation job
   */
  const stopPolling = useCallback(() => {
    console.log('[ImageJobPolling] Stopping polling');
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setBackgroundJobId(null);
    setBackgroundJobStatus(null);
    setBackgroundJobProgress(0);
  }, []);

  const state: ImageJobState = {
    backgroundJobId,
    backgroundJobProgress,
    backgroundJobStatus,
    isBackgroundJobRunning: !!backgroundJobId && ['pending', 'processing'].includes(backgroundJobStatus || ''),
  };

  const actions: ImageJobActions = {
    startPolling,
    stopPolling,
  };

  return { state, actions };
}
