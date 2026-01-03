'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Clock, FolderOpen } from 'lucide-react';
import { ProjectCard } from '@/components/project/ProjectCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Project } from '@/types/project';
import type { ProjectCostsData } from './types';

interface ProjectsSectionProps {
  projects: Project[];
  projectCosts: ProjectCostsData | null;
  onCreateProject: () => void;
  searchQuery: string;
}

export function ProjectsSection({ projects, projectCosts, onCreateProject, searchQuery }: ProjectsSectionProps) {
  const t = useTranslations();

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentProjects = [...filteredProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  if (projects.length === 0) {
    return <EmptyState onCreateProject={onCreateProject} />;
  }

  return (
    <div className="space-y-12">
        {/* Recent Projects */}
        {recentProjects.length > 0 && !searchQuery && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              {t('dashboard.recentProjects')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <ProjectCard
                    project={project}
                    variant="compact"
                    cost={projectCosts?.costs[project.id]}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* All Projects */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            {searchQuery ? `Search Results (${filteredProjects.length})` : t('dashboard.allProjects')}
          </h2>
          {filteredProjects.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects found matching &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.05 }}
                >
                  <ProjectCard
                    project={project}
                    cost={projectCosts?.costs[project.id]}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
  );
}
