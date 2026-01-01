'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { formatCostCompact, getImageCost } from '@/lib/services/real-costs';
import type { Project, ImageProvider } from '@/types/project';
import type { RegenerationRequest, ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { useProjectStore } from '@/lib/stores/project-store';
import { useSceneGenerator } from './hooks/useSceneGenerator';
import {
  SceneHeader,
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

interface Step3Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export function Step3SceneGenerator({ project: initialProject, isReadOnly = false, isAuthenticated = false }: Step3Props) {
  const { apiConfig, setApiConfig } = useProjectStore();
  const imageProvider: ImageProvider = apiConfig.imageProvider || 'gemini';

  // Load provider settings from database on mount (always load to ensure fresh data)
  useEffect(() => {
    const loadProviderSettings = async () => {
      try {
        const response = await fetch('/api/user/api-keys');
        if (response.ok) {
          const data = await response.json();
          // Update store with provider settings from DB
          if (data.imageProvider || data.llmProvider || data.ttsProvider || data.musicProvider || data.videoProvider) {
            setApiConfig({
              imageProvider: data.imageProvider,
              llmProvider: data.llmProvider,
              ttsProvider: data.ttsProvider,
              musicProvider: data.musicProvider,
              videoProvider: data.videoProvider,
              modalEndpoints: {
                imageEndpoint: data.modalImageEndpoint,
                imageEditEndpoint: data.modalImageEditEndpoint,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error loading provider settings:', error);
      }
    };

    loadProviderSettings();
  }, [setApiConfig]);

  const {
    // Project data
    project,
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
    handleSceneCountChange,
    handleGenerateAllScenes,
    handleGenerateSceneImage,
    handleGenerateAllSceneImages,
    handleStopImageGeneration,
    handleRegenerateAllImages,
    handleStartBackgroundGeneration,
    handleGenerateBatch,
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
  const totalPages = Math.ceil(project.scenes.length / SCENES_PER_PAGE);
  const startIndex = (currentPage - 1) * SCENES_PER_PAGE;
  const endIndex = startIndex + SCENES_PER_PAGE;

  const paginatedScenes = useMemo(() => {
    return project.scenes.slice(startIndex, endIndex);
  }, [project.scenes, startIndex, endIndex]);

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

  // Create a set of scene IDs with pending image regeneration requests
  const pendingImageRegenSceneIds = useMemo(() => {
    return new Set(
      regenerationRequests
        .filter(r => r.targetType === 'image' && r.status === 'pending')
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

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 px-4">
      {/* Header & Progress */}
      <SceneHeader
        sceneCount={project.settings.sceneCount}
        totalScenes={project.scenes.length}
        scenesWithImages={scenesWithImages}
        imageResolution={imageResolution}
        aspectRatio={sceneAspectRatio}
        imageProvider={imageProvider}
        hasCharacters={project.characters.length > 0}
        isGeneratingScenes={isGeneratingScenes}
        sceneJobProgress={sceneJobProgress}
        sceneJobStatus={sceneJobStatus}
        isSceneJobRunning={isSceneJobRunning}
        onSceneCountChange={handleSceneCountChange}
        onImageResolutionChange={(value) => updateSettings({ imageResolution: value })}
        onAspectRatioChange={setSceneAspectRatio}
        onGenerateAllScenes={handleGenerateAllScenes}
      />

      {/* Pagination - Top */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={project.scenes.length}
        onPageChange={setCurrentPage}
        variant="full"
      />

      {/* Scenes Grid - 2-3-4-5 columns like Step 4 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {paginatedScenes.map((scene, idx) => {
          // Find the index of this scene among scenes that have images (for auth restriction)
          const scenesWithImagesSorted = project.scenes
            .filter(s => s.imageUrl)
            .sort((a, b) => (a.number || 0) - (b.number || 0));
          const imageIndex = scenesWithImagesSorted.findIndex(s => s.id === scene.id);
          const isFirstImage = imageIndex === 0;

          return (
            <SceneCard
              key={scene.id}
              scene={scene}
              index={(currentPage - 1) * SCENES_PER_PAGE + idx}
              isExpanded={expandedScenes.includes(scene.id)}
              isGeneratingImage={generatingImageForScene === scene.id}
              isGeneratingAllImages={isGeneratingAllImages}
              imageResolution={imageResolution}
              characters={project.characters}
              isSelected={selectedScenes.has(scene.id)}
              hasPendingRegeneration={pendingImageRegenSceneIds.has(scene.id)}
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
            />
          );
        })}
      </div>

      {/* Add Scene Button - only for editors */}
      {!isReadOnly && project.scenes.length < project.settings.sceneCount && (
        <AddSceneDialog
          open={isAddingScene}
          onOpenChange={setIsAddingScene}
          characters={project.characters}
          onAddScene={handleAddScene}
        />
      )}

      {/* Bottom Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={project.scenes.length}
        onPageChange={setCurrentPage}
        variant="compact"
      />

      {/* Quick Actions - only for editors */}
      {!isReadOnly && (
        <QuickActions
          totalScenes={project.scenes.length}
          scenesWithImages={scenesWithImages}
          imageResolution={imageResolution}
          isGeneratingAllImages={isGenerating}
          onCopyPrompts={() => setShowPromptsDialog(true)}
          onGenerateAllImages={handleGenerateImages}
          onGenerateBatch={useInngest ? handleGenerateBatch : undefined}
          onStopGeneration={handleStopImageGeneration}
          backgroundJobProgress={useInngest ? backgroundJobProgress : undefined}
          selectedCount={selectedScenes.size}
          onSelectAll={selectAll}
          onSelectAllWithImages={selectAllWithImages}
          onClearSelection={clearSelection}
          onRegenerateSelected={handleRegenerateSelected}
          onRequestRegeneration={selectedScenes.size > 0 ? () => setShowRequestRegenDialog(true) : undefined}
        />
      )}

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-emerald-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-emerald-400">Tip:</strong> Copy the Text-to-Image prompt for each scene and use it in Nano Banana or Gemini AI Studio to generate high-quality images. Then use the Image-to-Video prompt with Grok AI.
        </p>
      </div>

      {/* Edit Scene Dialog */}
      <EditSceneDialog
        open={editingScene !== null}
        editSceneData={editSceneData}
        characters={project.characters}
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
        scenes={project.scenes}
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
