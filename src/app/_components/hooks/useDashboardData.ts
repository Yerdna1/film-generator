import { useState, useEffect } from 'react';
import type { CreditsData, ProjectCostsData, CreditsBreakdown } from '../types';

export function useDashboardData(isAuthenticated: boolean) {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [projectCosts, setProjectCosts] = useState<ProjectCostsData | null>(null);

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
    fetchProjectCosts();
  }, [isAuthenticated]);

  const creditsBreakdown: CreditsBreakdown = creditsData?.transactions?.reduce(
    (acc, tx) => {
      if (tx.amount < 0) {
        const absAmount = Math.abs(tx.amount);
        switch (tx.type) {
          case 'video':
            acc.videos += absAmount;
            break;
          case 'image':
            acc.images += absAmount;
            break;
          case 'voiceover':
            acc.voiceovers += absAmount;
            break;
          case 'scene':
            acc.scenes += absAmount;
            break;
          default:
            acc.other += absAmount;
        }
      }
      return acc;
    },
    { images: 0, videos: 0, voiceovers: 0, scenes: 0, other: 0 }
  ) || { images: 0, videos: 0, voiceovers: 0, scenes: 0, other: 0 };

  return {
    creditsData,
    projectCosts,
    creditsBreakdown,
  };
}
