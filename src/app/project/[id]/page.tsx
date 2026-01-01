'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  Crown,
  Edit3,
  Eye,
  Globe,
  Lock,
  Loader2,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useProjectStore } from '@/lib/stores/project-store';
import { MembersPanel } from '@/components/collaboration/MembersPanel';
import { ApprovalPanel } from '@/components/collaboration/ApprovalPanel';
import type { ProjectRole, ProjectPermissions } from '@/types/collaboration';
import { StepIndicator, StepIndicatorCompact } from '@/components/workflow/StepIndicator';
import { Step1PromptGenerator } from '@/components/workflow/Step1-PromptGenerator';
import { Step2CharacterGenerator } from '@/components/workflow/Step2-CharacterGenerator';
import { Step3SceneGenerator } from '@/components/workflow/Step3-SceneGenerator';
import { Step4VideoGenerator } from '@/components/workflow/Step4-VideoGenerator';
import { Step5VoiceoverGenerator } from '@/components/workflow/Step5-VoiceoverGenerator';
import { Step6Export } from '@/components/workflow/Step6-Export';

// Shallow compare for project updates - only trigger re-render for meaningful changes
function hasProjectChanged(prev: ReturnType<typeof useProjectStore.getState>['projects'][0] | undefined, next: ReturnType<typeof useProjectStore.getState>['projects'][0] | undefined): boolean {
  if (!prev || !next) return prev !== next;
  if (prev.id !== next.id) return true;
  if (prev.currentStep !== next.currentStep) return true;
  if (prev.name !== next.name) return true;
  if (prev.scenes.length !== next.scenes.length) return true;
  if (prev.characters.length !== next.characters.length) return true;
  // Deep check scene image URLs (important for image generation updates)
  for (let i = 0; i < prev.scenes.length; i++) {
    if (prev.scenes[i]?.imageUrl !== next.scenes[i]?.imageUrl) return true;
    if (prev.scenes[i]?.videoUrl !== next.scenes[i]?.videoUrl) return true;
    if (prev.scenes[i]?.audioUrl !== next.scenes[i]?.audioUrl) return true;
  }
  return false;
}

const roleIcons: Record<ProjectRole, React.ComponentType<{ className?: string }>> = {
  admin: Crown,
  collaborator: Edit3,
  reader: Eye,
};

