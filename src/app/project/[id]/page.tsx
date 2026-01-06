'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Users,
  Crown,
  Edit3,
  Eye,
  Globe,
  Lock,
  Loader2,
  X,
  ChevronDown,
  LogOut,
  User,
  Settings,
  BarChart3,
  Shield,
  CreditCard,
  Film,
} from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreditsDisplay } from '@/components/shared/CreditsDisplay';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
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

// Step Navigation Component
interface StepNavigationProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  t: (key: string) => string;
}

function StepNavigation({ currentStep, onStepClick, t }: StepNavigationProps) {
  const [visibleStartIndex, setVisibleStartIndex] = useState(Math.max(0, Math.min(1, currentStep - 3)));

  const steps = [
    { number: 1, name: t('help.steps.storyPrompt'), shortName: t('steps.prompt.title') },
    { number: 2, name: t('help.steps.characters'), shortName: t('steps.characters.title') },
    { number: 3, name: t('help.steps.sceneImages'), shortName: t('help.steps.sceneImages') },
    { number: 4, name: t('help.steps.videos'), shortName: t('help.steps.videos') },
    { number: 5, name: t('help.steps.voiceover'), shortName: t('help.steps.voiceover') },
    { number: 6, name: t('help.steps.export'), shortName: t('help.steps.export') },
  ];

  const visibleSteps = steps.slice(visibleStartIndex, visibleStartIndex + 5);

  const canGoLeft = visibleStartIndex > 0;
  const canGoRight = visibleStartIndex < steps.length - 5;

  const goLeft = () => {
    if (canGoLeft) {
      setVisibleStartIndex(visibleStartIndex - 1);
    }
  };

  const goRight = () => {
    if (canGoRight) {
      setVisibleStartIndex(visibleStartIndex + 1);
    }
  };

  // Update visible range when current step changes
  useEffect(() => {
    if (currentStep <= visibleStartIndex) {
      setVisibleStartIndex(Math.max(0, currentStep - 1));
    } else if (currentStep > visibleStartIndex + 4) {
      setVisibleStartIndex(Math.min(steps.length - 5, currentStep - 4));
    }
  }, [currentStep, visibleStartIndex, steps.length]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={goLeft}
        disabled={!canGoLeft}
        className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1">
        {visibleSteps.map((step) => (
          <button
            key={step.number}
            onClick={() => onStepClick(step.number)}
            className={`
              relative px-2 md:px-3 py-1 md:py-1.5 text-xs font-medium rounded-full transition-all duration-200
              ${currentStep === step.number
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/25'
                : currentStep > step.number
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-white/10 text-muted-foreground hover:bg-white/20'
              }
            `}
          >
            <span className="flex items-center gap-1.5">
              <span className="font-semibold">{step.number}</span>
              <span className="hidden sm:inline">{step.shortName}</span>
              {currentStep > step.number && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={goRight}
        disabled={!canGoRight}
        className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

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

const roleIcons: Record<ProjectRole, React.ComponentType<{ className?: string }>> = {
  admin: Crown,
  collaborator: Edit3,
  reader: Eye,
};

// Role labels are now handled via translations - see getRoleLabel function inside component

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const { data: session } = useSession();
  const { getProject, setCurrentProject, setCurrentStep, nextStep, previousStep, isLoading, addSharedProject, updateProject } = useProjectStore();

  // Get user from session
  const user = session?.user;
  const isAdmin = user?.email === 'andrej.galad@gmail.com';

  // Use subscription hook
  const { plan: subscriptionPlan } = useSubscription({ enabled: !!user });

  // Get translated role label
  const getRoleLabel = (role: ProjectRole) => t(`roles.${role}`);

  // Plan badge colors and labels
  const getPlanBadge = () => {
    if (!subscriptionPlan || subscriptionPlan === 'free') {
      return { label: t('billing.plans.free'), className: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };
    }
    if (subscriptionPlan === 'starter') {
      return { label: t('billing.plans.starter'), className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }
    if (subscriptionPlan === 'pro') {
      return { label: t('billing.plans.pro'), className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    }
    if (subscriptionPlan === 'studio') {
      return { label: t('billing.plans.studio'), className: 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    }
    return { label: subscriptionPlan, className: 'bg-muted text-muted-foreground' };
  };

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
    <div className="min-h-screen overflow-hidden flex flex-col">
      {/* Project Header */}
      <div className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-2 md:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2 md:py-0 md:h-14 gap-2 md:gap-4">
            {/* Top Row on Mobile / Left Section on Desktop */}
            <div className="flex items-center justify-between md:justify-start gap-2 md:gap-4 flex-shrink-0">
              {/* Back button and title */}
              <div className="flex items-center gap-2 md:gap-4">
                <Link href="/">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-10 md:w-10">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 md:gap-2">
                    <h1 className="font-semibold text-xs sm:text-sm md:text-base truncate">
                      {project.story.title || 'Untitled Story'}
                    </h1>
                    <span className="text-muted-foreground hidden sm:inline">•</span>
                    <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[120px] md:max-w-[200px] hidden sm:inline">
                      {project.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credits Display and Controls on Mobile */}
              <div className="flex items-center gap-1 md:hidden">
                {user && <CreditsDisplay className="scale-90" />}
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>

            {/* Center Section - Step Navigation */}
            <div className="flex-1 flex justify-center md:px-4">
              <StepNavigation
                currentStep={project.currentStep}
                onStepClick={handleStepClick}
                t={t}
              />
            </div>

            {/* Actions - Right Section */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {/* Credits Display */}
              {user && <CreditsDisplay className="hidden sm:flex" />}

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Theme Toggle */}
              <ThemeToggle />

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
                      {getRoleLabel(userRole)}
                    </span>
                  )}
                </Button>
              )}

              {/* User Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-2 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Avatar className="w-8 h-8 border border-purple-500/30">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-sm">
                          {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 glass-strong border-black/10 dark:border-white/10"
                  >
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{user.name || 'User'}</p>
                        {subscriptionPlan && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${getPlanBadge().className}`}
                          >
                            {getPlanBadge().label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />

                    {/* Navigation Items */}
                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                      <Link href="/projects">
                        <Film className="w-4 h-4 mr-2" />
                        {t('nav.projects')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                      <Link href="/discover">
                        <Globe className="w-4 h-4 mr-2" />
                        {t('nav.discover')}
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />

                    {/* User Options */}
                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                      <Link href="/profile">
                        <User className="w-4 h-4 mr-2" />
                        {t('nav.profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                      <Link href="/statistics">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {t('nav.statistics')}
                      </Link>
                    </DropdownMenuItem>
                    {(isAdmin || (subscriptionPlan && subscriptionPlan !== 'free')) && (
                      <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                        <Link href="/settings">
                          <Settings className="w-4 h-4 mr-2" />
                          {t('nav.settings')}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                      <Link href="/billing">
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t('nav.billing')}
                      </Link>
                    </DropdownMenuItem>

                    {/* Admin Options */}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
                        <DropdownMenuItem className="cursor-pointer hover:bg-amber-500/10 text-amber-600 dark:text-amber-400" asChild>
                          <Link href="/admin">
                            <Shield className="w-4 h-4 mr-2" />
                            {t('nav.admin')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer hover:bg-amber-500/10 text-amber-600 dark:text-amber-400" asChild>
                          <Link href="/approvals">
                            <Shield className="w-4 h-4 mr-2" />
                            {t('nav.approvals')}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="cursor-pointer text-red-500 focus:text-red-500 hover:bg-red-500/10"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('auth.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>


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
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="glass-strong border border-white/10 rounded-2xl p-3 shadow-2xl shadow-black/30 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Previous Button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="default"
                  onClick={() => previousStep(project.id)}
                  disabled={project.currentStep === 1}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/30 disabled:opacity-30 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none transition-all"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  <span>{t('common.previous')}</span>
                </Button>
              </motion.div>

              {/* Step Indicator - Mobile */}
              <div className="flex md:hidden items-center gap-2 text-sm text-muted-foreground px-3">
                <span>{t('workflow.step')}</span>
                <span className="font-bold text-foreground">{project.currentStep}</span>
                <span>{t('workflow.of')}</span>
                <span>6</span>
              </div>

              {/* Step Indicator - Desktop */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('workflow.step')}</span>
                <span className="font-bold text-foreground">{project.currentStep}</span>
                <span>{t('workflow.of')}</span>
                <span>6</span>
              </div>

              {/* Next/Finish Button */}
              {project.currentStep < 6 ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    project.currentStep > 0
                      ? {
                          boxShadow: [
                            '0 0 0 0px rgba(147, 51, 234, 0.4)',
                            '0 0 0 8px rgba(147, 51, 234, 0)',
                            '0 0 0 0px rgba(147, 51, 234, 0)',
                          ],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: project.currentStep > 0 ? Infinity : 0,
                    repeatDelay: 1,
                  }}
                >
                  <Button
                    onClick={() => nextStep(project.id)}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/30"
                  >
                    {t('common.next')}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      '0 0 0 0px rgba(34, 197, 94, 0.4)',
                      '0 0 0 8px rgba(34, 197, 94, 0)',
                      '0 0 0 0px rgba(34, 197, 94, 0)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                >
                  <Button
                    onClick={async () => {
                      // Mark project as complete and redirect to projects page
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
                    }}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg shadow-green-500/30"
                  >
                    <span className="hidden sm:inline">{t('common.finish')}</span>
                    <span className="sm:hidden">Finish</span>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

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
                            <p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p>
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
