'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Project } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { useVideoGenerator } from './hooks/useVideoGenerator';
import { useApiKeys } from '@/hooks';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import {
  VideoHeader,
  Pagination,
  NoImagesWarning,
} from './components';
import { SelectionQuickActions } from '@/components/shared/SelectionQuickActions';
import { RefreshCw, Film } from 'lucide-react';
import { StepActionBar } from '../shared/StepActionBar';
import { PaymentMethodToggle } from '../PaymentMethodToggle';

// Custom hooks
import { useRegenerationRequests } from './hooks/useRegenerationRequests';
import { useCreditCheckVideo } from './hooks/useCreditCheckVideo';

// Sub-components
import { VideoGrid } from './components/VideoGrid';
import { BackgroundGenerationStatus } from './components/BackgroundGenerationStatus';
import { VideoGenerationDialogs } from './components/VideoGenerationDialogs';

interface Step4Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export function Step4VideoGenerator({
  project: initialProject,
  permissions,
  userRole,
  isReadOnly = false,
  isAuthenticated = false,
}: Step4Props) {
  const t = useTranslations();

  // Fetch user's API keys
  const { data: apiKeysData } = useApiKeys();

  const {
    // Project data
    project,
    scenes,
    scenesWithImages,
    scenesWithVideos,
    scenesNeedingGeneration,
    paginatedScenes,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,

    // State
    videoStates,
    playingVideo,
    setPlayingVideo,
    isGeneratingAll,

    // Helpers
    getSceneStatus,
    getCachedVideoUrl,
    buildFullI2VPrompt,
    videoBlobCache,

    // Actions
    handleGenerateVideo,
    handleGenerateAll,
    handleStopGeneration,

    // Selection
    selectedScenes,
    toggleSceneSelection,
    selectAll,
    selectAllWithVideos,
    selectAllWithoutVideos,
    clearSelection,
    handleGenerateSelected,

    // Background generation
    backgroundJobId,
    backgroundJobStatus,
    startBackgroundGeneration,
    cancelBackgroundJob,
  } = useVideoGenerator(initialProject);

  // Determine if user can delete directly (admin) or must request (collaborator)
  const canDeleteDirectly = permissions?.canDelete ?? true;

  // Regeneration/deletion requests hook
  const {
    pendingVideoRegenSceneIds,
    pendingDeletionSceneIds,
    approvedRegenBySceneId,
    showRequestRegenDialog,
    setShowRequestRegenDialog,
    fetchDeletionRequests,
    fetchRegenerationRequests,
    handleUseRegenerationAttempt,
    handleSelectRegeneration,
  } = useRegenerationRequests(project.id);

  // Credit check flow hook
  const {
    isInsufficientCreditsModalOpen,
    isKieModalOpen,
    isSavingKieKey,
    pendingVideoGeneration,
    showConfirmDialog,
    confirmDialogType,
    confirmDialogScene,
    handleGenerateVideoWithCreditCheck,
    handleGenerateAllWithCreditCheck,
    handleGenerateSelectedWithCreditCheck,
    handleConfirmGeneration,
    handleUseAppCredits,
    handleSaveKieApiKey,
    closeInsufficientCreditsModal,
    closeKieModal,
    closeConfirmDialog,
  } = useCreditCheckVideo({
    apiKeysData,
    onGenerateVideo: handleGenerateVideo,
    onGenerateAll: handleGenerateAll,
    onGenerateSelected: handleGenerateSelected,
    scenesNeedingGeneration,
    scenes,
    selectedScenes,
  });

  // Get selected scenes data for the dialog
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

  // Build selection options for SelectionQuickActions
  const selectionOptions = useMemo(() => {
    const options = [];
    if (selectAll) {
      options.push({
        label: 'Select All',
        count: scenesWithImages.length,
        onClick: selectAll,
        variant: 'orange' as const,
      });
    }
    if (scenesWithVideos.length > 0 && selectAllWithVideos) {
      options.push({
        label: 'With Videos',
        count: scenesWithVideos.length,
        onClick: selectAllWithVideos,
        variant: 'emerald' as const,
      });
    }
    if (scenesNeedingGeneration.length > 0 && selectAllWithoutVideos) {
      options.push({
        label: 'Without Videos',
        count: scenesNeedingGeneration.length,
        onClick: selectAllWithoutVideos,
        variant: 'amber' as const,
      });
    }
    return options;
  }, [scenesWithImages.length, scenesWithVideos.length, scenesNeedingGeneration.length, selectAll, selectAllWithVideos, selectAllWithoutVideos]);

  // Selection Quick Actions component for the top bar
  const selectionQuickActions = !isReadOnly && scenesWithImages.length > 0 ? (
    <SelectionQuickActions
      selectedCount={selectedScenes.size}
      isDisabled={isGeneratingAll}
      selectionOptions={selectionOptions}
      onClearSelection={clearSelection}
      primaryAction={{
        label: 'Generate Selected',
        onClick: handleGenerateSelectedWithCreditCheck,
        costPerItem: ACTION_COSTS.video.grok,
        icon: <RefreshCw className="w-4 h-4 mr-2" />,
      }}
      onRequestApproval={selectedScenes.size > 0 ? () => setShowRequestRegenDialog(true) : undefined}
      className="py-1 px-2"
    />
  ) : null;

  return (
    <div className="max-w-[1920px] mx-auto space-y-4 px-4">
      {/* Step Action Bar */}
      <StepActionBar
        title={t('steps.videos.title')}
        icon={Film}
        subtitle={`${scenesWithVideos.length} / ${scenesWithImages.length} videos generated`}
        operation="video"
        showApiKeyButton={true}
        actions={[
          {
            label: isGeneratingAll ? 'Stop' : t('steps.videos.generateAll'),
            onClick: isGeneratingAll ? handleStopGeneration : handleGenerateAllWithCreditCheck,
            disabled: isReadOnly || scenesWithImages.length === 0 || isGeneratingAll,
            variant: isGeneratingAll ? 'destructive' : 'primary',
          },
        ]}
        rightContent={selectionQuickActions}
      />

      {/* Warning if no images */}
      {scenesWithImages.length === 0 && <NoImagesWarning />}

      {/* Pagination Controls - Top */}
      {scenes.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={scenes.length}
          onPageChange={setCurrentPage}
          variant="full"
        />
      )}

      {/* Scenes Grid */}
      <VideoGrid
        project={project}
        scenes={scenes}
        paginatedScenes={paginatedScenes}
        startIndex={startIndex}
        selectedScenes={selectedScenes}
        playingVideo={playingVideo}
        pendingVideoRegenSceneIds={pendingVideoRegenSceneIds}
        pendingDeletionSceneIds={pendingDeletionSceneIds}
        approvedRegenBySceneId={approvedRegenBySceneId}
        canDeleteDirectly={canDeleteDirectly}
        isReadOnly={isReadOnly}
        isAuthenticated={isAuthenticated}
        videoStates={videoStates}
        videoBlobCache={videoBlobCache}
        getSceneStatus={getSceneStatus}
        getCachedVideoUrl={getCachedVideoUrl}
        buildFullI2VPrompt={buildFullI2VPrompt}
        onToggleSelect={toggleSceneSelection}
        onPlay={setPlayingVideo}
        onPause={() => setPlayingVideo(null)}
        onGenerateVideo={handleGenerateVideoWithCreditCheck}
        onDeletionRequested={fetchDeletionRequests}
        onUseRegenerationAttempt={handleUseRegenerationAttempt}
        onSelectRegeneration={handleSelectRegeneration}
      />

      {/* Pagination Controls - Bottom */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={scenes.length}
        onPageChange={setCurrentPage}
        variant="compact"
      />

      {/* Payment Method Toggle */}
      {!isReadOnly && (
        <PaymentMethodToggle
          operation="video"
          className="mb-2"
        />
      )}

      {/* Progress Overview */}
      <VideoHeader
        totalScenes={scenes.length}
        scenesWithVideos={scenesWithVideos.length}
      />

      {/* Background Generation Status - only for editors */}
      {!isReadOnly && (
        <BackgroundGenerationStatus
          backgroundJobId={backgroundJobId}
          backgroundJobStatus={backgroundJobStatus}
          onCancelJob={cancelBackgroundJob}
        />
      )}

      {/* Dialogs */}
      <VideoGenerationDialogs
        project={project}
        apiKeysData={apiKeysData}
        selectedScenes={selectedScenes}
        scenesNeedingGeneration={scenesNeedingGeneration}
        isInsufficientCreditsModalOpen={isInsufficientCreditsModalOpen}
        isKieModalOpen={isKieModalOpen}
        isSavingKieKey={isSavingKieKey}
        showConfirmDialog={showConfirmDialog}
        confirmDialogType={confirmDialogType}
        confirmDialogScene={confirmDialogScene}
        pendingVideoGeneration={pendingVideoGeneration}
        showRequestRegenDialog={showRequestRegenDialog}
        selectedScenesData={selectedScenesData}
        onCloseInsufficientCredits={closeInsufficientCreditsModal}
        onCloseKieModal={closeKieModal}
        onCloseConfirmDialog={closeConfirmDialog}
        onConfirmGeneration={handleConfirmGeneration}
        onUseAppCredits={handleUseAppCredits}
        onSaveKieApiKey={handleSaveKieApiKey}
        onRequestSent={() => {
          clearSelection();
          fetchRegenerationRequests();
        }}
        onOpenChangeRequestDialog={setShowRequestRegenDialog}
      />
    </div>
  );
}
