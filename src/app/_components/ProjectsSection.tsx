'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Clock, FolderOpen, Film, LayoutGrid, List, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProjectCard } from '@/components/project/ProjectCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import type { Project } from '@/types/project';
import type { ProjectCostsData } from './types';

type ViewMode = 'grid-3' | 'grid-4' | 'list';
type PageSize = 9 | 16;

// Simple image-only thumbnail card for recent projects
function MiniProjectCard({ project }: { project: Project }) {
  // Get thumbnail
  const thumbnailUrl = (() => {
    if ('thumbnailUrl' in project && project.thumbnailUrl) {
      return project.thumbnailUrl as string;
    }
    if (project.scenes?.length) {
      const sceneWithImage = project.scenes.find(scene => scene.imageUrl);
      if (sceneWithImage?.imageUrl) return sceneWithImage.imageUrl;
    }
    if (project.characters?.length) {
      const characterWithImage = project.characters.find(char => char.imageUrl);
      if (characterWithImage?.imageUrl) return characterWithImage.imageUrl;
    }
    return null;
  })();

  return (
    <Link href={`/project/${project.id}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="relative aspect-video w-24 sm:w-28 md:w-32 rounded-md overflow-hidden glass border border-white/10 cursor-pointer group"
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={project.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <Film className="w-4 h-4 sm:w-5 sm:h-5 text-white/20" />
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    </Link>
  );
}

// List view project item
function ProjectListItem({ project, cost }: { project: Project; cost?: any }) {
  const t = useTranslations();
  const thumbnailUrl = (() => {
    if ('thumbnailUrl' in project && project.thumbnailUrl) {
      return project.thumbnailUrl as string;
    }
    if (project.scenes?.length) {
      const sceneWithImage = project.scenes.find(scene => scene.imageUrl);
      if (sceneWithImage?.imageUrl) return sceneWithImage.imageUrl;
    }
    if (project.characters?.length) {
      const characterWithImage = project.characters.find(char => char.imageUrl);
      if (characterWithImage?.imageUrl) return characterWithImage.imageUrl;
    }
    return null;
  })();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.time.justNow');
    if (diffMins < 60) return t('common.time.minutesAgo', { minutes: diffMins });
    if (diffHours < 24) return t('common.time.hoursAgo', { hours: diffHours });
    if (diffDays < 7) return t('common.time.daysAgo', { days: diffDays });
    return date.toLocaleDateString();
  };

  return (
    <Link href={`/project/${project.id}`}>
      <motion.div
        whileHover={{ x: 4 }}
        className="glass rounded-xl p-4 border border-white/10 cursor-pointer group hover:border-white/20 transition-all"
      >
        <div className="flex items-center gap-4">
          {/* Thumbnail */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-900/30 to-cyan-900/30">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={project.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100px, (max-width: 1200px) 80px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="w-6 h-6 text-white/20" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base mb-1 truncate group-hover:text-purple-400 transition-colors">
              {project.name}
            </h3>
            <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(project.updatedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Film className="w-3 h-3" />
                {'scenesCount' in project ? project.scenesCount as number : project.scenes?.length ?? 0}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {cost && cost.realCost > 0 && (
              <span className="text-xs sm:text-sm text-green-400 font-medium whitespace-nowrap">
                {cost.realCost.toFixed(2)}€
              </span>
            )}
            <Grid className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

interface ProjectsSectionProps {
  projects: Project[];
  projectCosts: ProjectCostsData | null;
  onCreateProject: () => void;
  searchQuery: string;
}

export function ProjectsSection({ projects, projectCosts, onCreateProject, searchQuery }: ProjectsSectionProps) {
  const t = useTranslations();
  const [viewMode, setViewMode] = useState<ViewMode>('grid-3');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(9);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProjects.length);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  // Reset page when filters change
  if (searchQuery) {
    setCurrentPage(1);
  }

  // Reset page when page size changes
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

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
            <h2 className="text-sm font-medium mb-2 flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {t('dashboard.recentProjects')}
            </h2>
            <div className="flex flex-wrap gap-1 max-w-2xl">
              {recentProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <MiniProjectCard project={project} />
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
              {searchQuery ? `Search Results (${filteredProjects.length})` : t('dashboard.allProjects')}
            </h2>

            {/* View Toggle Buttons */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
              <Button
                variant={viewMode === 'grid-3' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid-3')}
                className={`h-8 w-8 p-0 ${viewMode === 'grid-3' ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'hover:bg-white/10'}`}
                title="3 columns"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid-4' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid-4')}
                className={`h-8 w-8 p-0 ${viewMode === 'grid-4' ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'hover:bg-white/10'}`}
                title="4 columns"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 w-8 p-0 ${viewMode === 'list' ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'hover:bg-white/10'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects found matching &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <>
              {/* 3x3 Grid View */}
              {viewMode === 'grid-3' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {paginatedProjects.map((project, index) => (
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

              {/* 4x4 Grid View */}
              {viewMode === 'grid-4' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {paginatedProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                    >
                      <ProjectCard
                        project={project}
                        variant="compact"
                        cost={projectCosts?.costs[project.id]}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-2 sm:space-y-3">
                  {paginatedProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.03 }}
                    >
                      <ProjectListItem
                        project={project}
                        cost={projectCosts?.costs[project.id]}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <div className="flex gap-1">
                      <Button
                        variant={pageSize === 9 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setPageSize(9); setCurrentPage(1); }}
                        className={`h-8 px-3 text-xs ${pageSize === 9 ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'border-white/10 hover:bg-white/5'}`}
                      >
                        9
                      </Button>
                      <Button
                        variant={pageSize === 16 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setPageSize(16); setCurrentPage(1); }}
                        className={`h-8 px-3 text-xs ${pageSize === 16 ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'border-white/10 hover:bg-white/5'}`}
                      >
                        16
                      </Button>
                    </div>
                  </div>

                  {/* Page Navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0 border-white/10 hover:bg-white/5 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0 border-white/10 hover:bg-white/5 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.section>
      </div>
  );
}
