import type { Project } from '@/types/project';
import { useProjectRefresh } from './useProjectRefresh';
import { useImageJobPolling } from './useImageJobPolling';
import { useSceneJobPolling } from './useSceneJobPolling';
import { useExistingJobsChecker } from './useExistingJobsChecker';

/**
 * Main polling hook for background jobs
 * Combines image and scene job polling with project refresh capabilities
 *
 * This hook manages:
 * - Image generation job polling (via Inngest)
 * - Scene generation job polling (via Inngest)
 * - Project data refresh to show new scenes/images as they're generated
 * - Automatic resumption of existing jobs on page load
 */
export function useScenePolling(project: Project) {
  // Project data refresh utilities
  const { refreshProjectData } = useProjectRefresh(project);

  // Image generation job polling
  const { state: imageJobState, actions: imageJobActions } = useImageJobPolling(project);

  // Scene generation job polling
  const { state: sceneJobState, actions: sceneJobActions } = useSceneJobPolling(project, refreshProjectData);

  // Check for existing jobs on mount and resume polling
  useExistingJobsChecker(project, {
    onImageJobFound: (jobId, progress, status) => {
      imageJobActions.startPolling(jobId);
    },
    onSceneJobFound: (jobId, progress, status) => {
      sceneJobActions.startPolling(jobId);
    },
  });

  return {
    // Background job state (Inngest) - for images
    backgroundJobId: imageJobState.backgroundJobId,
    backgroundJobProgress: imageJobState.backgroundJobProgress,
    backgroundJobStatus: imageJobState.backgroundJobStatus,
    isBackgroundJobRunning: imageJobState.isBackgroundJobRunning,

    // Scene generation job state (Inngest)
    sceneJobId: sceneJobState.sceneJobId,
    sceneJobProgress: sceneJobState.sceneJobProgress,
    sceneJobStatus: sceneJobState.sceneJobStatus,
    isSceneJobRunning: sceneJobState.isSceneJobRunning,

    // Actions
    startPolling: imageJobActions.startPolling,
    startSceneJobPolling: sceneJobActions.startPolling,
    stopSceneJobPolling: sceneJobActions.stopPolling,
    stopBackgroundJobPolling: imageJobActions.stopPolling,
    checkExistingJobs: async () => {
      // This is handled automatically by useExistingJobsChecker
      // Kept for backward compatibility
    },
  };
}
