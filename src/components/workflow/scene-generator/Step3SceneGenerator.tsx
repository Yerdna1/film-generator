'use client';

import { useEffect, useState, useMemo } from 'react';
import { formatCostCompact, getImageCost } from '@/lib/services/real-costs';
import type { Project, ImageProvider } from '@/types/project';
import { useProjectStore } from '@/lib/stores/project-store';
import { useSceneGenerator } from './hooks/useSceneGenerator';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SceneHeader,
  SceneCard,
  AddSceneDialog,
  EditSceneDialog,
  ImagePreviewModal,
  PromptsDialog,
  QuickActions,
} from './components';

const SCENES_PER_PAGE = 20;

interface Step3Props {
  project: Project;
}

export function Step3SceneGenerator({ project: initialProject }: Step3Props) {
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

  const paginatedScenes = useMemo(() => {
    const start = (currentPage - 1) * SCENES_PER_PAGE;
    const end = start + SCENES_PER_PAGE;
    return project.scenes.slice(start, end);
  }, [project.scenes, currentPage]);

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

      {/* Pagination Info */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * SCENES_PER_PAGE + 1}-{Math.min(currentPage * SCENES_PER_PAGE, project.scenes.length)} of {project.scenes.length} scenes
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first, last, current, and neighbors
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, idx, arr) => (
                  <span key={page} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="text-muted-foreground px-1">...</span>
                    )}
                    <Button
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={page === currentPage ? "bg-emerald-600" : "border-white/10"}
                    >
                      {page}
                    </Button>
                  </span>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-white/10"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Scenes Grid - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {paginatedScenes.map((scene, idx) => (
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
            onToggleSelect={() => toggleSceneSelection(scene.id)}
            onToggleExpand={() => toggleExpanded(scene.id)}
            onDelete={() => deleteScene(scene.id)}
            onEdit={() => startEditScene(scene)}
            onGenerateImage={() => handleGenerateSceneImage(scene)}
            onRegeneratePrompts={() => regeneratePrompts(scene)}
            onPreviewImage={setPreviewImage}
          />
        ))}
      </div>

      {/* Add Scene Button */}
      {project.scenes.length < project.settings.sceneCount && (
        <AddSceneDialog
          open={isAddingScene}
          onOpenChange={setIsAddingScene}
          characters={project.characters}
          onAddScene={handleAddScene}
        />
      )}

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="border-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="border-white/10"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions
        totalScenes={project.scenes.length}
        scenesWithImages={scenesWithImages}
        imageResolution={imageResolution}
        isGeneratingAllImages={isGenerating}
        onCopyPrompts={() => setShowPromptsDialog(true)}
        onRegenerateAll={() => {
          if (confirm(`Are you sure you want to regenerate ALL ${project.scenes.length} scene images? This will cost approximately ${formatCostCompact(getImageCost(imageResolution) * project.scenes.length)}.`)) {
            handleRegenerateAllImages();
          }
        }}
        onGenerateAllImages={handleGenerateImages}
        onGenerateBatch={useInngest ? handleGenerateBatch : undefined}
        onStopGeneration={handleStopImageGeneration}
        backgroundJobProgress={useInngest ? backgroundJobProgress : undefined}
        selectedCount={selectedScenes.size}
        onSelectAll={selectAll}
        onSelectAllWithImages={selectAllWithImages}
        onClearSelection={clearSelection}
        onRegenerateSelected={() => {
          if (confirm(`Regenerate ${selectedScenes.size} selected images? Cost: ~${formatCostCompact(getImageCost(imageResolution) * selectedScenes.size)}`)) {
            handleRegenerateSelected();
          }
        }}
      />

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
    </div>
  );
}
