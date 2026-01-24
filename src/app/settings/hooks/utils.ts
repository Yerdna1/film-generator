/**
 * Helper functions for settings management
 */

import { toast } from '@/lib/toast';

export type TranslationFunction = (key: string) => string;

/**
 * Broadcast API key updates to other components via CustomEvent
 */
export const broadcastApiKeysUpdate = (apiKeys: any) => {
  window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
    detail: apiKeys
  }));
};

/**
 * Generic handler for KIE model changes
 * Updates localStorage, syncs to database, and shows toast notification
 */
export const handleKieModelChange = async (
  modelKey: string,
  modelValue: string,
  setterFunction: (value: string) => void,
  tPage: TranslationFunction
): Promise<{ title: string; description: string }> => {
  setterFunction(modelValue);
  localStorage.setItem(`app-${modelKey}`, modelValue);

  // Sync to database for authenticated users
  try {
    const response = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [modelKey]: modelValue }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.apiKeys) {
        // Broadcast the update to other components
        broadcastApiKeysUpdate(data.apiKeys);
      }
    }
  } catch (error) {
    console.error(`Failed to sync ${modelKey} to database:`, error);
  }

  return {
    title: tPage('toasts.kieModelChanged') || 'KIE model updated',
    description: `${tPage('toasts.nowUsing') || 'Now using'} ${modelValue}`
  };
};

/**
 * Get cookie value by name
 */
export const getCookieValue = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

/**
 * Convert localStorage key format to database key format
 * Removes 'app-' prefix and converts kebab-case to camelCase
 */
export const localStorageKeyToDbKey = (key: string): string => {
  return key.replace('app-', '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Sync setting to database and broadcast update
 */
export const syncSettingToDatabase = async (
  key: string,
  value: any
): Promise<void> => {
  try {
    const response = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.apiKeys) {
        broadcastApiKeysUpdate(data.apiKeys);
      }
    }
  } catch (error) {
    console.error(`Failed to sync ${key} to database:`, error);
  }
};

/**
 * Show toast notification with title and description
 */
export const showToast = (
  type: 'success' | 'error',
  title: string,
  description: string
) => {
  if (type === 'success') {
    toast.success(title, { description });
  } else {
    toast.error(title, { description });
  }
};
