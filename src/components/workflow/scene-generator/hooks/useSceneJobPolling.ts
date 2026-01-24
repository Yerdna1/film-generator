import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from '@/lib/toast';
import type { Project } from '@/types/project';

export interface SceneJobState {
  sceneJobId: string | null;
  sceneJobProgress: number;
  sceneJobStatus: string | null;
  isSceneJobRunning: boolean;
}

export interface SceneJobActions {
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

/**
 * Hook for polling scene generation job status
 * Manages background job state for scene text generation via Inngest
 */
export function useSceneJobPolling(project: Project, refreshProjectData: () => Promise<void>) {
  const [sceneJobId, setSceneJobId] = useState<string | null>(null);
  const [sceneJobProgress, setSceneJobProgress] = useState(0);
  const [sceneJobStatus, setSceneJobStatus] = useState<string | null>(null);
  const sceneJobPollRef = useRef<NodeJS.Timeout | null>(null);
  const sceneJobStartTime = useRef<number | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (sceneJobPollRef.current) {
        clearInterval(sceneJobPollRef.current);
      }
    };
  }, []);

  /**
   * Start polling for scene generation job status
   */
  const startPolling = useCallback((jobId: string) => {
    console.log('[SceneJobPolling] Starting polling for jobId:', jobId);
    if (sceneJobPollRef.current) {
      clearInterval(sceneJobPollRef.current);
    }

    // Set the scene job ID so isSceneJobRunning becomes true
    setSceneJobId(jobId);

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
            console.warn('[SceneJobPolling] Job appears to be stuck in pending state for over 30 seconds');
            // The UI will show the warning message based on the status and progress
          }

          // Refresh project data during processing to show newly generated scenes
          if (job.status === 'processing' && job.completedScenes > 0) {
            await refreshProjectData();
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
              console.log('[SceneJobPolling] Job was cancelled');
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

  /**
   * Stop polling for scene generation job
   */
  const stopPolling = useCallback(() => {
    console.log('[SceneJobPolling] Stopping polling');
    if (sceneJobPollRef.current) {
      clearInterval(sceneJobPollRef.current);
      sceneJobPollRef.current = null;
    }
    setSceneJobId(null);
    setSceneJobStatus(null);
    setSceneJobProgress(0);
    sceneJobStartTime.current = null;
  }, []);

  const state: SceneJobState = {
    sceneJobId,
    sceneJobProgress,
    sceneJobStatus,
    isSceneJobRunning: !!sceneJobId && ['pending', 'processing'].includes(sceneJobStatus || ''),
  };

  const actions: SceneJobActions = {
    startPolling,
    stopPolling,
  };

  return { state, actions };
}
