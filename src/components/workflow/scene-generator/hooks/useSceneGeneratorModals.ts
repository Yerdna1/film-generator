import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from '@/lib/toast';
import { useProjectStore } from '@/lib/stores/project-store';
import type { UserApiKeys } from '../types';

interface UseSceneGeneratorModalsProps {
  onUpdateUserConstants?: (values: Record<string, unknown>) => void;
  onGenerateAllScenes?: (skipCreditCheck: boolean) => Promise<void>;
}

interface UseSceneGeneratorModalsReturn {
  // KIE Modal state
  isKieModalOpen: boolean;
  setIsKieModalOpen: (open: boolean) => void;
  isSavingKieKey: boolean;
  userApiKeys: UserApiKeys | null;
  handleSaveKieApiKey: (apiKey: string, model: string) => Promise<void>;

  // OpenRouter Modal state
  isOpenRouterModalOpen: boolean;
  setIsOpenRouterModalOpen: (open: boolean) => void;
  isSavingOpenRouterKey: boolean;
  pendingSceneTextGeneration: boolean;
  setPendingSceneTextGeneration: (pending: boolean) => void;
  sceneTextCreditsNeeded: number;
  setSceneTextCreditsNeeded: (needed: number) => void;
  handleSaveOpenRouterKey: (apiKey: string, model: string) => Promise<void>;

  // Generate Scenes confirmation dialog state
  showGenerateDialog: boolean;
  setShowGenerateDialog: (show: boolean) => void;
  isConfirmGenerating: boolean;
  setIsConfirmGenerating: (generating: boolean) => void;

  // Generate Images confirmation dialog state
  showGenerateImagesDialog: boolean;
  setShowGenerateImagesDialog: (show: boolean) => void;

  // Request Regeneration dialog state
  showRequestRegenDialog: boolean;
  setShowRequestRegenDialog: (show: boolean) => void;
}

/**
 * Hook to manage all modal states for Step3 Scene Generator
 * Handles KIE API key modal, OpenRouter API key modal, confirmation dialogs, and regeneration request dialog
 */
export function useSceneGeneratorModals({
  onUpdateUserConstants,
  onGenerateAllScenes,
}: UseSceneGeneratorModalsProps = {}): UseSceneGeneratorModalsReturn {
  const t = useTranslations('api');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const { updateUserConstants } = useProjectStore();

  // KIE Modal state
  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);
  const [userApiKeys, setUserApiKeys] = useState<UserApiKeys | null>(null);

  // OpenRouter Modal state
  const [isOpenRouterModalOpen, setIsOpenRouterModalOpen] = useState(false);
  const [isSavingOpenRouterKey, setIsSavingOpenRouterKey] = useState(false);
  const [pendingSceneTextGeneration, setPendingSceneTextGeneration] = useState(false);
  const [sceneTextCreditsNeeded, setSceneTextCreditsNeeded] = useState(0);

  // Generate Scenes confirmation dialog state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [isConfirmGenerating, setIsConfirmGenerating] = useState(false);

  // Generate Images confirmation dialog state
  const [showGenerateImagesDialog, setShowGenerateImagesDialog] = useState(false);

  // Request Regeneration dialog state
  const [showRequestRegenDialog, setShowRequestRegenDialog] = useState(false);

  // Fetch user's API keys for KIE modal
  const fetchApiKeys = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/user/api-keys');
      if (res.ok) {
        const data = await res.json();
        setUserApiKeys({
          hasKieKey: data.hasKieKey || false,
          kieApiKey: data.kieApiKey,
        });
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  }, [session]);

  // Fetch API keys on mount
  useState(() => {
    fetchApiKeys();
  });

  // Save KIE API key handler
  const handleSaveKieApiKey = useCallback(async (apiKey: string, model: string): Promise<void> => {
    setIsSavingKieKey(true);
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kieApiKey: apiKey,
          kieImageModel: model,
          imageProvider: 'kie',
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save API key');
      }
      setUserApiKeys(prev => prev ? { ...prev, hasKieKey: true, kieImageModel: model } : null);
      if (onUpdateUserConstants) {
        onUpdateUserConstants({ characterImageProvider: 'kie' });
      } else {
        updateUserConstants({ characterImageProvider: 'kie' });
      }
      toast.success(t('keySaved.kie'), { description: t('generating.sceneImages') });
      setIsKieModalOpen(false);
    } catch (error) {
      toast.error(t('saveFailed'), { description: error instanceof Error ? error.message : tCommon('unknownError') });
      throw error;
    } finally {
      setIsSavingKieKey(false);
    }
  }, [t, tCommon, updateUserConstants, onUpdateUserConstants]);

  // Save OpenRouter API key handler
  const handleSaveOpenRouterKey = useCallback(async (apiKey: string, model: string): Promise<void> => {
    setIsSavingOpenRouterKey(true);
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openRouterApiKey: apiKey,
          openRouterModel: model,
          llmProvider: 'openrouter',
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save API key');
      }
      toast.success(t('keySaved.openrouter'), { description: t('generating.scenes') });
      setIsOpenRouterModalOpen(false);
      if (onGenerateAllScenes) {
        await onGenerateAllScenes(true);
      }
      setPendingSceneTextGeneration(false);
    } catch (error) {
      toast.error(t('saveFailed'), { description: error instanceof Error ? error.message : tCommon('unknownError') });
      throw error;
    } finally {
      setIsSavingOpenRouterKey(false);
    }
  }, [t, tCommon, onGenerateAllScenes]);

  return {
    // KIE Modal
    isKieModalOpen,
    setIsKieModalOpen,
    isSavingKieKey,
    userApiKeys,
    handleSaveKieApiKey,

    // OpenRouter Modal
    isOpenRouterModalOpen,
    setIsOpenRouterModalOpen,
    isSavingOpenRouterKey,
    pendingSceneTextGeneration,
    setPendingSceneTextGeneration,
    sceneTextCreditsNeeded,
    setSceneTextCreditsNeeded,
    handleSaveOpenRouterKey,

    // Generate Scenes dialog
    showGenerateDialog,
    setShowGenerateDialog,
    isConfirmGenerating,
    setIsConfirmGenerating,

    // Generate Images dialog
    showGenerateImagesDialog,
    setShowGenerateImagesDialog,

    // Request Regeneration dialog
    showRequestRegenDialog,
    setShowRequestRegenDialog,
  };
}
