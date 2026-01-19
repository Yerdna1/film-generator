'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks';
import { useProjectStore } from '@/lib/stores/project-store';
import { MembersPanel } from '@/components/collaboration/MembersPanel';
import type { ProjectRole, ProjectPermissions } from '@/types/collaboration';
import { Step1PromptGenerator } from '@/components/workflow/Step1-PromptGenerator';
import { Step2CharacterGenerator } from '@/components/workflow/Step2-CharacterGenerator';
import { Step3SceneGenerator } from '@/components/workflow/Step3-SceneGenerator';
import { Step4VideoGenerator } from '@/components/workflow/Step4-VideoGenerator';
import { Step5VoiceoverGenerator } from '@/components/workflow/Step5-VoiceoverGenerator';
import { Step6Export } from '@/components/workflow/Step6-Export';

import { ProjectHeader } from './components/ProjectHeader';
import { ProjectBottomNav } from './components/ProjectBottomNav';

// Shallow compare for project updates - only trigger re-render for meaningful changes
function hasProjectChanged(prev: ReturnType<typeof useProjectStore.getState>['projects'][0] | undefined, next: ReturnType<typeof useProjectStore.getState>['projects'][0] | undefined): boolean {
  if (!prev || !next) return prev !== next;
  if (prev.id !== next.id) return true;
  if (prev.currentStep !== next.currentStep) return true;
  if (prev.name !== next.name) return true;
  // Safety check for scenes/characters arrays (may be undefined in summary data)
  const prevScenes = prev.scenes || [];
  const nextScenes = next.scenes || [];
  const prevChars = prev.characters || [];
  const nextChars = next.characters || [];
  if (prevScenes.length !== nextScenes.length) return true;
  if (prevChars.length !== nextChars.length) return true;
  // Check rendered video URLs
  if (prev.renderedVideoUrl !== next.renderedVideoUrl) return true;
  if (prev.renderedDraftUrl !== next.renderedDraftUrl) return true;
  // Deep check scene image URLs (important for image generation updates)
  for (let i = 0; i < prevScenes.length; i++) {
    if (prevScenes[i]?.imageUrl !== nextScenes[i]?.imageUrl) return true;
    if (prevScenes[i]?.videoUrl !== nextScenes[i]?.videoUrl) return true;
    if (prevScenes[i]?.audioUrl !== nextScenes[i]?.audioUrl) return true;
  }
  return false;
}

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const { data: session } = useSession();
  const { getProject, setCurrentProject, setCurrentStep, nextStep, previousStep, isLoading, addSharedProject, updateProject } = useProjectStore();

  // Get user from session
  const user = session?.user;
  const isAdmin = user?.email === 'andrej.galad@gmail.com';
  const userGlobalRole = user?.role; // Global role from User table ('user' | 'admin')

  // Use subscription hook
  const { plan: subscriptionPlan } = useSubscription({ enabled: !!user });

  // Track hydration state to prevent SSR mismatch
  const [hasMounted, setHasMounted] = useState(false);
  const [project, setProject] = useState<ReturnType<typeof getProject>>(undefined);

  // Collaboration state
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [userRole, setUserRole] = useState<ProjectRole | null>(null);
  const [permissions, setPermissions] = useState<ProjectPermissions | null>(null);
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch project data including visibility, permissions, and refresh scenes
  const fetchProjectData = useCallback(async (projectId: string, shouldRefreshScenes = false) => {
    setIsLoadingPermissions(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setVisibility(data.visibility || 'private');
        if (data.role) {
          setUserRole(data.role);
        }
        if (data.permissions) {
          setPermissions(data.permissions);
        }
        setIsAuthenticated(data.isAuthenticated ?? false);

        // Update project with full data from API for all users
        // This ensures store has full scene/character/story data (not just summary from dashboard)
        // Also ensures collaborators see latest approved images
        if (shouldRefreshScenes) {
          updateProject(projectId, {
            scenes: data.scenes || [],
            characters: data.characters || [],
            settings: data.settings || {},
            voiceSettings: data.voiceSettings || {},
            story: data.story || {},
            masterPrompt: data.masterPrompt || '',
            style: data.style,
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch project data:', e);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [updateProject]);

  // Toggle project visibility
  const handleToggleVisibility = async () => {
    if (!project) return;
    setIsUpdatingVisibility(true);
    const newVisibility = visibility === 'private' ? 'public' : 'private';
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (response.ok) {
        setVisibility(newVisibility);
      }
    } catch (e) {
      console.error('Failed to update visibility:', e);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  // Fetch project from API (for shared projects not in local store)
  const fetchProjectFromAPI = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();

        // Set role and permissions from the API response
        if (data.role) {
          setUserRole(data.role);
        }
        if (data.permissions) {
          setPermissions(data.permissions);
        }
        if (data.visibility) {
          setVisibility(data.visibility);
        }
        setIsAuthenticated(data.isAuthenticated ?? false);
        setIsLoadingPermissions(false);

        // Transform API response to match Project type
        return {
          id: data.id,
          name: data.name,
          userId: data.userId,
          style: data.style,
          masterPrompt: data.masterPrompt,
          currentStep: data.currentStep,
          isComplete: data.isComplete,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          settings: data.settings || {},
          story: data.story || {},
          voiceSettings: data.voiceSettings || {},
          characters: data.characters || [],
          scenes: data.scenes || [],
          // Rendered video URLs
          renderedVideoUrl: data.renderedVideoUrl,
          renderedDraftUrl: data.renderedDraftUrl,
        };
      }
      return null;
    } catch (e) {
      console.error('Failed to fetch project from API:', e);
      return null;
    }
  }, []);

  // Set mounted state after hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    // Wait for store to finish loading before checking project
    if (isLoading) return;

    const projectId = params.id as string;
    const p = getProject(projectId);

    if (p) {
      // Project found in store
      setProject(p);
      setCurrentProject(projectId);
      // Fetch permissions, visibility, and refresh scenes from API
      // Pass true to refresh scenes for collaborators (ensures regenerated images are visible)
      fetchProjectData(projectId, true);
    } else {
      // Project not in store - try fetching from API (for shared projects)
      // fetchProjectFromAPI already sets permissions/visibility
      fetchProjectFromAPI(projectId).then((fetchedProject) => {
        if (fetchedProject) {
          // Add to store so updates work correctly
          addSharedProject(fetchedProject);
          setProject(fetchedProject);
        } else {
          // Project not found in store or API - redirect to home
          router.push('/');
        }
      });
    }
  }, [params.id, getProject, setCurrentProject, router, hasMounted, isLoading, fetchProjectData, fetchProjectFromAPI, addSharedProject]);

  // Track previous project state to avoid unnecessary re-renders
  const prevProjectRef = useRef<ReturnType<typeof getProject>>(undefined);

  // Subscribe to store changes with shallow comparison
  useEffect(() => {
    if (!hasMounted) return;

    const unsubscribe = useProjectStore.subscribe((state) => {
      const updated = state.projects.find((p) => p.id === params.id);
      // Only update if there are meaningful changes
      if (hasProjectChanged(prevProjectRef.current, updated)) {
        prevProjectRef.current = updated;
        setProject(updated);
      }
    });
    return unsubscribe;
  }, [params.id, hasMounted]);

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"
            />
          </div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const handleStepClick = (step: number) => {
    if (step <= project.currentStep + 1) {
      setCurrentStep(project.id, step);
    }
  };

  const renderStep = () => {
    // Calculate isReadOnly based on permissions
    const isReadOnly = !permissions?.canEdit;

    // Common props for all step components
    const stepProps = {
      project,
      permissions,
      userRole,
      userGlobalRole,
      isAdmin,
      isReadOnly,
      isAuthenticated,
    };

    switch (project.currentStep) {
      case 1:
        return <Step1PromptGenerator {...stepProps} />;
      case 2:
        return <Step2CharacterGenerator {...stepProps} />;
      case 3:
        return <Step3SceneGenerator {...stepProps} />;
      case 4:
        return <Step4VideoGenerator {...stepProps} />;
      case 5:
        return <Step5VoiceoverGenerator {...stepProps} />;
      case 6:
        return <Step6Export {...stepProps} />;
      default:
        return <Step1PromptGenerator {...stepProps} />;
    }
  };

  // Handle project completion
  const handleProjectComplete = async () => {
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isComplete: true }),
      });
      router.push('/projects');
    } catch (e) {
      console.error('Failed to complete project:', e);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden flex flex-col">
      {/* Project Header */}
      <ProjectHeader
        project={project}
        user={user}
        isAdmin={isAdmin}
        userRole={userRole}
        permissions={permissions}
        subscriptionPlan={subscriptionPlan}
        visibility={visibility}
        isUpdatingVisibility={isUpdatingVisibility}
        onToggleVisibility={handleToggleVisibility}
        onOpenCollaboration={() => setCollaborationOpen(true)}
        onStepClick={handleStepClick}
        t={t}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1920px] mx-auto px-2 md:px-4 lg:px-6 xl:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={project.currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Navigation */}
      <ProjectBottomNav
        project={project}
        previousStep={previousStep}
        nextStep={nextStep}
        onComplete={handleProjectComplete}
        t={t}
      />

      {/* Spacer for fixed bottom nav */}
      <div className="h-28" />

      {/* Collaboration Slide-out Panel */}
      <AnimatePresence>
        {collaborationOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCollaborationOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md glass-strong border-l border-white/10 z-50 overflow-hidden flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  <div>
                    <h2 className="font-semibold">{t('collaboration.team')}</h2>
                    <p className="text-xs text-muted-foreground">{project.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollaborationOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto">
                <MembersPanel
                  projectId={project.id}
                  projectName={project.name}
                  currentUserRole={userRole || 'reader'}
                  canManageMembers={isAdmin || userRole === 'admin'}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
