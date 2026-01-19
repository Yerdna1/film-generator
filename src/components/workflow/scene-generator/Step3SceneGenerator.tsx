'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useProjectStore } from '@/lib/stores/project-store';
import { useApiKeys, useCredits } from '@/hooks';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import { getImageCreditCost } from '@/lib/services/credits';
import type { Scene, ImageProvider } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { useSceneGenerator, useStep3Collaboration, useStep3Pagination } from './hooks';
import { Step3Content } from './components';
import type { Step3Props, UserApiKeys } from './types';

export function Step3SceneGenerator({
  project: initialProject,
  permissions,
  userRole,
  isReadOnly = false,
  isAuthenticated = false,
}: Step3Props) {
  const t = useTranslations('api');
  const tCommon = useTranslations('common');
  const { apiConfig, setApiConfig, updateUserConstants } = useProjectStore();
  const { data: session } = useSession();

  // Determine permissions
  const canDeleteDirectly = permissions?.canDelete ?? true;
  const isAdmin = permissions?.canApproveRequests ?? true;

  // Use SWR hooks for API keys and credits
  const { imageProvider: apiKeysImageProvider, data: apiKeysData } = useApiKeys();
  const { data: creditsData } = useCredits();

  // Sync provider settings to store when API keys data is loaded
  useEffect(() => {
    if (apiKeysData) {
      const {
        imageProvider,
        llmProvider,
        ttsProvider,
        musicProvider,
        videoProvider,
        modalImageEndpoint,
        modalImageEditEndpoint,
      } = apiKeysData;
      if (imageProvider || llmProvider || ttsProvider || musicProvider || videoProvider) {
        setApiConfig({
          imageProvider,
          llmProvider,
          ttsProvider,
          musicProvider,
          videoProvider,
          modalEndpoints: {
            imageEndpoint: modalImageEndpoint,
            imageEditEndpoint: modalImageEditEndpoint,
          },
        });
      }
    }
  }, [apiKeysData, setApiConfig]);

  const imageProvider: ImageProvider = apiConfig.imageProvider || apiKeysImageProvider || 'gemini';

  // Modal state
  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);
  const [userApiKeys, setUserApiKeys] = useState<UserApiKeys | null>(null);

  // OpenRouter modal state for scene text generation
  const [isOpenRouterModalOpen, setIsOpenRouterModalOpen] = useState(false);
  const [isSavingOpenRouterKey, setIsSavingOpenRouterKey] = useState(false);
  const [pendingSceneTextGeneration, setPendingSceneTextGeneration] = useState(false);
  const [sceneTextCreditsNeeded, setSceneTextCreditsNeeded] = useState(0);

  // Use scene generator hook
  const {
    project,
    scenes,
    characters,
    projectSettings,
    scenesWithImages,
    imageResolution,
    isAddingScene,
    setIsAddingScene,
    editingScene,
    expandedScenes,
    previewImage,
    setPreviewImage,
    showPromptsDialog,
    setShowPromptsDialog,
    sceneAspectRatio,
    setSceneAspectRatio,
    isGeneratingScenes,
    generatingImageForScene,
    isGeneratingAllImages,
    selectedScenes,
    toggleSceneSelection,
    clearSelection,
    selectAllWithImages,
    selectAll,
    handleRegenerateSelected,
    editSceneData,
    setEditSceneData,
    toggleExpanded,
    handleAddScene,
    regeneratePrompts,
    startEditScene,
    saveEditScene,
    cancelEditScene,
    handleGenerateAllScenes,
    handleGenerateSceneImage,
    handleGenerateAllSceneImages,
    handleStopImageGeneration,
    handleRegenerateAllImages,
    handleStartBackgroundGeneration,
    handleGenerateBatch,
    handleCancelSceneGeneration,
    backgroundJobId,
    backgroundJobProgress,
    isBackgroundJobRunning,
    sceneJobProgress,
    sceneJobStatus,
    isSceneJobRunning,
    deleteScene,
    updateSettings,
  } = useSceneGenerator(initialProject);

  // Collaboration hooks
  const {
    pendingImageRegenSceneIds,
    pendingDeletionSceneIds,
    approvedRegenBySceneId,
    handleUseRegenerationAttempt,
    handleSelectRegeneration,
    handleToggleLock,
    fetchRegenerationRequests,
    fetchDeletionRequests,
  } = useStep3Collaboration(project.id, scenes);

  // Pagination hook
  const { currentPage, setCurrentPage, totalPages, startIndex, endIndex, paginatedScenes } =
    useStep3Pagination(scenes);

  // Fetch user's API keys for KIE modal
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!session) return;
      try {
        const res = await fetch('/api/user/api-keys');
        if (res.ok) {
          const data = await res.json();
          setUserApiKeys({
            hasKieKey: data.hasKieKey || false,
            kieImageModel: data.kieImageModel || 'seedream/4-5-text-to-image',
          });
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      }
    };
    fetchApiKeys();
  }, [session]);

  // Wrapper for image generation with credit check
  const handleGenerateSceneImageWithCreditCheck = useCallback(async (scene: Scene) => {
    const hasKieApiKey = userApiKeys?.hasKieKey || project.modelConfig?.image?.provider === 'kie';
    if (hasKieApiKey) {
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
      setIsKieModalOpen(true);
    }
  }, [creditsData, imageResolution, userApiKeys, project.modelConfig, handleGenerateSceneImage]);

  // Wrapper for "Generate All" with credit check
  const handleGenerateAllWithCreditCheck = useCallback(async () => {
    const scenesNeedingImages = scenes.filter(s => !s.imageUrl);
    if (scenesNeedingImages.length === 0) return;
    const hasKieApiKey = userApiKeys?.hasKieKey || project.modelConfig?.image?.provider === 'kie';
    if (hasKieApiKey) {
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
      setIsKieModalOpen(true);
    }
  }, [creditsData, imageResolution, scenes, userApiKeys, project.modelConfig, handleGenerateAllSceneImages]);

  // Wrapper for scene text generation with credit check
  const handleGenerateAllScenesWithCreditCheck = useCallback(async () => {
    // Only bypass credit check if user actually has an OpenRouter API key stored
    const hasOpenRouterKey = apiKeysData?.hasOpenRouterKey;
    if (hasOpenRouterKey) {
      await handleGenerateAllScenes(true);
      return;
    }

    // Check credits first BEFORE any other logic
    const sceneCount = projectSettings.sceneCount || 12;
    const creditsNeeded = ACTION_COSTS.scene.claude * sceneCount;
    const currentCredits = creditsData?.credits.balance || 0;
    const hasCredits = currentCredits >= creditsNeeded;
    setSceneTextCreditsNeeded(creditsNeeded);

    if (!hasCredits) {
      // Show modal and STOP - don't proceed to generation
      setPendingSceneTextGeneration(true);
      setIsOpenRouterModalOpen(true);
      return;
    }

    // Only proceed if we have credits
    await handleGenerateAllScenes(false);
  }, [creditsData, projectSettings.sceneCount, apiKeysData, handleGenerateAllScenes]);

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
      updateUserConstants({ characterImageProvider: 'kie' });
      toast.success(t('keySaved.kie'), { description: t('generating.sceneImages') });
      setIsKieModalOpen(false);
    } catch (error) {
      toast.error(t('saveFailed'), { description: error instanceof Error ? error.message : tCommon('unknownError') });
      throw error;
    } finally {
      setIsSavingKieKey(false);
    }
  }, [t, tCommon, updateUserConstants]);

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
      setIsInsufficientCreditsModalOpen(false);
      await handleGenerateAllScenes(true);
      setPendingSceneTextGeneration(false);
    } catch (error) {
      toast.error(t('saveFailed'), { description: error instanceof Error ? error.message : tCommon('unknownError') });
      throw error;
    } finally {
      setIsSavingOpenRouterKey(false);
    }
  }, [handleGenerateAllScenes, t, tCommon]);

  // Use Inngest for Modal providers (long-running), direct calls for Gemini (fast)
  const useInngest = imageProvider === 'modal' || imageProvider === 'modal-edit';
  const isGenerating = useInngest ? isBackgroundJobRunning : isGeneratingAllImages;

  // Wrap to prevent click event from being passed as argument
  const handleGenerateImages = useInngest
    ? () => handleStartBackgroundGeneration()
    : handleGenerateAllWithCreditCheck;

  return (
    <div className="max-w-[1920px] mx-auto space-y-6 px-4">
      <Step3Content
        // Project data
        projectId={project.id}
        scenes={scenes}
        characters={characters}
        projectSettings={projectSettings}
        imageResolution={imageResolution}
        sceneAspectRatio={sceneAspectRatio}
        imageProvider={imageProvider}
        // Generation state
        isGeneratingScenes={isGeneratingScenes}
        generatingImageForScene={generatingImageForScene}
        isGeneratingAllImages={isGeneratingAllImages}
        sceneJobProgress={sceneJobProgress}
        sceneJobStatus={sceneJobStatus}
        isSceneJobRunning={isSceneJobRunning}
        backgroundJobProgress={backgroundJobProgress}
        isBackgroundJobRunning={isBackgroundJobRunning}
        isGenerating={isGenerating}
        useInngest={useInngest}
        // UI State
        isAddingScene={isAddingScene}
        setIsAddingScene={setIsAddingScene}
        editingScene={editingScene}
        editSceneData={editSceneData}
        setEditSceneData={setEditSceneData}
        expandedScenes={expandedScenes}
        previewImage={previewImage}
        setPreviewImage={setPreviewImage}
        showPromptsDialog={showPromptsDialog}
        setShowPromptsDialog={setShowPromptsDialog}
        sceneJobId={backgroundJobId}
        // Selection state
        selectedScenes={selectedScenes}
        toggleSceneSelection={toggleSceneSelection}
        clearSelection={clearSelection}
        selectAll={selectAll}
        selectAllWithImages={selectAllWithImages}
        handleRegenerateSelected={handleRegenerateSelected}
        // Pagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        paginatedScenes={paginatedScenes}
        // Actions
        toggleExpanded={toggleExpanded}
        handleAddScene={handleAddScene}
        saveEditScene={saveEditScene}
        cancelEditScene={cancelEditScene}
        handleGenerateAllScenesWithCreditCheck={handleGenerateAllScenesWithCreditCheck}
        handleGenerateImages={handleGenerateImages}
        handleGenerateBatch={useInngest ? handleGenerateBatch : undefined}
        handleStopImageGeneration={handleStopImageGeneration}
        handleGenerateSceneImageWithCreditCheck={handleGenerateSceneImageWithCreditCheck}
        regeneratePrompts={regeneratePrompts}
        handleCancelSceneGeneration={handleCancelSceneGeneration}
        deleteScene={deleteScene}
        startEditScene={startEditScene}
        // Collaboration
        pendingImageRegenSceneIds={pendingImageRegenSceneIds}
        pendingDeletionSceneIds={pendingDeletionSceneIds}
        approvedRegenBySceneId={approvedRegenBySceneId}
        canDeleteDirectly={canDeleteDirectly}
        isAdmin={isAdmin}
        fetchRegenerationRequests={fetchRegenerationRequests}
        fetchDeletionRequests={fetchDeletionRequests}
        handleUseRegenerationAttempt={handleUseRegenerationAttempt}
        handleSelectRegeneration={handleSelectRegeneration}
        handleToggleLock={handleToggleLock}
        // API Keys & Credits
        isKieModalOpen={isKieModalOpen}
        setIsKieModalOpen={setIsKieModalOpen}
        isSavingKieKey={isSavingKieKey}
        handleSaveKieApiKey={handleSaveKieApiKey}
        isOpenRouterModalOpen={isOpenRouterModalOpen}
        setIsOpenRouterModalOpen={setIsOpenRouterModalOpen}
        isSavingOpenRouterKey={isSavingOpenRouterKey}
        pendingSceneTextGeneration={pendingSceneTextGeneration}
        sceneTextCreditsNeeded={sceneTextCreditsNeeded}
        handleSaveOpenRouterKey={handleSaveOpenRouterKey}
        creditsData={creditsData}
        // Permissions
        isReadOnly={isReadOnly}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
