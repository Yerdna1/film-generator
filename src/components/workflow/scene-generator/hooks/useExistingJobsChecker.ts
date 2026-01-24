import { useEffect, useCallback } from 'react';
import type { Project } from '@/types/project';

interface ExistingJobsCheckerOptions {
  onImageJobFound?: (jobId: string, progress: number, status: string) => void;
  onSceneJobFound?: (jobId: string, progress: number, status: string) => void;
}

/**
 * Hook for checking and resuming existing background jobs on component mount
 * Ensures long-running jobs continue polling even after page refresh
 */
export function useExistingJobsChecker(
  project: Project,
  options: ExistingJobsCheckerOptions = {}
) {
  const { onImageJobFound, onSceneJobFound } = options;

  /**
   * Check for existing image generation job
   */
  const checkExistingImageJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/generate-images?projectId=${project.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.activeJob) {
          console.log('[ExistingJobs] Found active image job:', data.activeJob.id);
          onImageJobFound?.(data.activeJob.id, data.activeJob.progress, data.activeJob.status);
        }
      }
    } catch (error) {
      console.error('Error checking for existing image job:', error);
    }
  }, [project.id, onImageJobFound]);

  /**
   * Check for existing scene generation job
   */
  const checkExistingSceneJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/generate-scenes?projectId=${project.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.activeJob) {
          console.log('[ExistingJobs] Found active scene job:', data.activeJob.id);
          onSceneJobFound?.(data.activeJob.id, data.activeJob.progress, data.activeJob.status);
        }
      }
    } catch (error) {
      console.error('Error checking for existing scene job:', error);
    }
  }, [project.id, onSceneJobFound]);

  /**
   * Check for all existing jobs in parallel
   */
  const checkAllJobs = useCallback(async () => {
    console.log('[ExistingJobs] Checking for existing jobs...');
    await Promise.all([
      checkExistingImageJob(),
      checkExistingSceneJob(),
    ]);
  }, [checkExistingImageJob, checkExistingSceneJob]);

  // Check for existing jobs on mount
  useEffect(() => {
    checkAllJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  return {
    checkExistingImageJob,
    checkExistingSceneJob,
    checkAllJobs,
  };
}
