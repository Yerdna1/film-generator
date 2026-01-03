import { useCredits, useStatistics, useProjectCosts } from '@/hooks';
import type { CreditsData, ProjectCostsData, CreditsBreakdown } from '../types';

/**
 * Dashboard data hook that uses centralized SWR hooks.
 * This ensures request deduplication across all components.
 */
export function useDashboardData(isAuthenticated: boolean) {
  const { data: creditsData } = useCredits({ enabled: isAuthenticated });
  const { breakdown: creditsBreakdown } = useStatistics({ enabled: isAuthenticated });
  const { data: projectCosts } = useProjectCosts({ enabled: isAuthenticated });

  return {
    creditsData: creditsData as CreditsData | null,
    projectCosts: (projectCosts ?? null) as ProjectCostsData | null,
    creditsBreakdown,
  };
}
