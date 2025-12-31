'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  Sparkles,
  Camera,
  Clapperboard,
  Wand2,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectStore } from '@/lib/stores/project-store';
import type { StylePreset } from '@/types/project';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const styleOptions: Array<{
  id: StylePreset;
  icon: typeof Film;
  gradient: string;
  labelKey: string;
  descKey: string;
}> = [
  {
    id: 'disney-pixar',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500',
    labelKey: 'styles.disneyPixar',
    descKey: 'styles.disneyPixarDesc',
  },
  {
    id: 'realistic',
    icon: Camera,
    gradient: 'from-cyan-500 to-blue-500',
    labelKey: 'styles.realistic',
    descKey: 'styles.realisticDesc',
  },
  {
    id: 'anime',
    icon: Clapperboard,
    gradient: 'from-pink-500 to-orange-500',
    labelKey: 'styles.anime',
    descKey: 'styles.animeDesc',
  },
  {
    id: 'custom',
    icon: Wand2,
    gradient: 'from-green-500 to-teal-500',
    labelKey: 'styles.custom',
    descKey: 'styles.customDesc',
  },
];

const sceneOptions = [12, 24, 36, 48, 60, 120, 240, 360] as const;

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const { createProject } = useProjectStore();

  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>('disney-pixar');
  const [sceneCount, setSceneCount] = useState<12 | 24 | 36 | 48 | 60 | 120 | 240 | 360>(12);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!projectName.trim()) return;

    setIsCreating(true);

    // Small delay for animation
    await new Promise((resolve) => setTimeout(resolve, 500));

    const project = await createProject(projectName.trim(), selectedStyle, {
      sceneCount,
    });

    setIsCreating(false);
    onOpenChange(false);

    // Reset form
    setStep(1);
    setProjectName('');
    setSelectedStyle('disney-pixar');
    setSceneCount(12);

    // Navigate to project
    router.push(`/project/${project.id}`);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep(1);
      setProjectName('');
      setSelectedStyle('disney-pixar');
      setSceneCount(12);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-strong border-white/10 max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text">
            {t('project.newProject')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 1
              ? t('steps.prompt.description')
              : 'Choose your visual style and scene count'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 my-4">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step >= s
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                    : 'bg-white/5 text-muted-foreground'
                }`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 2 && (
                <div
                  className={`w-12 h-0.5 transition-all ${
                    step > s ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-sm font-medium">
                  {t('project.projectName')}
                </Label>
                <Input
                  id="project-name"
                  placeholder={t('project.projectNamePlaceholder')}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="h-12 glass border-white/10 focus:border-purple-500/50 text-lg"
                  autoFocus
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!projectName.trim()}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
                >
                  {t('common.next')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 py-4"
            >
              {/* Style Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('styles.title')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {styleOptions.map((style) => (
                    <motion.button
                      key={style.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`relative p-4 rounded-xl text-left transition-all ${
                        selectedStyle === style.id
                          ? 'ring-2 ring-purple-500 bg-purple-500/10'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center`}
                        >
                          <style.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{t(style.labelKey)}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {t(style.descKey)}
                          </p>
                        </div>
                      </div>
                      {selectedStyle === style.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Scene Count */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('steps.scenes.sceneCount')}</Label>
                <Select
                  value={sceneCount.toString()}
                  onValueChange={(v) => setSceneCount(parseInt(v) as typeof sceneCount)}
                >
                  <SelectTrigger className="h-12 glass border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-strong border-white/10">
                    {sceneOptions.map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} {t('project.scenes')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  {t('common.back')}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 min-w-[140px]"
                >
                  {isCreating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('common.create')}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