const roleLabels: Record<ProjectRole, string> = {
  admin: 'Admin',
  collaborator: 'Collaborator',
  reader: 'Viewer',
};

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { getProject, setCurrentProject, setCurrentStep, nextStep, previousStep, isLoading, addSharedProject } = useProjectStore();

  // Check if we're in approvals-only mode (from notification link)
  const isApprovalsMode = searchParams.get('tab') === 'approvals';

  // Track hydration state to prevent SSR mismatch
  const [hasMounted, setHasMounted] = useState(false);
  const [project, setProject] = useState<ReturnType<typeof getProject>>(undefined);

  // Collaboration state
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [userRole, setUserRole] = useState<ProjectRole | null>(null);
  const [permissions, setPermissions] = useState<ProjectPermissions | null>(null);
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch project data including visibility and permissions
  const fetchProjectData = useCallback(async (projectId: string) => {
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
      }
    } catch (e) {
      console.error('Failed to fetch project data:', e);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, []);

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
      // Fetch permissions and visibility from API
      fetchProjectData(projectId);
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

  return (
    <div className="min-h-screen">
      {/* Project Header */}
      <div className="sticky top-16 z-40 glass-strong border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Back button and title */}
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold truncate max-w-[200px] md:max-w-none">
                  {project.name}
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  {project.story.title || 'Untitled Story'}
                </p>
              </div>
            </div>

            {/* Mobile step indicator */}
            <div className="md:hidden">
              <StepIndicatorCompact currentStep={project.currentStep} onStepClick={handleStepClick} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View Only Badge for readers */}
              {!permissions?.canEdit && userRole && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                  <Eye className="w-3 h-3" />
                  <span>View Only</span>
                </div>
              )}

              {/* Visibility Toggle (for admins) */}
              {userRole === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleVisibility}
                  disabled={isUpdatingVisibility}
                  className={`gap-2 ${
                    visibility === 'public'
                      ? 'text-green-400 hover:text-green-300'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={visibility === 'public' ? 'Public project - click to make private' : 'Private project - click to make public'}
                >
                  {visibility === 'public' ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {visibility === 'public' ? 'Public' : 'Private'}
                  </span>
                </Button>
              )}

              {/* Team/Collaboration button - hide for read-only viewers */}
              {permissions?.canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCollaborationOpen(true)}
                  className="text-muted-foreground hover:text-foreground gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('collaboration.team')}</span>
                  {userRole && (
                    <span className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                      userRole === 'admin' ? 'bg-yellow-500/20 text-yellow-400' :
                      userRole === 'collaborator' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {roleLabels[userRole]}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Step Indicator - hide in approvals mode */}
      {!isApprovalsMode && (
        <div className="hidden md:block border-b border-white/5 bg-black/20">
          <div className="container mx-auto px-4 py-4">
            <StepIndicator currentStep={project.currentStep} onStepClick={handleStepClick} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {isApprovalsMode ? (
          /* Approvals-only view - shown when ?tab=approvals */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Shield className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Pending Approvals</h1>
                    <p className="text-sm text-muted-foreground">
                      Review and approve regeneration requests from your team
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="border-white/10 hover:bg-white/5"
                >
                  <X className="w-4 h-4 mr-2" />
                  Back to Project
                </Button>
              </div>
            </div>

            <div className="glass rounded-xl p-6 border border-white/10">
              {!isLoadingPermissions && permissions?.canApproveRequests ? (
                <ApprovalPanel
                  projectId={project.id}
                  canApprove={permissions.canApproveRequests}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>You don't have permission to view approvals</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* Normal step content */
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
        )}
      </div>

      {/* Bottom Navigation - hide in approvals mode */}
      {!isApprovalsMode && (
      <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/5 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => previousStep(project.id)}
              disabled={project.currentStep === 1}
              className="border-white/10 hover:bg-white/5"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('common.previous')}
            </Button>

            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('workflow.step')}</span>
              <span className="font-bold text-foreground">{project.currentStep}</span>
              <span>{t('workflow.of')}</span>
              <span>6</span>
            </div>

            {project.currentStep < 6 ? (
              <Button
                onClick={() => nextStep(project.id)}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
              >
                {t('common.next')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0"
              >
                {t('common.finish')}
              </Button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Spacer for fixed bottom nav - hide in approvals mode */}
      {!isApprovalsMode && <div className="h-24" />}

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

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Loading State */}
                {isLoadingPermissions && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading team info...</span>
                  </div>
                )}

                {/* Error State - no role loaded */}
                {!isLoadingPermissions && !userRole && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                    <p className="text-red-400">Failed to load permissions</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => fetchProjectData(project.id)}
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {/* User's Role Badge */}
                {!isLoadingPermissions && userRole && (
                  <div className="p-3 bg-white/5 rounded-lg flex items-center gap-3">
                    {(() => {
                      const RoleIcon = roleIcons[userRole];
                      return (
                        <>
                          <div className={`p-2 rounded-lg ${
                            userRole === 'admin' ? 'bg-yellow-500/20' :
                            userRole === 'collaborator' ? 'bg-purple-500/20' :
                            'bg-cyan-500/20'
                          }`}>
                            <RoleIcon className={`w-5 h-5 ${
                              userRole === 'admin' ? 'text-yellow-400' :
                              userRole === 'collaborator' ? 'text-purple-400' :
                              'text-cyan-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{t('collaboration.yourRole')}</p>
                            <p className="text-sm text-muted-foreground">{roleLabels[userRole]}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Project Visibility Toggle (for admins) */}
                {!isLoadingPermissions && userRole === 'admin' && (
                  <div className="p-4 bg-white/5 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {visibility === 'public' ? (
                          <Globe className="w-5 h-5 text-green-400" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">Project Visibility</p>
                          <p className="text-sm text-muted-foreground">
                            {visibility === 'public'
                              ? 'Anyone can discover and view this project'
                              : 'Only team members can access'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={visibility === 'public'}
                        onCheckedChange={handleToggleVisibility}
                        disabled={isUpdatingVisibility}
                      />
                    </div>
                    {visibility === 'public' && (
                      <div className="text-xs text-green-400/70 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        This project appears in the public Discover page
                      </div>
                    )}
                  </div>
                )}

                {/* Approval Panel (for admins) */}
                {!isLoadingPermissions && permissions?.canApproveRequests && (
                  <div className="border-b border-white/10 pb-6">
                    <ApprovalPanel
                      projectId={project.id}
                      canApprove={permissions.canApproveRequests}
                    />
                  </div>
                )}

                {/* Members Panel */}
                {!isLoadingPermissions && userRole && permissions && (
                  <MembersPanel
                    projectId={project.id}
                    projectName={project.name}
                    currentUserRole={userRole}
                    canManageMembers={permissions.canManageMembers}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
