/**
 * API key management handlers for settings
 */

import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { toast } from '@/lib/toast';
import { broadcastApiKeysUpdate, syncSettingToDatabase } from './utils';
import type { TranslationFunction } from './utils';

export interface UseSettingsApiKeysParams {
  showKeys: Record<string, boolean>;
  savedKeys: Record<string, boolean>;
  localConfig: Record<string, any>;
  setShowKeys: Dispatch<SetStateAction<Record<string, boolean>>>;
  setSavedKeys: Dispatch<SetStateAction<Record<string, boolean>>>;
  setLocalConfig: Dispatch<SetStateAction<Record<string, any>>>;
  setApiConfig: (value: any) => void;
  tPage: TranslationFunction;
}

export function useSettingsApiKeys({
  showKeys,
  savedKeys,
  localConfig,
  setShowKeys,
  setSavedKeys,
  setLocalConfig,
  setApiConfig,
  tPage,
}: UseSettingsApiKeysParams) {
  const { apiConfig } = useProjectStore();

  // Listen for API key updates from ApiKeysContext
  useEffect(() => {
    const handleApiKeysUpdate = (event: CustomEvent) => {
      const updatedKeys = event.detail;
      if (updatedKeys) {
        setLocalConfig(updatedKeys);
        setApiConfig(updatedKeys);
      }
    };

    window.addEventListener('apiKeysUpdated' as any, handleApiKeysUpdate);
    return () => {
      window.removeEventListener('apiKeysUpdated' as any, handleApiKeysUpdate);
    };
  }, [setApiConfig, setLocalConfig]);

  const toggleKeyVisibility = useCallback((key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, [setShowKeys]);

  const handleSaveKey = useCallback(async (key: string) => {
    const value = localConfig[key as keyof typeof localConfig];

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.apiKeys) {
          setApiConfig({ [key]: value });
          setSavedKeys((prev) => ({ ...prev, [key]: true }));
          broadcastApiKeysUpdate(data.apiKeys);

          toast.success(tPage('toasts.apiKeySaved'), {
            description: tPage('toasts.apiKeySavedDesc'),
          });

          setTimeout(() => {
            setSavedKeys((prev) => ({ ...prev, [key]: false }));
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error(tPage('toasts.saveFailed') || 'Failed to save');
    }
  }, [localConfig, setApiConfig, setSavedKeys, tPage]);

  const updateLocalConfig = useCallback((key: string, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  }, [setLocalConfig]);

  return {
    showKeys,
    savedKeys,
    localConfig,
    apiConfig,
    toggleKeyVisibility,
    handleSaveKey,
    updateLocalConfig,
  };
}
