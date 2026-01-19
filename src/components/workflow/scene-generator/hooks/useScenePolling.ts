import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';
import { toast } from 'sonner';

interface PollingHookResult {
  // Background job state (Inngest) - for images
  backgroundJobId: string | null;
  backgroundJobProgress: number;
  backgroundJobStatus: string | null;
  isBackgroundJobRunning: boolean;

  // Scene generation job state (Inngest)
  sceneJobId: string | null;
  sceneJobProgress: number;
  sceneJobStatus: string | null;
  isSceneJobRunning: boolean;

  // Actions
  startPolling: (jobId: string) => void;
  startSceneJobPolling: (jobId: string) => void;
  stopSceneJobPolling: () => void;
  stopBackgroundJobPolling: () => void;
  checkExistingJobs: () => Promise<void>;
}

export function useScenePolling(project: Project): PollingHookResult {
  const { updateScene } = useProjectStore();

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

  // Start polling for image generation job status
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
              toast.success(`All ${job.completedScenes} scenes generated successfully!`);
            } else if (job.status === 'cancelled') {
              // Don't show alert for cancelled jobs as user already knows
              console.log('[Scenes] Job was cancelled');
            } else {
              const errorMessage = job.errorDetails || 'Unknown error';

              if (errorMessage.includes('Insufficient credits')) {
                toast.error('Insufficient Credits', {
                  description: 'Your OpenRouter account has insufficient credits. Please add credits at openrouter.ai.',
                  duration: 8000,
                  action: {
                    label: 'Add Credits',
                    onClick: () => window.open('https://openrouter.ai/credits', '_blank'),
                  },
                });
              } else {
                toast.error('Scene generation failed', {
                  description: errorMessage,
                });
              }
            }

            setSceneJobId(null);
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

  // Stop polling for scene generation job
  const stopSceneJobPolling = useCallback(() => {
    if (sceneJobPollRef.current) {
      clearInterval(sceneJobPollRef.current);
      sceneJobPollRef.current = null;
    }
    setSceneJobId(null);
    setSceneJobStatus(null);
    setSceneJobProgress(0);
    sceneJobStartTime.current = null;
  }, []);

  // Stop polling for background job
  const stopBackgroundJobPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setBackgroundJobId(null);
    setBackgroundJobStatus(null);
    setBackgroundJobProgress(0);
  }, []);

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

  // Combined check for existing jobs
  const checkExistingJobs = useCallback(async () => {
    try {
      const [imageJobResponse, sceneJobResponse] = await Promise.all([
        fetch(`/api/jobs/generate-images?projectId=${project.id}`),
        fetch(`/api/jobs/generate-scenes?projectId=${project.id}`)
      ]);

      if (imageJobResponse.ok) {
        const imageData = await imageJobResponse.json();
        if (imageData.activeJob) {
          setBackgroundJobId(imageData.activeJob.id);
          setBackgroundJobProgress(imageData.activeJob.progress);
          setBackgroundJobStatus(imageData.activeJob.status);
          startPolling(imageData.activeJob.id);
        }
      }

      if (sceneJobResponse.ok) {
        const sceneData = await sceneJobResponse.json();
        if (sceneData.activeJob) {
          setSceneJobId(sceneData.activeJob.id);
          setSceneJobProgress(sceneData.activeJob.progress);
          setSceneJobStatus(sceneData.activeJob.status);
          startSceneJobPolling(sceneData.activeJob.id);
        }
      }
    } catch (error) {
      console.error('Error checking for existing jobs:', error);
    }
  }, [project.id, startPolling, startSceneJobPolling]);

  return {
    // Background job state (Inngest) - for images
    backgroundJobId,
    backgroundJobProgress,
    backgroundJobStatus,
    isBackgroundJobRunning: !!backgroundJobId && ['pending', 'processing'].includes(backgroundJobStatus || ''),

    // Scene generation job state (Inngest)
    sceneJobId,
    sceneJobProgress,
    sceneJobStatus,
    isSceneJobRunning: !!sceneJobId && ['pending', 'processing'].includes(sceneJobStatus || ''),

    // Actions
    startPolling,
    startSceneJobPolling,
    stopSceneJobPolling,
    stopBackgroundJobPolling,
    checkExistingJobs,
  };
}
