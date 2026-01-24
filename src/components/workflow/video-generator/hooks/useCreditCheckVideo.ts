import { useState, useCallback } from 'react';
import { toast } from '@/lib/toast';
import type { ApiKeysData } from '@/hooks/use-api-keys';

export interface PendingVideoGeneration {
  type: 'single' | 'all' | 'selected';
  scene?: any;
  scenes?: any[];
}

export interface UseCreditCheckVideoProps {
  apiKeysData: ApiKeysData | null | undefined;
  onGenerateVideo: (scene: any) => Promise<void>;
  onGenerateAll: () => Promise<void>;
  onGenerateSelected: () => Promise<void>;
  scenesNeedingGeneration: any[];
  scenes: any[];
  selectedScenes: Set<string>;
}

export interface UseCreditCheckVideoReturn {
  // State
  isInsufficientCreditsModalOpen: boolean;
  isKieModalOpen: boolean;
  isSavingKieKey: boolean;
  pendingVideoGeneration: PendingVideoGeneration | null;
  showConfirmDialog: boolean;
  confirmDialogType: 'single' | 'all' | 'selected';
  confirmDialogScene: any;

  // Actions
  handleGenerateVideoWithCreditCheck: (scene: any) => void;
  handleGenerateAllWithCreditCheck: () => void;
  handleGenerateSelectedWithCreditCheck: () => void;
  handleConfirmGeneration: () => Promise<void>;
  handleUseAppCredits: () => Promise<void>;
  handleSaveKieApiKey: (apiKey: string, model: string) => Promise<void>;
  closeInsufficientCreditsModal: () => void;
  closeKieModal: () => void;
  closeConfirmDialog: () => void;
}

export function useCreditCheckVideo({
  apiKeysData,
  onGenerateVideo,
  onGenerateAll,
  onGenerateSelected,
  scenesNeedingGeneration,
  scenes,
  selectedScenes,
}: UseCreditCheckVideoProps): UseCreditCheckVideoReturn {
  // Modal states
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);
  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);

  // Pending video generation (for credit check flow)
  const [pendingVideoGeneration, setPendingVideoGeneration] = useState<PendingVideoGeneration | null>(null);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'single' | 'all' | 'selected'>('all');
  const [confirmDialogScene, setConfirmDialogScene] = useState<any>(null);

  // Credit check wrapper for single video generation
  const handleGenerateVideoWithCreditCheck = useCallback((scene: any) => {
    setConfirmDialogType('single');
    setConfirmDialogScene(scene);
    setShowConfirmDialog(true);
  }, []);

  // Credit check wrapper for all videos generation
  const handleGenerateAllWithCreditCheck = useCallback(() => {
    setConfirmDialogType('all');
    setConfirmDialogScene(null);
    setShowConfirmDialog(true);
  }, []);

  // Credit check wrapper for selected videos generation
  const handleGenerateSelectedWithCreditCheck = useCallback(() => {
    setConfirmDialogType('selected');
    setConfirmDialogScene(null);
    setShowConfirmDialog(true);
  }, []);

  // Confirm video generation from dialog
  const handleConfirmGeneration = useCallback(async () => {
    setShowConfirmDialog(false);

    // Check if user has their own KIE API key (not using platform credits)
    const hasOwnKieApiKey = !!apiKeysData?.kieApiKey;

    if (confirmDialogType === 'single' && confirmDialogScene) {
      // If user has own API key, skip credit check
      if (hasOwnKieApiKey || apiKeysData === null) {
        await onGenerateVideo(confirmDialogScene);
      } else {
        // Check credits
        setPendingVideoGeneration({ type: 'single', scene: confirmDialogScene });
        setIsInsufficientCreditsModalOpen(true);
      }
    } else if (confirmDialogType === 'all') {
      // If user has own API key, skip credit check
      if (hasOwnKieApiKey || apiKeysData === null) {
        await onGenerateAll();
      } else {
        // Check credits
        setPendingVideoGeneration({ type: 'all', scenes: scenesNeedingGeneration });
        setIsInsufficientCreditsModalOpen(true);
      }
    } else if (confirmDialogType === 'selected') {
      // If user has own API key, skip credit check
      if (hasOwnKieApiKey || apiKeysData === null) {
        await onGenerateSelected();
      } else {
        // Check credits
        const selectedScenesArray = scenes.filter(s => selectedScenes.has(s.id));
        setPendingVideoGeneration({ type: 'selected', scenes: selectedScenesArray });
        setIsInsufficientCreditsModalOpen(true);
      }
    }
  }, [confirmDialogType, confirmDialogScene, apiKeysData, onGenerateVideo, onGenerateAll, onGenerateSelected, scenesNeedingGeneration, scenes, selectedScenes]);

  // Proceed with generation using app credits
  const handleUseAppCredits = useCallback(async () => {
    if (!pendingVideoGeneration) return;

    setIsInsufficientCreditsModalOpen(false);

    if (pendingVideoGeneration.type === 'single' && pendingVideoGeneration.scene) {
      await onGenerateVideo(pendingVideoGeneration.scene);
    } else if (pendingVideoGeneration.type === 'all' && pendingVideoGeneration.scenes) {
      await onGenerateAll();
    } else if (pendingVideoGeneration.type === 'selected' && pendingVideoGeneration.scenes) {
      await onGenerateSelected();
    }

    setPendingVideoGeneration(null);
  }, [pendingVideoGeneration, onGenerateVideo, onGenerateAll, onGenerateSelected]);

  // Save KIE AI API key handler
  const handleSaveKieApiKey = useCallback(async (apiKey: string, model: string): Promise<void> => {
    setIsSavingKieKey(true);

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kieApiKey: apiKey,
          kieVideoModel: model,
          videoProvider: 'kie',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save API key');
      }

      toast.success('KIE AI API Key uložený', {
        description: 'Generujem videá...',
      });

      setIsKieModalOpen(false);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Process pending generation with KIE key
      if (pendingVideoGeneration) {
        if (pendingVideoGeneration.type === 'single' && pendingVideoGeneration.scene) {
          await onGenerateVideo(pendingVideoGeneration.scene);
        } else if (pendingVideoGeneration.type === 'all' && pendingVideoGeneration.scenes) {
          await onGenerateAll();
        } else if (pendingVideoGeneration.type === 'selected' && pendingVideoGeneration.scenes) {
          await onGenerateSelected();
        }
        setPendingVideoGeneration(null);
      }
    } catch (error) {
      toast.error('Failed to Save API Key', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      setIsSavingKieKey(false);
    }
  }, [pendingVideoGeneration, onGenerateVideo, onGenerateAll, onGenerateSelected]);

  return {
    // State
    isInsufficientCreditsModalOpen,
    isKieModalOpen,
    isSavingKieKey,
    pendingVideoGeneration,
    showConfirmDialog,
    confirmDialogType,
    confirmDialogScene,

    // Actions
    handleGenerateVideoWithCreditCheck,
    handleGenerateAllWithCreditCheck,
    handleGenerateSelectedWithCreditCheck,
    handleConfirmGeneration,
    handleUseAppCredits,
    handleSaveKieApiKey,
    closeInsufficientCreditsModal: () => setIsInsufficientCreditsModalOpen(false),
    closeKieModal: () => setIsKieModalOpen(false),
    closeConfirmDialog: () => setShowConfirmDialog(false),
  };
}
