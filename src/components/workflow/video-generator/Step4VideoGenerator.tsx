'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Project } from '@/types/project';
import type { RegenerationRequest, DeletionRequest, ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { useVideoGenerator } from './hooks/useVideoGenerator';
import {
  VideoHeader,
  VideoQuickActions,
  SceneVideoCard,
  Pagination,
  NoImagesWarning,
} from './components';
import { RequestRegenerationDialog } from '@/components/collaboration/RequestRegenerationDialog';

interface Step4Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export function Step4VideoGenerator({ project: initialProject, permissions, userRole, isReadOnly = false, isAuthenticated = false }: Step4Props) {
  const t = useTranslations();

  const {
    // Project data
    project,
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
    videoMode,
    setVideoMode,

    // Helpers
    getSceneStatus,
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
  } = useVideoGenerator(initialProject);

  // Determine if user can delete directly (admin) or must request (collaborator)
  const canDeleteDirectly = permissions?.canDelete ?? true;

  // Regeneration requests state
  const [regenerationRequests, setRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [approvedRegenerationRequests, setApprovedRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [showRequestRegenDialog, setShowRequestRegenDialog] = useState(false);

  // Deletion requests state
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);

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

  // Get selected scenes data for the dialog
  const selectedScenesData = useMemo(() => {
    return project.scenes
      .filter(s => selectedScenes.has(s.id))
      .map(s => ({
        id: s.id,
        title: s.title,
        number: s.number,
        imageUrl: s.imageUrl,
      }));
  }, [project.scenes, selectedScenes]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 px-4">
      {/* Header & Progress */}
      <VideoHeader
        totalScenes={project.scenes.length}
        scenesWithVideos={scenesWithVideos.length}
      />

      {/* Quick Actions - only for editors */}
      {!isReadOnly && (
        <VideoQuickActions
          videoMode={videoMode}
          onVideoModeChange={setVideoMode}
          scenesWithImages={scenesWithImages.length}
          scenesWithVideos={scenesWithVideos.length}
          scenesNeedingGeneration={scenesNeedingGeneration.length}
          isGeneratingAll={isGeneratingAll}
          onGenerateAll={handleGenerateAll}
          onStopGeneration={handleStopGeneration}
          selectedCount={selectedScenes.size}
          onSelectAll={selectAll}
          onSelectAllWithVideos={selectAllWithVideos}
          onSelectAllWithoutVideos={selectAllWithoutVideos}
          onClearSelection={clearSelection}
          onGenerateSelected={handleGenerateSelected}
          onRequestRegeneration={selectedScenes.size > 0 ? () => setShowRequestRegenDialog(true) : undefined}
        />
      )}

      {/* Warning if no images */}
      {scenesWithImages.length === 0 && <NoImagesWarning />}

      {/* Pagination Controls - Top */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={project.scenes.length}
        onPageChange={setCurrentPage}
        variant="full"
      />

      {/* Scenes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {paginatedScenes.map((scene, index) => {
          const status = getSceneStatus(scene.id);
          const progress = videoStates[scene.id]?.progress || 0;
          const actualIndex = startIndex + index;
          const cachedVideoUrl = scene.videoUrl
            ? videoBlobCache.current.get(scene.videoUrl) || scene.videoUrl
            : undefined;

          // Find the index of this scene among scenes that have videos (for auth restriction)
          const scenesWithVideosSorted = project.scenes
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
              onGenerateVideo={() => handleGenerateVideo(scene)}
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
        totalItems={project.scenes.length}
        onPageChange={setCurrentPage}
        variant="compact"
      />

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
    </div>
  );
}
