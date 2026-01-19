'use client';

import { useTranslations } from 'next-intl';

interface StepNavigationProps {
    currentStep: number;
    onStepClick: (step: number) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any; // Using any for translation function to avoid complex type dragging
}

export function StepNavigation({ currentStep, onStepClick, t }: StepNavigationProps) {
    const steps = [
        { number: 1, name: t('help.steps.storyPrompt'), shortName: t('steps.prompt.title') },
        { number: 2, name: t('help.steps.characters'), shortName: t('steps.characters.title') },
        { number: 3, name: t('help.steps.sceneImages'), shortName: t('help.steps.sceneImages') },
        { number: 4, name: t('help.steps.videos'), shortName: t('help.steps.videos') },
        { number: 5, name: t('help.steps.voiceover'), shortName: t('help.steps.voiceover') },
        { number: 6, name: t('help.steps.export'), shortName: t('help.steps.export') },
    ];

    return (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full px-2">
            <div className="flex items-center gap-1 mx-auto">
                {steps.map((step) => (
                    <button
                        key={step.number}
                        onClick={() => onStepClick(step.number)}
                        className={`
              relative px-3 md:px-4 py-1.5 md:py-2 rounded-full transition-all duration-200 whitespace-nowrap
              ${currentStep === step.number
                                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/25'
                                : currentStep > step.number
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                    : 'bg-white/10 text-muted-foreground hover:bg-white/20'
                            }
            `}
                    >
                        <span className="flex items-center gap-2">
                            <span className="text-sm md:text-base font-bold leading-none">{step.number}</span>
                            <span className="hidden sm:inline text-[10px] md:text-xs font-medium opacity-90 uppercase tracking-wide">{step.shortName}</span>
                            {currentStep > step.number && (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
