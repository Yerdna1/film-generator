'use client';

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Image, Copy } from 'lucide-react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useApiKeys, useCredits } from '@/hooks';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { Scene, ImageProvider } from '@/types/project';
import { DEFAULT_MODELS } from '@/lib/constants/default-models';
import {
  useSceneGenerator,
  useStep3Collaboration,
  useStep3Pagination,
  useSceneGeneratorModals,
  useSceneGeneratorCredits,
  useSceneGeneratorSelection,
  createSelectionQuickActionsProps,
} from './hooks';
import { Step3Content, SceneGeneratorDialogs } from './components';
import { StepActionBar } from '../shared/StepActionBar';
import { SelectionQuickActions } from '@/components/shared/SelectionQuickActions';
import type { Step3Props } from './types';

export function Step3SceneGenerator({
  project: initialProject,
  permissions,
  userRole,
  isReadOnly = false,
  isAuthenticated = false,
}: Step3Props) {
  const tRoot = useTranslations();
  const { apiConfig, setApiConfig } = useProjectStore();

  // Determine permissions
  const canDeleteDirectly = permissions?.canDelete ?? true;
  const isAdmin = permissions?.canApproveRequests ?? true;

  // Use SWR hooks for API keys and credits
  const {
    imageProvider: apiKeysImageProvider,
    llmProvider: apiKeysLlmProvider,
    openRouterModel: apiKeysOpenRouterModel,
    kieLlmModel: apiKeysKieLlmModel,
    data: apiKeysData
  } = useApiKeys();
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

  // Use image provider and model from user's API keys settings
  const imageProvider: ImageProvider = (apiKeysImageProvider || 'kie') as ImageProvider;
  const imageModel = apiKeysData?.kieImageModel || DEFAULT_MODELS.kieImageModel;

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

  // Modal state management
  const {
    isKieModalOpen,
    setIsKieModalOpen,
    isSavingKieKey,
    userApiKeys,
    handleSaveKieApiKey,
    isOpenRouterModalOpen,
    setIsOpenRouterModalOpen,
    isSavingOpenRouterKey,
    pendingSceneTextGeneration,
    setPendingSceneTextGeneration,
    sceneTextCreditsNeeded,
    setSceneTextCreditsNeeded,
    handleSaveOpenRouterKey,
    showGenerateDialog,
    setShowGenerateDialog,
    isConfirmGenerating,
    setIsConfirmGenerating,
    showGenerateImagesDialog,
    setShowGenerateImagesDialog,
    showRequestRegenDialog,
    setShowRequestRegenDialog,
  } = useSceneGeneratorModals({
    onUpdateUserConstants: updateSettings,
    onGenerateAllScenes: handleGenerateAllScenes,
  });

  // Credit checking hooks
  const {
    handleGenerateSceneImageWithCreditCheck,
    handleGenerateAllWithCreditCheck,
    handleGenerateAllScenesWithCreditCheck,
  } = useSceneGeneratorCredits({
    creditsData,
    imageResolution,
    userApiKeys,
    apiKeysData,
    projectSettings,
    scenes,
    handleGenerateSceneImage,
    handleGenerateAllSceneImages,
    onOpenKieModal: () => setIsKieModalOpen(true),
  });

  // Selection management
  const { selectionOptions, getSelectedScenesData } = useSceneGeneratorSelection({
    scenes,
    scenesWithImages,
    imageResolution,
    selectedScenes,
    isGenerating: isBackgroundJobRunning || isGeneratingAllImages,
    selectAll,
    selectAllWithImages,
    handleRegenerateSelected,
    clearSelection,
  });

  // Use Inngest for Modal providers (long-running), direct calls for Gemini (fast)
  const useInngest = imageProvider === 'modal' || imageProvider === 'modal-edit';
  const isGenerating = useInngest ? isBackgroundJobRunning : isGeneratingAllImages;

  // Wrapper for scene text generation with credit check
  const onGenerateScenesClick = useCallback(async () => {
    // Wait for API keys data to load before showing dialog
    if (!apiKeysData) {
      console.warn('[Step3] API keys data not loaded yet, waiting...');
      return;
    }

    // Show confirmation dialog for ALL users
    setShowGenerateDialog(true);
  }, [apiKeysData, setShowGenerateDialog]);

  // Confirm and execute scene generation after dialog
  const handleConfirmGenerateScenes = useCallback(async () => {
    console.log('[Step3] handleConfirmGenerateScenes called');
    setShowGenerateDialog(false);
    setIsConfirmGenerating(true);

    // Bypass credit check if user has ANY LLM provider configured
    const hasOpenRouterKey = apiKeysData?.hasOpenRouterKey;
    const hasClaudeKey = apiKeysData?.hasClaudeKey;
    const hasModalLlm = apiKeysData?.modalLlmEndpoint;
    const hasKieKey = apiKeysData?.hasKieKey;

    console.log('[Step3] LLM provider check:', {
      hasOpenRouterKey,
      hasClaudeKey,
      hasModalLlm,
      hasKieKey,
      llmProvider: apiKeysLlmProvider,
      kieLlmModel: apiKeysKieLlmModel
    });

    if (hasOpenRouterKey || hasClaudeKey || hasModalLlm || (hasKieKey && apiKeysLlmProvider === 'kie')) {
      console.log('[Step3] User has LLM key, skipping credit check');
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
  }, [apiKeysData, projectSettings.sceneCount, creditsData, handleGenerateAllScenes, setShowGenerateDialog, setIsConfirmGenerating, setSceneTextCreditsNeeded, setPendingSceneTextGeneration, setIsOpenRouterModalOpen, apiKeysLlmProvider, apiKeysKieLlmModel]);

  // Wrap to prevent click event from being passed as argument
  const doGenerateImages: () => Promise<void> = useInngest
    ? () => {
      console.log('[Step3] Starting background image generation via Inngest');
      setShowGenerateImagesDialog(false);
      return handleStartBackgroundGeneration();
    }
    : () => {
      console.log('[Step3] Starting direct image generation');
      setShowGenerateImagesDialog(false);
      return handleGenerateAllWithCreditCheck();
    };

  // Show confirmation dialog before generating images
  const handleGenerateImages = () => {
    setShowGenerateImagesDialog(true);
  };

  // Selection Quick Actions component for the top bar
  const selectionQuickActionsProps = createSelectionQuickActionsProps({
    isGenerating,
    imageResolution,
    selectedScenes,
    selectionOptions,
    handleRegenerateSelected,
    clearSelection,
  });

  const selectionQuickActions = !isReadOnly && scenes.length > 0 ? (
    <SelectionQuickActions
      {...selectionQuickActionsProps}
      onRequestApproval={selectedScenes.size > 0 ? () => setShowRequestRegenDialog(true) : undefined}
      className="py-1 px-2"
    />
  ) : null;

  // Get selected scenes data for the regeneration request dialog
  const selectedScenesData = getSelectedScenesData(scenes, selectedScenes);

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
        handleGenerateAllScenesWithCreditCheck={onGenerateScenesClick}
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

      {/* Dialogs */}
      <SceneGeneratorDialogs
        // Generate Scenes Dialog
        showGenerateDialog={showGenerateDialog}
        setShowGenerateDialog={setShowGenerateDialog}
        onConfirmGenerateScenes={handleConfirmGenerateScenes}
        apiKeysLlmProvider={apiKeysLlmProvider}
        apiKeysOpenRouterModel={apiKeysOpenRouterModel}
        apiKeysKieLlmModel={apiKeysKieLlmModel}
        projectSettings={projectSettings}
        scenes={scenes}
        sceneTextCreditsNeeded={sceneTextCreditsNeeded}
        // Generate Images Dialog
        showGenerateImagesDialog={showGenerateImagesDialog}
        setShowGenerateImagesDialog={setShowGenerateImagesDialog}
        onConfirmGenerateImages={doGenerateImages}
        imageProvider={imageProvider}
        imageModel={imageModel}
        projectSettingsForImages={projectSettings}
        // Request Regeneration Dialog
        showRequestRegenDialog={showRequestRegenDialog}
        setShowRequestRegenDialog={setShowRequestRegenDialog}
        projectId={project.id}
        selectedScenesData={selectedScenesData}
        onClearSelection={clearSelection}
        onFetchRegenerationRequests={fetchRegenerationRequests}
      />
    </div>
  );
}
