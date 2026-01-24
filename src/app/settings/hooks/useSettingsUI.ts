/**
 * UI preference handlers for settings
 */

import { useCallback } from 'react';
import { toast } from '@/lib/toast';
import { setCurrency as setCurrencyUtil, type Currency } from '@/lib/utils/currency';
import type { TranslationFunction } from './utils';

export interface UseSettingsUIParams {
  language: string;
  darkMode: boolean;
  reducedMotion: boolean;
  notifyOnComplete: boolean;
  autoSave: boolean;
  currency: Currency;
  setLanguage: (value: string) => void;
  setDarkMode: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setNotifyOnComplete: (value: boolean) => void;
  setAutoSave: (value: boolean) => void;
  setCurrency: (value: Currency) => void;
  tPage: TranslationFunction;
}

export function useSettingsUI({
  language,
  darkMode,
  reducedMotion,
  notifyOnComplete,
  autoSave,
  currency,
  setLanguage,
  setDarkMode,
  setReducedMotion,
  setNotifyOnComplete,
  setAutoSave,
  setCurrency,
  tPage,
}: UseSettingsUIParams) {
  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
    localStorage.setItem('app-language', newLang);
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`;
    toast.success(tPage('toasts.languageUpdated'), {
      description: newLang === 'sk' ? tPage('toasts.languageChangedSk') : tPage('toasts.languageChangedEn'),
    });
    window.location.reload();
  }, [setLanguage, tPage]);

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
  }, [setDarkMode, tPage]);

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
  }, [setReducedMotion, tPage]);

  const handleNotifyChange = useCallback((enabled: boolean) => {
    setNotifyOnComplete(enabled);
    localStorage.setItem('app-notify-complete', String(enabled));
  }, [setNotifyOnComplete]);

  const handleAutoSaveChange = useCallback((enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem('app-auto-save', String(enabled));
  }, [setAutoSave]);

  const handleCurrencyChange = useCallback((newCurrency: Currency) => {
    setCurrency(newCurrency);
    setCurrencyUtil(newCurrency);
    toast.success(tPage('toasts.currencyUpdated') || 'Currency updated', {
      description: `${tPage('toasts.nowDisplaying') || 'Now displaying prices in'} ${newCurrency}`,
    });
  }, [setCurrency, tPage]);

  const fetchActionCosts = useCallback(async (actionCosts: any) => {
    if (actionCosts) return actionCosts;
    try {
      const response = await fetch('/api/costs');
      const data = await response.json();
      return data.costs;
    } catch (error) {
      console.error('Failed to fetch action costs:', error);
      return null;
    }
  }, []);

  return {
    language,
    darkMode,
    reducedMotion,
    notifyOnComplete,
    autoSave,
    currency,
    handleLanguageChange,
    handleDarkModeChange,
    handleReducedMotionChange,
    handleNotifyChange,
    handleAutoSaveChange,
    handleCurrencyChange,
    fetchActionCosts,
  };
}
