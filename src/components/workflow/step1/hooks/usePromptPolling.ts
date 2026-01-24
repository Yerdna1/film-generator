import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';
import { toast } from '@/lib/toast';

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_DURATION = 300000; // 5 minutes

export function usePromptPolling(project: Project) {
  const store = useProjectStore();

  // Prompt generation job state
  const [promptJobId, setPromptJobId] = useState<string | null>(null);
  const [promptJobProgress, setPromptJobProgress] = useState(0);
  const [promptJobStatus, setPromptJobStatus] = useState<string | null>(null);
  const promptPollInterval = useRef<NodeJS.Timeout | null>(null);
  const promptJobStartTime = useRef<number | null>(null);

  // Computed state
  const isPromptJobRunning = !!promptJobId && promptJobStatus !== 'completed' && promptJobStatus !== 'failed';

  // Poll for prompt generation job status
  const pollPromptJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/generate-prompt?jobId=${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const { job } = await response.json();

      // Update status
      setPromptJobStatus(job.status);
      setPromptJobProgress(job.progress || 0);

      // Check if job is complete
      if (job.status === 'completed') {
        console.log('[Prompt Polling] Job completed successfully');

        // Refresh the project data to get the generated prompt
        if (job.hasMasterPrompt) {
          // Fetch the updated project to get the master prompt
          const projectResponse = await fetch(`/api/projects/${project.id}`);
          if (projectResponse.ok) {
            const updatedProject = await projectResponse.json();
            if (updatedProject.masterPrompt) {
              store.setMasterPrompt(project.id, updatedProject.masterPrompt);

              // Show success toast
              toast.success('Master prompt generated successfully!', {
                description: 'You can now proceed to Step 2 to create characters.',
              });

              // Auto-advance to Step 2
              setTimeout(() => {
                store.nextStep(project.id);
              }, 1500);
            }
          }
        }

        // Clear polling
        stopPromptJobPolling();
      } else if (job.status === 'failed') {
        console.error('[Prompt Polling] Job failed:', job.errorDetails);
        toast.error('Prompt generation failed', {
          description: job.errorDetails || 'An error occurred while generating the prompt.',
        });
        stopPromptJobPolling();
      } else {
        // Check for timeout
        const now = Date.now();
        if (promptJobStartTime.current && now - promptJobStartTime.current > MAX_POLL_DURATION) {
          console.log('[Prompt Polling] Job timeout reached');
          toast.error('Generation timeout', {
            description: 'The prompt generation is taking too long. Please try again.',
          });
          stopPromptJobPolling();
        }
      }
    } catch (error) {
      console.error('[Prompt Polling] Error polling job status:', error);
      // Don't stop polling on network errors
    }
  }, [project.id, store]);

  // Start polling for prompt generation job
  const startPromptJobPolling = useCallback((jobId: string) => {
    console.log('[Prompt Polling] Starting to poll job:', jobId);
    setPromptJobId(jobId);
    setPromptJobStatus('pending');
    setPromptJobProgress(0);
    promptJobStartTime.current = Date.now();

    // Clear any existing interval
    if (promptPollInterval.current) {
      clearInterval(promptPollInterval.current);
    }

    // Poll immediately
    pollPromptJobStatus(jobId);

    // Then poll every POLL_INTERVAL
    promptPollInterval.current = setInterval(() => {
      pollPromptJobStatus(jobId);
    }, POLL_INTERVAL);
  }, [pollPromptJobStatus]);

  // Stop polling for prompt generation job
  const stopPromptJobPolling = useCallback(() => {
    console.log('[Prompt Polling] Stopping prompt job polling');
    if (promptPollInterval.current) {
      clearInterval(promptPollInterval.current);
      promptPollInterval.current = null;
    }
    setPromptJobId(null);
    setPromptJobStatus(null);
    setPromptJobProgress(0);
    promptJobStartTime.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (promptPollInterval.current) {
        clearInterval(promptPollInterval.current);
      }
    };
  }, []);

  return {
    // Prompt job state
    promptJobId,
    promptJobProgress,
    promptJobStatus,
    isPromptJobRunning,

    // Actions
    startPromptJobPolling,
    stopPromptJobPolling,
  };
}