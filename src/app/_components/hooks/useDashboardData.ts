import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/credits?history=true&limit=10');
        if (res.ok) {
          const data = await res.json();
          setCreditsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      }
    };

    const fetchStatistics = async () => {
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
    };

    const fetchProjectCosts = async () => {
      try {
        const res = await fetch('/api/projects/costs');
        if (res.ok) {
          const data = await res.json();
          setProjectCosts(data);
        }
      } catch (error) {
        console.error('Failed to fetch project costs:', error);
      }
    };

    fetchCredits();
    fetchStatistics();
    fetchProjectCosts();
  }, [isAuthenticated]);

  return {
    creditsData,
    projectCosts,
    creditsBreakdown,
  };
}
