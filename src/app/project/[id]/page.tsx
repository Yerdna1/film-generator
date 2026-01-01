'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/lib/stores/project-store';
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

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const { getProject, setCurrentProject, setCurrentStep, nextStep, previousStep, isLoading } = useProjectStore();

  // Track hydration state to prevent SSR mismatch
  const [hasMounted, setHasMounted] = useState(false);
  const [project, setProject] = useState<ReturnType<typeof getProject>>(undefined);

  // Set mounted state after hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    // Wait for store to finish loading before checking project
    if (isLoading) return;

    const p = getProject(params.id as string);
    if (!p) {
      router.push('/');
      return;
    }
    setProject(p);
    setCurrentProject(params.id as string);
  }, [params.id, getProject, setCurrentProject, router, hasMounted, isLoading]);

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
    switch (project.currentStep) {
      case 1:
        return <Step1PromptGenerator project={project} />;
      case 2:
        return <Step2CharacterGenerator project={project} />;
      case 3:
        return <Step3SceneGenerator project={project} />;
      case 4:
        return <Step4VideoGenerator project={project} />;
      case 5:
        return <Step5VoiceoverGenerator project={project} />;
      case 6:
        return <Step6Export project={project} />;
      default:
        return <Step1PromptGenerator project={project} />;
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
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Step Indicator */}
      <div className="hidden md:block border-b border-white/5 bg-black/20">
        <div className="container mx-auto px-4 py-4">
          <StepIndicator currentStep={project.currentStep} onStepClick={handleStepClick} />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
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

      {/* Bottom Navigation */}
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

      {/* Spacer for fixed bottom nav */}
      <div className="h-24" />
    </div>
  );
}
