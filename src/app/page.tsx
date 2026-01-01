'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/stores/project-store';
import { NewProjectDialog } from '@/components/project/NewProjectDialog';
import { ImportProjectDialog } from '@/components/project/ImportProjectDialog';
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
  const router = useRouter();
  const { projects, isLoading: projectsLoading } = useProjectStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [importProjectOpen, setImportProjectOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<{ isApproved: boolean; isBlocked: boolean } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Check user approval status
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/status')
        .then(res => res.json())
        .then(data => {
          setUserStatus(data);
          setStatusLoading(false);
          // Redirect if not approved
          if (data.isApproved === false) {
            router.push('/pending-approval');
          }
        })
        .catch(() => setStatusLoading(false));
    } else {
      setStatusLoading(false);
    }
  }, [status, router]);

  const { creditsData, projectCosts, creditsBreakdown } = useDashboardData(
    status === 'authenticated'
  );

  // Show landing page for unauthenticated users
  if (status === 'unauthenticated') {
    return <LandingPage />;
  }

  // Show loading state while auth, projects, or user status are loading
  if (status === 'loading' || projectsLoading || statusLoading) {
    return <LoadingSkeleton />;
  }

  // If user is not approved, they should be redirected (handled in useEffect)
  if (userStatus && !userStatus.isApproved) {
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
      <DashboardHero
        onNewProject={() => setNewProjectOpen(true)}
        onImportProject={() => setImportProjectOpen(true)}
      />

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

      {/* Dialogs */}
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <ImportProjectDialog open={importProjectOpen} onOpenChange={setImportProjectOpen} />
    </div>
  );
}
