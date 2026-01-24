import { useRef, useCallback, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { getProviderDisplayName, getModelDisplayName, formatDuration } from '@/lib/llm/toast-utils';
import type { VoiceoverGenerationJob } from './types';
import { parseErrorDetails } from './api-client';

export interface PollingOptions {
  onJobStatusChange: (job: VoiceoverGenerationJob) => void;
  onCompleted?: () => void;
  onPollStart?: (jobId: string) => void;
  onPollEnd?: () => void;
}

/**
 * Hook for polling voiceover generation job status
 */
export function useJobPolling({
  onJobStatusChange,
  onCompleted,
  onPollStart,
  onPollEnd,
}: PollingOptions) {
  const jobPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    // Clear any existing polling
    if (jobPollingIntervalRef.current) {
      clearInterval(jobPollingIntervalRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/voiceover/generate-batch?jobId=${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch job status');

        const job = await response.json() as VoiceoverGenerationJob;
        onJobStatusChange(job);

        // Update generating state based on job progress
        if (job.status === 'processing') {
          // Show loading toast with provider/model info if not already shown
          if (!toastIdRef.current && job.audioProvider && job.audioModel) {
            const providerDisplay = getProviderDisplayName(job.audioProvider);
            const modelDisplay = getModelDisplayName(job.audioModel);

            toastIdRef.current = toast.loading('Generating voiceovers...', {
              description: `${providerDisplay} ${modelDisplay}`,
            });
          }
        } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'completed_with_errors') {
          // Clear polling
          if (jobPollingIntervalRef.current) {
            clearInterval(jobPollingIntervalRef.current);
            jobPollingIntervalRef.current = null;
          }

          // Call poll end callback
          onPollEnd?.();

          // Calculate duration
          let duration = null;
          if (job.startedAt && job.completedAt) {
            const startTime = new Date(job.startedAt).getTime();
            const endTime = new Date(job.completedAt).getTime();
            duration = endTime - startTime;
          }

          // Show completion toast with provider/model/duration
          if (toastIdRef.current) {
            const providerDisplay = job.audioProvider ? getProviderDisplayName(job.audioProvider) : 'Provider';
            const modelDisplay = job.audioModel ? getModelDisplayName(job.audioModel) : 'Model';
            const durationFormatted = duration ? formatDuration(duration) : null;

            let description = `${providerDisplay} ${modelDisplay}`;
            if (durationFormatted) {
              description += ` • ${durationFormatted}`;
            }

            if (job.status === 'completed') {
              toast.success('Voiceovers generated!', {
                id: toastIdRef.current,
                description,
              });
            } else if (job.status === 'completed_with_errors') {
              const firstError = parseErrorDetails(job.errorDetails);
              toast.warning('Generation completed with errors', {
                id: toastIdRef.current,
                description: `${job.failedAudioLines || 0} failed: ${firstError}`,
              });
            } else if (job.status === 'failed') {
              const errorMessage = parseErrorDetails(job.errorDetails);
              toast.error('Voiceover generation failed', {
                id: toastIdRef.current,
                description: errorMessage,
              });
            }
            toastIdRef.current = null;
          }

          // Trigger completion callback
          onCompleted?.();

          // Refresh the page to show updated voiceovers
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
  }, [onJobStatusChange, onPollEnd, onCompleted]);

  // Start polling if we have a job ID
  const startPolling = useCallback((jobId: string) => {
    onPollStart?.(jobId);
    pollJobStatus(jobId);
  }, [pollJobStatus, onPollStart]);

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

  return {
    pollJobStatus,
    startPolling,
  };
}
