'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Upload, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DashboardHeroProps {
  onNewProject: () => void;
  onImportProject: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hasProjects: boolean;
}

export function DashboardHero({ onNewProject, onImportProject, searchQuery, onSearchChange, hasProjects }: DashboardHeroProps) {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3"
          >
            <span className="gradient-text">{t('dashboard.title')}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl"
          >
            {t('dashboard.subtitle')}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center w-full lg:w-auto"
        >
          {hasProjects && (
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('dashboard.searchProjects')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-14 w-full sm:w-48 lg:w-64 glass border-white/10 focus:border-purple-500/50 transition-colors"
              />
            </div>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={onImportProject}
            className="h-14 px-4 sm:px-6 text-base flex-1 sm:flex-initial"
          >
            <Upload className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">{t('project.import')}</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button
            size="lg"
            onClick={onNewProject}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 h-14 px-4 sm:px-6 text-base flex-1 sm:flex-initial"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">{t('nav.newProject')}</span>
            <span className="sm:hidden">New Project</span>
            <Sparkles className="w-4 h-4 ml-2 opacity-70" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
