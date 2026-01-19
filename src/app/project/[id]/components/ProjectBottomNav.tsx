'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project } from '@/types/project';

interface ProjectBottomNavProps {
    project: Project;
    previousStep: (id: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nextStep: (id: string) => void;
    onComplete: () => Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
}

export function ProjectBottomNav({
    project,
    previousStep,
    nextStep,
    onComplete,
    t
}: ProjectBottomNavProps) {
    return (
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
                                    onClick={onComplete}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg shadow-green-500/30"
                                >
                                    <span className="hidden sm:inline">{t('common.finish')}</span>
                                    <span className="sm:hidden">{t('common.finish')}</span>
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
