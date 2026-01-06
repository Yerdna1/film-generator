'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/stores/project-store';
import { ImportProjectDialog } from '@/components/project/ImportProjectDialog';
import {
  LandingPage,
  LoadingSkeleton,
  DashboardHero,
  ProjectsSection,
  useDashboardData,
} from './_components';

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const { projects, isLoading: projectsLoading, createProject } = useProjectStore();
  const [importProjectOpen, setImportProjectOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [userStatus, setUserStatus] = useState<{ isApproved: boolean; isBlocked: boolean } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const { projectCosts } = useDashboardData(
    status === 'authenticated'
  );

  // Handle creating a new project
  const handleNewProject = async () => {
    if (isCreatingProject) return;

    setIsCreatingProject(true);
    try {
      // Create a new project with default settings
      const project = await createProject(
        `New Project ${new Date().toLocaleDateString()}`,
        'disney-pixar',
        { sceneCount: 12 }
      );

      // Navigate to the project page
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      setIsCreatingProject(false);
    }
  };

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <DashboardHero
        onNewProject={handleNewProject}
        onImportProject={() => setImportProjectOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        hasProjects={projects.length > 0}
      />

      {/* Projects Content */}
      <ProjectsSection
        projects={projects}
        projectCosts={projectCosts}
        onCreateProject={handleNewProject}
        searchQuery={searchQuery}
      />

      {/* Dialogs */}
      <ImportProjectDialog open={importProjectOpen} onOpenChange={setImportProjectOpen} />
    </div>
  );
}
