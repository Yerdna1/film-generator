'use client';

import { useTranslations } from 'next-intl';
import type { Project } from '@/types/project';
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

interface Step4Props {
  project: Project;
}

export function Step4VideoGenerator({ project: initialProject }: Step4Props) {
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

      {/* Quick Actions */}
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
      />

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
    </div>
  );
}
