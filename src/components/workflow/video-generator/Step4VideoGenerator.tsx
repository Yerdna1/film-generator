'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Project } from '@/types/project';
import type { RegenerationRequest, ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { useVideoGenerator } from './hooks/useVideoGenerator';
import {
  VideoHeader,
  VideoSpecsInfo,
  CostSummary,
  VideoQuickActions,
  SceneVideoCard,
  Pagination,
  GrokInstructions,
  NoImagesWarning,
} from './components';
import { RequestRegenerationDialog } from '@/components/collaboration/RequestRegenerationDialog';

interface Step4Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
}

export function Step4VideoGenerator({ project: initialProject, isReadOnly = false }: Step4Props) {
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

  // Regeneration requests state
  const [regenerationRequests, setRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [showRequestRegenDialog, setShowRequestRegenDialog] = useState(false);

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

  useEffect(() => {
    fetchRegenerationRequests();
  }, [fetchRegenerationRequests]);

  // Create a set of scene IDs with pending video regeneration requests
  const pendingVideoRegenSceneIds = useMemo(() => {
    return new Set(
      regenerationRequests
        .filter(r => r.targetType === 'video' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [regenerationRequests]);

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

      {/* Video Specifications Info */}
      <VideoSpecsInfo videoMode={videoMode} />

      {/* Cost Summary */}
      {scenesWithImages.length > 0 && (
        <CostSummary scenesNeedingGeneration={scenesNeedingGeneration.length} />
      )}

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

          return (
            <SceneVideoCard
              key={scene.id}
              scene={scene}
              index={actualIndex}
              status={status}
              progress={progress}
              isPlaying={playingVideo === scene.id}
              cachedVideoUrl={cachedVideoUrl}
              isSelected={selectedScenes.has(scene.id)}
              hasPendingRegeneration={pendingVideoRegenSceneIds.has(scene.id)}
              isReadOnly={isReadOnly}
              onToggleSelect={() => toggleSceneSelection(scene.id)}
              onPlay={() => setPlayingVideo(scene.id)}
              onPause={() => setPlayingVideo(null)}
              onGenerateVideo={() => handleGenerateVideo(scene)}
              buildFullI2VPrompt={buildFullI2VPrompt}
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

      {/* Grok Instructions */}
      <GrokInstructions />

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-orange-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-orange-400">Tip:</strong> {t('steps.videos.tip')}
        </p>
      </div>

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
