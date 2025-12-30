'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Wand2,
  Users,
  Image,
  Video,
  Mic,
  Download,
  Check,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  key: string;
  icon: typeof Wand2;
}

const steps: Step[] = [
  { id: 1, key: 'prompt', icon: Wand2 },
  { id: 2, key: 'characters', icon: Users },
  { id: 3, key: 'scenes', icon: Image },
  { id: 4, key: 'videos', icon: Video },
  { id: 5, key: 'voiceover', icon: Mic },
  { id: 6, key: 'export', icon: Download },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  variant?: 'horizontal' | 'vertical';
  completedSteps?: number[];
}

export function StepIndicator({
  currentStep,
  onStepClick,
  variant = 'horizontal',
  completedSteps = [],
}: StepIndicatorProps) {
  const t = useTranslations();

  const isHorizontal = variant === 'horizontal';

  return (
    <div
      className={cn(
        'flex',
        isHorizontal
          ? 'flex-row items-center justify-between gap-2 overflow-x-auto pb-2'
          : 'flex-col gap-1'
      )}
    >
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
        const isClickable = onStepClick && (isCompleted || step.id <= currentStep + 1);

        return (
          <div
            key={step.id}
            className={cn('flex items-center', isHorizontal ? 'flex-1' : 'w-full')}
          >
            <motion.button
              whileHover={isClickable ? { scale: 1.02 } : undefined}
              whileTap={isClickable ? { scale: 0.98 } : undefined}
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-3 rounded-xl transition-all duration-300',
                isHorizontal ? 'p-3 min-w-[160px]' : 'p-3 w-full',
                isActive
                  ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30'
                  : isCompleted
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-white/5 border border-white/5',
                isClickable ? 'cursor-pointer hover:bg-white/10' : 'cursor-default opacity-50'
              )}
            >
              {/* Step number/icon */}
              <div
                className={cn(
                  'relative w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                  isActive
                    ? 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/30'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-muted-foreground'
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}

                {/* Pulse animation for active step */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-lg bg-purple-500"
                  />
                )}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0 text-left">
                <p
                  className={cn(
                    'text-xs font-medium uppercase tracking-wider',
                    isActive
                      ? 'text-purple-400'
                      : isCompleted
                      ? 'text-green-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {t('workflow.step')} {step.id}
                </p>
                <p
                  className={cn(
                    'text-sm font-semibold truncate',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {t(`steps.${step.key}.title`)}
                </p>
              </div>

              {/* Arrow indicator */}
              {isHorizontal && index < steps.length - 1 && (
                <ChevronRight
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    isCompleted ? 'text-green-400' : 'text-white/20'
                  )}
                />
              )}
            </motion.button>

            {/* Connector line (vertical variant) */}
            {!isHorizontal && index < steps.length - 1 && (
              <div className="ml-8 my-1">
                <div
                  className={cn(
                    'w-0.5 h-6 rounded-full transition-all',
                    isCompleted ? 'bg-green-500' : 'bg-white/10'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Compact version for mobile
export function StepIndicatorCompact({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick?: (step: number) => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <motion.button
            key={step.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onStepClick?.(step.id)}
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              isActive
                ? 'bg-gradient-to-r from-purple-500 to-cyan-500 scale-125'
                : isCompleted
                ? 'bg-green-500'
                : 'bg-white/20'
            )}
            title={t(`steps.${step.key}.title`)}
          />
        );
      })}
    </div>
  );
}
