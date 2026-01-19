'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { styleOptions } from '../constants';
import type { Project, StylePreset } from '@/types/project';

interface StyleExamplesGridProps {
  project: Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  isReadOnly: boolean;
}

export function StyleExamplesGrid({ project, updateProject, isReadOnly }: StyleExamplesGridProps) {
  const t = useTranslations();

  return (
    <div className="space-y-2">
      <Label className="text-xs flex items-center gap-1">
        {t('settings.styleExamples')}
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {styleOptions.map((style) => {
          const imagePath = `/style-examples/${style.id}.jpg`;

          return (
            <motion.button
              key={style.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => !isReadOnly && updateProject(project.id, { style: style.id as StylePreset })}
              disabled={isReadOnly}
              className={`relative rounded-lg overflow-hidden aspect-[3/4] border-2 transition-all ${
                project.style === style.id
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-border hover:border-purple-300 dark:hover:border-purple-600'
              }`}
            >
              <img
                src={imagePath}
                alt={t(style.labelKey)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.querySelector('.fallback-gradient')?.classList.remove('hidden');
                }}
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-80 fallback-gradient hidden`} />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                <p className="text-[10px] text-white/90 truncate">{t(style.labelKey)}</p>
              </div>
              {project.style === style.id && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}