/**
 * Data export and delete handlers for settings
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/stores/project-store';
import { toast } from '@/lib/toast';
import type { Project } from '@/types/project';
import type { TranslationFunction } from './utils';

export interface UseSettingsDataParams {
  projects: Project[];
  language: string;
  darkMode: boolean;
  reducedMotion: boolean;
  notifyOnComplete: boolean;
  autoSave: boolean;
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  tPage: TranslationFunction;
}

export function useSettingsData({
  projects,
  language,
  darkMode,
  reducedMotion,
  notifyOnComplete,
  autoSave,
  isExporting,
  setIsExporting,
  tPage,
}: UseSettingsDataParams) {
  const router = useRouter();
  const { clearProjects } = useProjectStore();

  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        projects: projects,
        settings: {
          language,
          darkMode,
          reducedMotion,
          notifyOnComplete,
          autoSave,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artflowly-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(tPage('toasts.dataExported'), {
        description: tPage('toasts.dataExportedDesc'),
      });
    } catch (error) {
      toast.error(tPage('toasts.exportFailed'), {
        description: tPage('toasts.exportFailedDesc'),
      });
    } finally {
      setIsExporting(false);
    }
  }, [projects, language, darkMode, reducedMotion, notifyOnComplete, autoSave, setIsExporting, tPage]);

  const handleDeleteAllData = useCallback(() => {
    clearProjects();
    localStorage.removeItem('artflowly-projects');
    localStorage.removeItem('artflowly-api-config');
    localStorage.removeItem('app-language');
    localStorage.removeItem('app-dark-mode');
    localStorage.removeItem('app-reduced-motion');
    localStorage.removeItem('app-notify-complete');
    localStorage.removeItem('app-auto-save');

    toast.success(tPage('toasts.dataDeleted'), {
      description: tPage('toasts.dataDeletedDesc'),
    });

    router.push('/');
  }, [clearProjects, router, tPage]);

  return {
    isExporting,
    projects,
    handleExportData,
    handleDeleteAllData,
  };
}
