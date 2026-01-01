'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useProjectStore } from '@/lib/stores/project-store';
import { NewProjectDialog } from '@/components/project/NewProjectDialog';
import {
  LandingPage,
  LoadingSkeleton,
  DashboardHero,
  StatsGrid,
  ProjectsSection,
  useDashboardData,
} from './_components';

export default function DashboardPage() {
  const { status } = useSession();
  const { projects } = useProjectStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const { creditsData, projectCosts, creditsBreakdown } = useDashboardData(
    status === 'authenticated'
  );

  // Show landing page for unauthenticated users
  if (status === 'unauthenticated') {
    return <LandingPage />;
  }

  // Show loading state
  if (status === 'loading') {
    return <LoadingSkeleton />;
  }

  const stats = {
    total: projects.length,
    inProgress: projects.filter((p) => !p.isComplete).length,
    completed: projects.filter((p) => p.isComplete).length,
    totalScenes: projects.reduce((acc, p) => acc + p.scenes.length, 0),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <DashboardHero onNewProject={() => setNewProjectOpen(true)} />

      {/* Combined Stats Row */}
      {projects.length > 0 && (
        <StatsGrid
          stats={stats}
          creditsData={creditsData}
          breakdown={creditsBreakdown}
        />
      )}

      {/* Projects Content */}
      <ProjectsSection
        projects={projects}
        projectCosts={projectCosts}
        onCreateProject={() => setNewProjectOpen(true)}
      />

      {/* New Project Dialog */}
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
    </div>
  );
}
