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
import { Step3Content, GenerateScenesDialog } from './components';
import type { Step3Props, UserApiKeys } from './types';
import { StepActionBar } from '../shared/StepActionBar';
import { SelectionQuickActions } from '@/components/shared/SelectionQuickActions';
import { RequestRegenerationDialog } from '@/components/collaboration/RequestRegenerationDialog';
import { formatCostCompact } from '@/lib/services/real-costs';
import { Image, Copy, Download, RefreshCw } from 'lucide-react';

export function Step3SceneGenerator({
  project: initialProject,
  permissions,
  userRole,
  isReadOnly = false,
  isAuthenticated = false,
}: Step3Props) {
  const t = useTranslations('api');
  const tCommon = useTranslations('common');
  const tRoot = useTranslations();
  const { apiConfig, setApiConfig, updateUserConstants } = useProjectStore();
  const { data: session } = useSession();

  // Determine permissions
  const canDeleteDirectly = permissions?.canDelete ?? true;
  const isAdmin = permissions?.canApproveRequests ?? true;

  // Use SWR hooks for API keys and credits
  const {
    imageProvider: apiKeysImageProvider,
    llmProvider: apiKeysLlmProvider,
    openRouterModel: apiKeysOpenRouterModel,
    data: apiKeysData
  } = useApiKeys();
  const { data: creditsData } = useCredits();

  // Debug logging
  useEffect(() => {
    console.log('[Step3] API Keys data:', {
      llmProvider: apiKeysLlmProvider,
      openRouterModel: apiKeysOpenRouterModel,
      fullData: apiKeysData,
    });
  }, [apiKeysLlmProvider, apiKeysOpenRouterModel, apiKeysData]);

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

  // Generate scenes confirmation dialog state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [isConfirmGenerating, setIsConfirmGenerating] = useState(false);
  const [showRequestRegenDialog, setShowRequestRegenDialog] = useState(false);

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
    setShowGenerateDialog(true);
    return;

    // Note: The actual generation happens after dialog confirmation in handleConfirmGenerateScenes
  }, [apiKeysData]);

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
      await handleGenerateAllScenes(true);
      setPendingSceneTextGeneration(false);
    } catch (error) {
      toast.error(t('saveFailed'), { description: error instanceof Error ? error.message : tCommon('unknownError') });
      throw error;
    } finally {
      setIsSavingOpenRouterKey(false);
    }
  }, [handleGenerateAllScenes, t, tCommon]);

  // Confirm and execute scene generation after dialog
  const handleConfirmGenerateScenes = useCallback(async () => {
    setShowGenerateDialog(false);
    setIsConfirmGenerating(true);

    // Bypass credit check if user has ANY LLM provider configured
    const hasOpenRouterKey = apiKeysData?.hasOpenRouterKey;
    const hasClaudeKey = apiKeysData?.hasClaudeKey;
    const hasModalLlm = apiKeysData?.modalLlmEndpoint;

    if (hasOpenRouterKey || hasClaudeKey || hasModalLlm) {
      await handleGenerateAllScenes(true);
    } else {
      // Check credits
      const sceneCount = projectSettings.sceneCount || 12;
      const creditsNeeded = ACTION_COSTS.scene.claude * sceneCount;
      const currentCredits = creditsData?.credits.balance || 0;
      const hasCredits = currentCredits >= creditsNeeded;
      setSceneTextCreditsNeeded(creditsNeeded);

      if (!hasCredits) {
        // Show OpenRouter modal
        setPendingSceneTextGeneration(true);
        setIsOpenRouterModalOpen(true);
        setIsConfirmGenerating(false);
        return;
      }

      await handleGenerateAllScenes(false);
    }

    setIsConfirmGenerating(false);
  }, [apiKeysData, projectSettings.sceneCount, creditsData, handleGenerateAllScenes]);

  // Use Inngest for Modal providers (long-running), direct calls for Gemini (fast)
  const useInngest = imageProvider === 'modal' || imageProvider === 'modal-edit';
  const isGenerating = useInngest ? isBackgroundJobRunning : isGeneratingAllImages;

  // Wrap to prevent click event from being passed as argument
  const handleGenerateImages = useInngest
    ? () => {
        console.log('[Step3] Starting background image generation via Inngest');
        return handleStartBackgroundGeneration();
      }
    : () => {
        console.log('[Step3] Starting direct image generation');
        return handleGenerateAllWithCreditCheck();
      };

  // Build selection options for SelectionQuickActions
  const selectionOptions = useMemo(() => {
    const options = [];
    if (selectAll) {
      options.push({
        label: 'Select All',
        count: scenes.length,
        onClick: () => selectAll(scenes),
        variant: 'orange' as const,
      });
    }
    if (scenesWithImages > 0 && selectAllWithImages) {
      options.push({
        label: 'With Images',
        count: scenesWithImages,
        onClick: selectAllWithImages,
        variant: 'emerald' as const,
      });
    }
    const scenesNeedingImages = scenes.length - scenesWithImages;
    if (scenesNeedingImages > 0 && selectAll) {
      options.push({
        label: 'Without Images',
        count: scenesNeedingImages,
        onClick: () => selectAll(scenes.filter(s => !s.imageUrl)),
        variant: 'amber' as const,
      });
    }
    return options;
  }, [scenes.length, scenesWithImages, selectAll, selectAllWithImages, scenes]);

  // Selection Quick Actions component for the top bar
  const costPerImage = getImageCreditCost(imageResolution);
  const selectionQuickActions = !isReadOnly && scenes.length > 0 ? (
    <SelectionQuickActions
      selectedCount={selectedScenes.size}
      isDisabled={isGenerating}
      selectionOptions={selectionOptions}
      onClearSelection={clearSelection}
      primaryAction={{
        label: 'Regenerate Selected',
        onClick: handleRegenerateSelected,
        costPerItem: costPerImage,
        icon: <RefreshCw className="w-4 h-4 mr-2" />,
        confirmThreshold: 5,
        confirmTitle: `Regenerate ${selectedScenes.size} images?`,
        confirmDescription: `You are about to regenerate ${selectedScenes.size} selected images. This will cost approximately ${formatCostCompact(costPerImage * selectedScenes.size)}. Are you sure you want to continue?`,
      }}
      onRequestApproval={selectedScenes.size > 0 ? () => setShowRequestRegenDialog(true) : undefined}
      className="py-1 px-2"
    />
  ) : null;

  // Get selected scenes data for the regeneration request dialog
  const selectedScenesData = useMemo(() => {
    return scenes
      .filter(s => selectedScenes.has(s.id))
      .map(s => ({
        id: s.id,
        title: s.title,
        number: s.number,
        imageUrl: s.imageUrl,
      }));
  }, [scenes, selectedScenes]);

  return (
    <div className="max-w-[1920px] mx-auto space-y-6 px-4">
      {/* Step Action Bar */}
      {scenes.length > 0 && (
        <StepActionBar
          title={tRoot('steps.scenes.title')}
          icon={Image}
          subtitle={`${scenesWithImages} / ${scenes.length} generated`}
          operation="image"
          showApiKeyButton={true}
          dropdowns={[
            {
              label: 'Tools',
              icon: Copy,
              options: [
                {
                  label: 'Copy Prompts',
                  value: 'copy-prompts',
                  onClick: () => setShowPromptsDialog(true),
                },
              ],
              visible: !isReadOnly,
            },
          ]}
          actions={[
            {
              label: isGenerating ? 'Stop' : 'Generate Images',
              onClick: isGenerating ? handleStopImageGeneration : handleGenerateImages,
              disabled: isReadOnly || scenes.length === 0,
              variant: isGenerating ? 'destructive' : 'primary',
            },
          ]}
          rightContent={selectionQuickActions}
        />
      )}

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

      {/* Generate Scenes Confirmation Dialog */}
      <GenerateScenesDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onConfirm={handleConfirmGenerateScenes}
        sceneCount={projectSettings.sceneCount || 12}
        provider={apiKeysData?.llmProvider}
        model={apiKeysData?.openRouterModel}
        isGenerating={isConfirmGenerating}
        useOwnKey={!!(apiKeysData?.hasOpenRouterKey || apiKeysData?.hasClaudeKey || apiKeysData?.modalLlmEndpoint)}
      />

      {/* Request Regeneration Dialog */}
      <RequestRegenerationDialog
        projectId={project.id}
        targetType="image"
        scenes={selectedScenesData}
        open={showRequestRegenDialog}
        onOpenChange={setShowRequestRegenDialog}
        onRequestSent={() => {
          clearSelection();
          fetchRegenerationRequests();
        }}
      />
    </div>
  );
}
