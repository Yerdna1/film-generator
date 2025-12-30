'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
import { toast } from 'sonner';
import type { ActionCosts } from '../types';

export function useSettings() {
  const tPage = useTranslations('settingsPage');
  const router = useRouter();
  const { apiConfig, setApiConfig, projects, clearProjects } = useProjectStore();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [language, setLanguage] = useState('en');
  const [darkMode, setDarkMode] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [actionCosts, setActionCosts] = useState<ActionCosts | null>(null);
  const [costsLoading, setCostsLoading] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language') || 'en';
    const savedDarkMode = localStorage.getItem('app-dark-mode') !== 'false';
    const savedReducedMotion = localStorage.getItem('app-reduced-motion') === 'true';
    const savedNotify = localStorage.getItem('app-notify-complete') !== 'false';
    const savedAutoSave = localStorage.getItem('app-auto-save') !== 'false';

    setLanguage(savedLanguage);
    setDarkMode(savedDarkMode);
    setReducedMotion(savedReducedMotion);
    setNotifyOnComplete(savedNotify);
    setAutoSave(savedAutoSave);
  }, []);

  const fetchActionCosts = useCallback(async () => {
    if (actionCosts) return;
    setCostsLoading(true);
    try {
      const response = await fetch('/api/costs');
      const data = await response.json();
      setActionCosts(data.costs);
    } catch (error) {
      console.error('Failed to fetch action costs:', error);
    } finally {
      setCostsLoading(false);
    }
  }, [actionCosts]);

  const toggleKeyVisibility = useCallback((key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSaveKey = useCallback((key: string) => {
    setApiConfig({ [key]: localConfig[key as keyof typeof localConfig] });
    setSavedKeys((prev) => ({ ...prev, [key]: true }));
    toast.success(tPage('toasts.apiKeySaved'), {
      description: tPage('toasts.apiKeySavedDesc'),
    });
    setTimeout(() => {
      setSavedKeys((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  }, [localConfig, setApiConfig, tPage]);

  const updateLocalConfig = useCallback((key: string, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
    localStorage.setItem('app-language', newLang);
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`;
    toast.success(tPage('toasts.languageUpdated'), {
      description: newLang === 'sk' ? tPage('toasts.languageChangedSk') : tPage('toasts.languageChangedEn'),
    });
    window.location.reload();
  }, [tPage]);

  const handleDarkModeChange = useCallback((enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem('app-dark-mode', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(enabled ? tPage('toasts.darkModeEnabled') : tPage('toasts.lightModeEnabled'), {
      description: tPage('toasts.themePreferenceSaved'),
    });
  }, [tPage]);

  const handleReducedMotionChange = useCallback((enabled: boolean) => {
    setReducedMotion(enabled);
    localStorage.setItem('app-reduced-motion', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    toast.success(enabled ? tPage('toasts.reducedMotionEnabled') : tPage('toasts.animationsEnabled'), {
      description: tPage('toasts.motionPreferenceSaved'),
    });
  }, [tPage]);

  const handleNotifyChange = useCallback((enabled: boolean) => {
    setNotifyOnComplete(enabled);
    localStorage.setItem('app-notify-complete', String(enabled));
  }, []);

  const handleAutoSaveChange = useCallback((enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem('app-auto-save', String(enabled));
  }, []);

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
      a.download = `film-generator-backup-${new Date().toISOString().split('T')[0]}.json`;
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
  }, [projects, language, darkMode, reducedMotion, notifyOnComplete, autoSave, tPage]);

  const handleDeleteAllData = useCallback(() => {
    clearProjects();
    localStorage.removeItem('film-generator-projects');
    localStorage.removeItem('film-generator-api-config');
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
    // State
    showKeys,
    savedKeys,
    localConfig,
    language,
    darkMode,
    reducedMotion,
    notifyOnComplete,
    autoSave,
    isExporting,
    actionCosts,
    costsLoading,
    apiConfig,
    projects,

    // Actions
    toggleKeyVisibility,
    handleSaveKey,
    updateLocalConfig,
    handleLanguageChange,
    handleDarkModeChange,
    handleReducedMotionChange,
    handleNotifyChange,
    handleAutoSaveChange,
    handleExportData,
    handleDeleteAllData,
    fetchActionCosts,
  };
}
