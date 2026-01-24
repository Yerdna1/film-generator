import { useCallback } from 'react';
import type { Scene } from '@/types/project';
import type { UserApiKeys } from '../types';
import { getImageCreditCost } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';

interface UseSceneGeneratorCreditsProps {
  creditsData: { credits: { balance: number } } | undefined;
  imageResolution: string;
  userApiKeys: UserApiKeys | null;
  apiKeysData: any;
  projectSettings: any;
  scenes: Scene[];
  handleGenerateSceneImage: (sceneId: string) => Promise<void>;
  handleGenerateAllSceneImages: () => Promise<void>;
  onOpenKieModal?: () => void;
}

interface UseSceneGeneratorCreditsReturn {
  handleGenerateSceneImageWithCreditCheck: (scene: Scene) => Promise<void>;
  handleGenerateAllWithCreditCheck: () => Promise<void>;
  handleGenerateAllScenesWithCreditCheck: () => Promise<void>;
}

/**
 * Hook to handle credit checking logic for scene and image generation
 * Wraps generation functions with credit balance checks
 */
export function useSceneGeneratorCredits({
  creditsData,
  imageResolution,
  userApiKeys,
  apiKeysData,
  projectSettings,
  scenes,
  handleGenerateSceneImage,
  handleGenerateAllSceneImages,
  onOpenKieModal,
}: UseSceneGeneratorCreditsProps): UseSceneGeneratorCreditsReturn {
  // Wrapper for image generation with credit check
  const handleGenerateSceneImageWithCreditCheck = useCallback(async (scene: Scene) => {
    // Check if user has their own KIE API key (not using platform credits)
    const hasOwnKieApiKey = !!userApiKeys?.kieApiKey;
    if (hasOwnKieApiKey) {
      await handleGenerateSceneImage(scene.id);
      return;
    }
    if (userApiKeys === null) {
      await handleGenerateSceneImage(scene.id);
      return;
    }
    const creditsNeeded = getImageCreditCost(imageResolution);
    const currentCredits = creditsData?.credits.balance || 0;
    const hasCredits = currentCredits >= creditsNeeded;
    if (hasCredits) {
      await handleGenerateSceneImage(scene.id);
    } else {
      // Show KIE modal directly when no credits
      onOpenKieModal?.();
    }
  }, [creditsData, imageResolution, userApiKeys, handleGenerateSceneImage, onOpenKieModal]);

  // Wrapper for "Generate All" with credit check
  const handleGenerateAllWithCreditCheck = useCallback(async () => {
    const scenesNeedingImages = scenes.filter(s => !s.imageUrl);
    if (scenesNeedingImages.length === 0) return;
    // Check if user has their own KIE API key (not using platform credits)
    const hasOwnKieApiKey = !!userApiKeys?.kieApiKey;
    if (hasOwnKieApiKey) {
      await handleGenerateAllSceneImages();
      return;
    }
    if (userApiKeys === null) {
      await handleGenerateAllSceneImages();
      return;
    }
    const creditsNeeded = getImageCreditCost(imageResolution) * scenesNeedingImages.length;
    const currentCredits = creditsData?.credits.balance || 0;
    const hasCredits = currentCredits >= creditsNeeded;
    if (hasCredits) {
      await handleGenerateAllSceneImages();
    } else {
      // Show KIE modal directly when no credits
      onOpenKieModal?.();
    }
  }, [creditsData, imageResolution, scenes, userApiKeys, handleGenerateAllSceneImages, onOpenKieModal]);

  // Wrapper for scene text generation with credit check
  const handleGenerateAllScenesWithCreditCheck = useCallback(async () => {
    // Wait for API keys data to load before showing dialog
    if (!apiKeysData) {
      console.warn('[Step3] API keys data not loaded yet, waiting...');
      return;
    }

    // Bypass credit check if user has ANY LLM provider configured
    // Check for: OpenRouter, Claude SDK, or Modal (self-hosted)
    const hasOpenRouterKey = apiKeysData?.hasOpenRouterKey;
    const hasClaudeKey = apiKeysData?.hasClaudeKey;
    const hasModalLlm = apiKeysData?.modalLlmEndpoint;

    // Show confirmation dialog for ALL users
    // Note: The actual generation happens after dialog confirmation
    // The caller should handle showing the dialog
    return { shouldShowDialog: true };

    // Note: The actual generation happens after dialog confirmation in handleConfirmGenerateScenes
  }, [apiKeysData]);

  return {
    handleGenerateSceneImageWithCreditCheck,
    handleGenerateAllWithCreditCheck,
    handleGenerateAllScenesWithCreditCheck,
  };
}
