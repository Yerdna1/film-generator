import { Film } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ProjectSummaryCard } from '../../export/components';
import type { Project } from '@/types/project';
import type { ProjectStats } from '../../export/types';

interface ExportHeaderProps {
  project: Project;
  stats: ProjectStats;
}

export function ExportHeader({ project, stats }: ExportHeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <Film className="w-5 h-5 text-green-500" />
        <h2 className="text-lg font-semibold">{t('steps.export.title')}</h2>
      </div>
      <ProjectSummaryCard project={project} stats={stats} compact />
    </div>
  );
}