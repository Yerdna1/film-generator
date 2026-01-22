'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { Project } from '@/types/project';
import type { RegenerationRequest, DeletionRequest, ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { useVideoGenerator } from './hooks/useVideoGenerator';
import { useCredits, useApiKeys } from '@/hooks';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';
import {
  VideoHeader,
  SceneVideoCard,
  Pagination,
  NoImagesWarning,
  KieVideoModal,
} from './components';
import { SelectionQuickActions } from '@/components/shared/SelectionQuickActions';
import { RefreshCw, Cloud, X, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestRegenerationDialog } from '@/components/collaboration/RequestRegenerationDialog';
import { InsufficientCreditsModal } from '@/components/workflow/character-generator/components/InsufficientCreditsModal';
import { PaymentMethodToggle } from '../PaymentMethodToggle';
import { StepActionBar } from '../shared/StepActionBar';
import { UnifiedGenerateConfirmationDialog } from '../shared/UnifiedGenerateConfirmationDialog';
import { Film } from 'lucide-react';

interface Step4Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export function Step4VideoGenerator({ project: initialProject, permissions, userRole, isReadOnly = false, isAuthenticated = false }: Step4Props) {
  const t = useTranslations();
  const { data: session } = useSession();

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

  // Regeneration requests state
  const [regenerationRequests, setRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [approvedRegenerationRequests, setApprovedRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [showRequestRegenDialog, setShowRequestRegenDialog] = useState(false);

  // Deletion requests state
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);

  // Credits for free users
  const creditsData = useCredits();

  // KIE AI modal state for video generation
  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);

  // Insufficient credits modal state
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);

  // Pending video generation (for credit check flow)
  const [pendingVideoGeneration, setPendingVideoGeneration] = useState<{
    type: 'single' | 'all' | 'selected';
    scene?: any;
    scenes?: any[];
  } | null>(null);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'single' | 'all' | 'selected'>('all');
  const [confirmDialogScene, setConfirmDialogScene] = useState<any>(null);

  // Fetch regeneration requests for this project
  const fetchRegenerationRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/regeneration-requests?status=pending`);
      if (response.ok) {
        const data = await response.json();
        setRegenerationRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch regeneration requests:', error);
    }
  }, [project.id]);

  // Fetch approved/active regeneration requests for collaborators
  const fetchApprovedRegenerationRequests = useCallback(async () => {
    try {
      // Fetch requests in 'approved', 'generating', 'selecting', or 'awaiting_final' status
      const response = await fetch(`/api/projects/${project.id}/regeneration-requests?status=approved,generating,selecting,awaiting_final`);
      if (response.ok) {
        const data = await response.json();
        setApprovedRegenerationRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch approved regeneration requests:', error);
    }
  }, [project.id]);

  // Fetch deletion requests for this project
  const fetchDeletionRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/deletion-requests?status=pending`);
      if (response.ok) {
        const data = await response.json();
        setDeletionRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch deletion requests:', error);
    }
  }, [project.id]);

  useEffect(() => {
    fetchRegenerationRequests();
    fetchApprovedRegenerationRequests();
    fetchDeletionRequests();
  }, [fetchRegenerationRequests, fetchApprovedRegenerationRequests, fetchDeletionRequests]);

  // Create a set of scene IDs with pending video regeneration requests
  const pendingVideoRegenSceneIds = useMemo(() => {
    return new Set(
      regenerationRequests
        .filter(r => r.targetType === 'video' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [regenerationRequests]);

  // Create a set of scene IDs with pending deletion requests
  const pendingDeletionSceneIds = useMemo(() => {
    return new Set(
      deletionRequests
        .filter(r => r.targetType === 'video' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [deletionRequests]);

  // Create a map of scene ID to approved regeneration request
  const approvedRegenBySceneId = useMemo(() => {
    const map = new Map<string, RegenerationRequest>();
    for (const req of approvedRegenerationRequests) {
      if (req.targetType === 'video') {
        map.set(req.targetId, req);
      }
    }
    return map;
  }, [approvedRegenerationRequests]);

  // Handler for using a regeneration attempt
  const handleUseRegenerationAttempt = useCallback(async (requestId: string) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/regeneration-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to regenerate');
      }

      // Refresh approved requests to get updated status
      await fetchApprovedRegenerationRequests();
    } catch (error) {
      console.error('Failed to use regeneration attempt:', error);
      throw error; // Re-throw so modal can show error
    }
  }, [project.id, fetchApprovedRegenerationRequests]);

  // Handler for selecting the best regeneration
  const handleSelectRegeneration = useCallback(async (requestId: string, selectedUrl: string) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/regeneration-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', selectedUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit selection');
      }

      // Refresh approved requests
      await fetchApprovedRegenerationRequests();
    } catch (error) {
      console.error('Failed to select regeneration:', error);
      throw error;
    }
  }, [project.id, fetchApprovedRegenerationRequests]);

  // Credit check wrapper for single video generation
  const handleGenerateVideoWithCreditCheck = useCallback(async (scene: any) => {
    // Show confirmation dialog
    setConfirmDialogType('single');
    setConfirmDialogScene(scene);
    setShowConfirmDialog(true);
  }, []);

  // Credit check wrapper for all videos generation
  const handleGenerateAllWithCreditCheck = useCallback(async () => {
    // Show confirmation dialog
    setConfirmDialogType('all');
    setConfirmDialogScene(null);
    setShowConfirmDialog(true);
  }, []);

  // Credit check wrapper for selected videos generation
  const handleGenerateSelectedWithCreditCheck = useCallback(async () => {
    // Show confirmation dialog
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
        await handleGenerateVideo(confirmDialogScene);
      } else {
        // Check credits
        setPendingVideoGeneration({ type: 'single', scene: confirmDialogScene });
        setIsInsufficientCreditsModalOpen(true);
      }
    } else if (confirmDialogType === 'all') {
      // If user has own API key, skip credit check
      if (hasOwnKieApiKey || apiKeysData === null) {
        await handleGenerateAll();
      } else {
        // Check credits
        setPendingVideoGeneration({ type: 'all', scenes: scenesNeedingGeneration });
        setIsInsufficientCreditsModalOpen(true);
      }
    } else if (confirmDialogType === 'selected') {
      // If user has own API key, skip credit check
      if (hasOwnKieApiKey || apiKeysData === null) {
        await handleGenerateSelected();
      } else {
        // Check credits
        const selectedScenesArray = scenes.filter(s => selectedScenes.has(s.id));
        setPendingVideoGeneration({ type: 'selected', scenes: selectedScenesArray });
        setIsInsufficientCreditsModalOpen(true);
      }
    }
  }, [confirmDialogType, confirmDialogScene, apiKeysData, handleGenerateVideo, handleGenerateAll, handleGenerateSelected, scenesNeedingGeneration, scenes, selectedScenes]);

  // Proceed with generation using app credits
  const handleUseAppCredits = useCallback(async () => {
    if (!pendingVideoGeneration) return;

    setIsInsufficientCreditsModalOpen(false);

    if (pendingVideoGeneration.type === 'single' && pendingVideoGeneration.scene) {
      await handleGenerateVideo(pendingVideoGeneration.scene);
    } else if (pendingVideoGeneration.type === 'all' && pendingVideoGeneration.scenes) {
      await handleGenerateAll();
    } else if (pendingVideoGeneration.type === 'selected' && pendingVideoGeneration.scenes) {
      await handleGenerateSelected();
    }

    setPendingVideoGeneration(null);
  }, [pendingVideoGeneration, handleGenerateVideo, handleGenerateAll, handleGenerateSelected]);

  // Save KIE AI API key handler
  const handleSaveKieApiKey = async (apiKey: string, model: string): Promise<void> => {
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
          await handleGenerateVideo(pendingVideoGeneration.scene);
        } else if (pendingVideoGeneration.type === 'all' && pendingVideoGeneration.scenes) {
          await handleGenerateAll();
        } else if (pendingVideoGeneration.type === 'selected' && pendingVideoGeneration.scenes) {
          await handleGenerateSelected();
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
  };

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {paginatedScenes.map((scene, index) => {
          const status = getSceneStatus(scene.id);
          const progress = 0; // Progress is now tracked by Inngest jobs
          const actualIndex = startIndex + index;
          const cachedVideoUrl = scene.videoUrl
            ? getCachedVideoUrl(scene.videoUrl)
            : undefined;

          // Find the index of this scene among scenes that have videos (for auth restriction)
          const scenesWithVideosSorted = scenes
            .filter(s => s.videoUrl)
            .sort((a, b) => (a.number || 0) - (b.number || 0));
          const videoIndex = scenesWithVideosSorted.findIndex(s => s.id === scene.id);
          const isFirstVideo = videoIndex === 0;

          return (
            <SceneVideoCard
              key={scene.id}
              scene={scene}
              index={actualIndex}
              projectId={project.id}
              status={status}
              progress={progress}
              isPlaying={playingVideo === scene.id}
              cachedVideoUrl={cachedVideoUrl}
              isSelected={selectedScenes.has(scene.id)}
              hasPendingRegeneration={pendingVideoRegenSceneIds.has(scene.id)}
              hasPendingDeletion={pendingDeletionSceneIds.has(scene.id)}
              approvedRegeneration={approvedRegenBySceneId.get(scene.id) || null}
              canDeleteDirectly={canDeleteDirectly}
              isReadOnly={isReadOnly}
              isAuthenticated={isAuthenticated}
              isFirstVideo={isFirstVideo}
              onToggleSelect={() => toggleSceneSelection(scene.id)}
              onPlay={() => setPlayingVideo(scene.id)}
              onPause={() => setPlayingVideo(null)}
              onGenerateVideo={() => handleGenerateVideoWithCreditCheck(scene)}
              buildFullI2VPrompt={buildFullI2VPrompt}
              onDeletionRequested={fetchDeletionRequests}
              onUseRegenerationAttempt={handleUseRegenerationAttempt}
              onSelectRegeneration={handleSelectRegeneration}
            />
          );
        })}
      </div>

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
      {!isReadOnly && backgroundJobId && backgroundJobStatus && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">
                Background Generation: {backgroundJobStatus.completedVideos}/{backgroundJobStatus.totalVideos} videos
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelBackgroundJob}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${backgroundJobStatus.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Status: {backgroundJobStatus.status}</span>
            {backgroundJobStatus.failedVideos > 0 && (
              <span className="text-red-400">{backgroundJobStatus.failedVideos} failed</span>
            )}
          </div>
        </div>
      )}

      {/* Request Regeneration Dialog */}
      <RequestRegenerationDialog
        projectId={project.id}
        targetType="video"
        scenes={selectedScenesData}
        open={showRequestRegenDialog}
        onOpenChange={setShowRequestRegenDialog}
        onRequestSent={() => {
          clearSelection();
          fetchRegenerationRequests();
        }}
      />

      {/* Insufficient Credits Modal for video generation */}
      <InsufficientCreditsModal
        isOpen={isInsufficientCreditsModalOpen}
        onClose={() => setIsInsufficientCreditsModalOpen(false)}
        onOpenKieModal={() => {
          setIsInsufficientCreditsModalOpen(false);
          setIsKieModalOpen(true);
        }}
        onUseAppCredits={handleUseAppCredits}
        creditsNeeded={ACTION_COSTS.video.grok * (pendingVideoGeneration?.scenes?.length || 1)}
        currentCredits={undefined}
        generationType="video"
      />

      {/* KIE AI API Key Modal for video generation */}
      <KieVideoModal
        isOpen={isKieModalOpen}
        onClose={() => setIsKieModalOpen(false)}
        onSave={handleSaveKieApiKey}
        isLoading={isSavingKieKey}
      />

      {/* Generate Videos Confirmation Dialog */}
      <UnifiedGenerateConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmGeneration}
        operation="video"
        provider={project.modelConfig?.video?.provider || apiKeysData?.videoProvider || 'kie'}
        model={project.modelConfig?.video?.model || apiKeysData?.kieVideoModel || 'default'}
        title={
          confirmDialogType === 'single'
            ? 'Generate Video'
            : confirmDialogType === 'selected'
            ? 'Generate Selected Videos'
            : 'Generate All Videos'
        }
        description={
          confirmDialogType === 'single' && confirmDialogScene
            ? `This will generate a video for "${confirmDialogScene.title}" using ${project.modelConfig?.video?.provider || apiKeysData?.videoProvider || 'KIE'}.`
            : confirmDialogType === 'selected'
            ? `This will generate videos for ${selectedScenes.size} selected scenes using ${project.modelConfig?.video?.provider || apiKeysData?.videoProvider || 'KIE'}.`
            : `This will generate videos for ${scenesNeedingGeneration.length} scenes using ${project.modelConfig?.video?.provider || apiKeysData?.videoProvider || 'KIE'}.`
        }
        details={[
          confirmDialogType === 'single' && confirmDialogScene
            ? { label: 'Scene', value: confirmDialogScene.title, icon: Video }
            : confirmDialogType === 'selected'
            ? { label: 'Selected Scenes', value: selectedScenes.size, icon: Video }
            : { label: 'Scenes to Generate', value: scenesNeedingGeneration.length, icon: Video },
          { label: 'Resolution', value: '1024x576 (16:9)', icon: Video },
          { label: 'Duration', value: '~2 seconds', icon: Video },
        ]}
        estimatedCost={
          confirmDialogType === 'single'
            ? ACTION_COSTS.video.grok
            : confirmDialogType === 'selected'
            ? ACTION_COSTS.video.grok * selectedScenes.size
            : ACTION_COSTS.video.grok * scenesNeedingGeneration.length
        }
      />
    </div>
  );
}
