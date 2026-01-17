'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { formatCostCompact, getImageCost } from '@/lib/services/real-costs';
import type { Project, ImageProvider } from '@/types/project';
import type { RegenerationRequest, ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { useProjectStore } from '@/lib/stores/project-store';
import { useSceneGenerator } from './hooks';
import {
  SceneCard,
  AddSceneDialog,
  EditSceneDialog,
  ImagePreviewModal,
  PromptsDialog,
  QuickActions,
} from './components';
import { Pagination } from '@/components/workflow/video-generator/components/Pagination';
import { SCENES_PER_PAGE } from '@/lib/constants/workflow';
import { RequestRegenerationDialog } from '@/components/collaboration/RequestRegenerationDialog';
import {
  useApiKeys,
  usePendingRegenerationRequests,
  useApprovedRegenerationRequests,
  usePendingDeletionRequests,
} from '@/hooks';

interface Step3Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export function Step3SceneGenerator({ project: initialProject, permissions, userRole, isReadOnly = false, isAuthenticated = false }: Step3Props) {
  // Determine if user can delete directly (admin) or must request (collaborator)
  const canDeleteDirectly = permissions?.canDelete ?? true;
  // Admin can lock/unlock scenes (owner or has canApproveRequests permission)
  const isAdmin = permissions?.canApproveRequests ?? true;
  const { apiConfig, setApiConfig } = useProjectStore();

  // Use SWR hook for API keys with deduplication (eliminates redundant fetches across components)
  const { imageProvider: apiKeysImageProvider, data: apiKeysData } = useApiKeys();

  // Sync provider settings to store when API keys data is loaded
  useEffect(() => {
    if (apiKeysData) {
      const { imageProvider, llmProvider, ttsProvider, musicProvider, videoProvider, modalImageEndpoint, modalImageEditEndpoint } = apiKeysData;
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

  const {
    // Project data
    project,
    scenes,
    characters,
    projectSettings,
    scenesWithImages,
    imageResolution,

    // UI State
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

    // Generation State
    isGeneratingScenes,
    generatingImageForScene,
    isGeneratingAllImages,

    // Selection State
    selectedScenes,
    toggleSceneSelection,
    clearSelection,
    selectAllWithImages,
    selectAll,
    handleRegenerateSelected,

    // Edit State
    editSceneData,
    setEditSceneData,

    // Actions
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
    // Scene generation job state
    sceneJobProgress,
    sceneJobStatus,
    isSceneJobRunning,
    deleteScene,
    updateSettings,
  } = useSceneGenerator(initialProject);

  // Use Inngest for Modal providers (long-running), direct calls for Gemini (fast)
  const useInngest = imageProvider === 'modal' || imageProvider === 'modal-edit';
  // Wrap to prevent click event from being passed as argument
  const handleGenerateImages = useInngest
    ? () => handleStartBackgroundGeneration()
    : handleGenerateAllSceneImages;
  const isGenerating = useInngest ? isBackgroundJobRunning : isGeneratingAllImages;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(scenes.length / SCENES_PER_PAGE);
  const startIndex = (currentPage - 1) * SCENES_PER_PAGE;
  const endIndex = startIndex + SCENES_PER_PAGE;

  const paginatedScenes = useMemo(() => {
    return scenes.slice(startIndex, endIndex);
  }, [scenes, startIndex, endIndex]);

  // Use SWR hooks for collaboration data with deduplication
  const {
    requests: regenerationRequests,
    refresh: refreshPendingRegenRequests,
  } = usePendingRegenerationRequests(project.id);

  const {
    requests: approvedRegenerationRequests,
    refresh: refreshApprovedRegenRequests,
  } = useApprovedRegenerationRequests(project.id);

  const {
    requests: deletionRequests,
    refresh: refreshDeletionRequests,
  } = usePendingDeletionRequests(project.id);

  const [showRequestRegenDialog, setShowRequestRegenDialog] = useState(false);

  // Combined refresh function for regeneration requests
  const fetchApprovedRegenerationRequests = useCallback(() => {
    refreshApprovedRegenRequests();
  }, [refreshApprovedRegenRequests]);

  // Refresh functions for callbacks
  const fetchDeletionRequests = useCallback(() => {
    refreshDeletionRequests();
  }, [refreshDeletionRequests]);

  const fetchRegenerationRequests = useCallback(() => {
    refreshPendingRegenRequests();
  }, [refreshPendingRegenRequests]);

  // Create a set of scene IDs with pending image regeneration requests
  const pendingImageRegenSceneIds = useMemo(() => {
    return new Set(
      regenerationRequests
        .filter(r => r.targetType === 'image' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [regenerationRequests]);

  // Create a set of scene IDs with pending deletion requests
  const pendingDeletionSceneIds = useMemo(() => {
    return new Set(
      deletionRequests
        .filter(r => r.targetType === 'scene' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [deletionRequests]);

  // Create a map of scene ID to approved regeneration request
  const approvedRegenBySceneId = useMemo(() => {
    const map = new Map<string, RegenerationRequest>();
    for (const req of approvedRegenerationRequests) {
      if (req.targetType === 'image') {
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

  // Handler for toggling scene lock status (admin only)
  const handleToggleLock = useCallback(async (sceneId: string) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/scenes/${sceneId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle lock');
      }

      const data = await response.json();
      // Update local scene state directly (API already updated DB)
      useProjectStore.setState((state) => ({
        projects: state.projects.map((p) =>
          p.id === project.id
            ? {
                ...p,
                scenes: p.scenes.map((s) => (s.id === sceneId ? { ...s, locked: data.locked } : s)),
              }
            : p
        ),
        currentProject:
          state.currentProject?.id === project.id
            ? {
                ...state.currentProject,
                scenes: state.currentProject.scenes.map((s) =>
                  s.id === sceneId ? { ...s, locked: data.locked } : s
                ),
              }
            : state.currentProject,
      }));
    } catch (error) {
      console.error('Failed to toggle scene lock:', error);
      throw error;
    }
  }, [project.id]);

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

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-[1920px] mx-auto space-y-6 px-4">
      {/* Pagination - Top */}
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

      {/* Scenes Grid - 2-3-4-5 columns like Step 4 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {paginatedScenes.map((scene, idx) => {
          // Find the index of this scene among scenes that have images (for auth restriction)
          const scenesWithImagesSorted = scenes
            .filter(s => s.imageUrl)
            .sort((a, b) => (a.number || 0) - (b.number || 0));
          const imageIndex = scenesWithImagesSorted.findIndex(s => s.id === scene.id);
          const isFirstImage = imageIndex === 0;

          return (
            <SceneCard
              key={scene.id}
              scene={scene}
              index={(currentPage - 1) * SCENES_PER_PAGE + idx}
              projectId={project.id}
              isExpanded={expandedScenes.includes(scene.id)}
              isGeneratingImage={generatingImageForScene === scene.id}
              isGeneratingAllImages={isGeneratingAllImages}
              imageResolution={imageResolution}
              characters={characters}
              isSelected={selectedScenes.has(scene.id)}
              hasPendingRegeneration={pendingImageRegenSceneIds.has(scene.id)}
              hasPendingDeletion={pendingDeletionSceneIds.has(scene.id)}
              approvedRegeneration={approvedRegenBySceneId.get(scene.id) || null}
              canDeleteDirectly={canDeleteDirectly}
              isAdmin={isAdmin}
              isReadOnly={isReadOnly}
              isAuthenticated={isAuthenticated}
              isFirstImage={isFirstImage}
              onToggleSelect={() => toggleSceneSelection(scene.id)}
              onToggleExpand={() => toggleExpanded(scene.id)}
              onDelete={() => deleteScene(scene.id)}
              onEdit={() => startEditScene(scene)}
              onGenerateImage={() => handleGenerateSceneImage(scene)}
              onRegeneratePrompts={() => regeneratePrompts(scene)}
              onPreviewImage={setPreviewImage}
              onDeletionRequested={fetchDeletionRequests}
              onUseRegenerationAttempt={handleUseRegenerationAttempt}
              onSelectRegeneration={handleSelectRegeneration}
              onToggleLock={() => handleToggleLock(scene.id)}
            />
          );
        })}
      </div>

      {/* Add Scene Button - only for editors */}
      {!isReadOnly && scenes.length < projectSettings.sceneCount && (
        <AddSceneDialog
          open={isAddingScene}
          onOpenChange={setIsAddingScene}
          characters={characters}
          onAddScene={handleAddScene}
        />
      )}

      {/* Bottom Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={scenes.length}
        onPageChange={setCurrentPage}
        variant="compact"
      />

      {/* Quick Actions - only for editors */}
      {!isReadOnly && (
        <QuickActions
          totalScenes={scenes.length}
          scenesWithImages={scenesWithImages}
          imageResolution={imageResolution}
          isGeneratingAllImages={isGenerating}
          onCopyPrompts={() => setShowPromptsDialog(true)}
          onGenerateAllImages={handleGenerateImages}
          onGenerateBatch={useInngest ? handleGenerateBatch : undefined}
          onStopGeneration={handleStopImageGeneration}
          backgroundJobProgress={useInngest ? backgroundJobProgress : undefined}
          selectedCount={selectedScenes.size}
          onSelectAll={() => selectAll(scenes)}
          onSelectAllWithImages={selectAllWithImages}
          onClearSelection={clearSelection}
          onRegenerateSelected={handleRegenerateSelected}
          onRequestRegeneration={selectedScenes.size > 0 ? () => setShowRequestRegenDialog(true) : undefined}
          projectId={project.id}
        />
      )}

      {/* Edit Scene Dialog */}
      <EditSceneDialog
        open={editingScene !== null}
        editSceneData={editSceneData}
        characters={characters}
        onEditSceneDataChange={setEditSceneData}
        onSave={saveEditScene}
        onCancel={cancelEditScene}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Copy Prompts Dialog */}
      <PromptsDialog
        open={showPromptsDialog}
        onOpenChange={setShowPromptsDialog}
        scenes={scenes}
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
