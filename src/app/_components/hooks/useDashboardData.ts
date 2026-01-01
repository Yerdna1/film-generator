import { useState, useEffect, useCallback } from 'react';
import type { CreditsData, ProjectCostsData, CreditsBreakdown } from '../types';

export function useDashboardData(isAuthenticated: boolean) {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [projectCosts, setProjectCosts] = useState<ProjectCostsData | null>(null);
  const [creditsBreakdown, setCreditsBreakdown] = useState<CreditsBreakdown>({
    images: 0,
    videos: 0,
    voiceovers: 0,
    scenes: 0,
    other: 0,
  });

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/credits?history=true&limit=10');
      if (res.ok) {
        const data = await res.json();
        setCreditsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await fetch('/api/statistics');
      if (res.ok) {
        const data = await res.json();
        // Extract breakdown counts from statistics byType
        const byType = data.stats?.byType || {};
        setCreditsBreakdown({
          images: byType.image?.count || 0,
          videos: byType.video?.count || 0,
          voiceovers: byType.voiceover?.count || 0,
          scenes: byType.scene?.count || 0,
          other: (byType.character?.count || 0) + (byType.prompt?.count || 0),
        });
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  }, []);

  const fetchProjectCosts = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/costs');
      if (res.ok) {
        const data = await res.json();
        setProjectCosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch project costs:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchCredits();
    fetchStatistics();
    fetchProjectCosts();
  }, [isAuthenticated, fetchCredits, fetchStatistics, fetchProjectCosts]);

  // Listen for credit updates from admin or other sources
  useEffect(() => {
    const handleCreditUpdate = () => {
      fetchCredits();
      fetchStatistics();
    };

    window.addEventListener('credits-updated', handleCreditUpdate);
    return () => window.removeEventListener('credits-updated', handleCreditUpdate);
  }, [fetchCredits, fetchStatistics]);

  return {
    creditsData,
    projectCosts,
    creditsBreakdown,
  };
}
