'use client';

import { formatCostCompact, getImageCost } from '@/lib/services/real-costs';
import type { Project } from '@/types/project';
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

interface Step3Props {
  project: Project;
}

export function Step3SceneGenerator({ project: initialProject }: Step3Props) {

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
    deleteScene,
    updateSettings,
  } = useSceneGenerator(initialProject);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Progress */}
      <SceneHeader
        sceneCount={project.settings.sceneCount}
        totalScenes={project.scenes.length}
        scenesWithImages={scenesWithImages}
        imageResolution={imageResolution}
        aspectRatio={sceneAspectRatio}
        hasCharacters={project.characters.length > 0}
        isGeneratingScenes={isGeneratingScenes}
        onSceneCountChange={handleSceneCountChange}
        onImageResolutionChange={(value) => updateSettings({ imageResolution: value })}
        onAspectRatioChange={setSceneAspectRatio}
        onGenerateAllScenes={handleGenerateAllScenes}
      />

      {/* Scenes List */}
      <div className="space-y-4">
        {project.scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={index}
            isExpanded={expandedScenes.includes(scene.id)}
            isGeneratingImage={generatingImageForScene === scene.id}
            isGeneratingAllImages={isGeneratingAllImages}
            imageResolution={imageResolution}
            characters={project.characters}
            onToggleExpand={() => toggleExpanded(scene.id)}
            onDelete={() => deleteScene(scene.id)}
            onEdit={() => startEditScene(scene)}
            onGenerateImage={() => handleGenerateSceneImage(scene)}
            onRegeneratePrompts={() => regeneratePrompts(scene)}
            onPreviewImage={setPreviewImage}
          />
        ))}

        {/* Add Scene Button */}
        {project.scenes.length < project.settings.sceneCount && (
          <AddSceneDialog
            open={isAddingScene}
            onOpenChange={setIsAddingScene}
            characters={project.characters}
            onAddScene={handleAddScene}
          />
        )}
      </div>

      {/* Quick Actions */}
      <QuickActions
        totalScenes={project.scenes.length}
        scenesWithImages={scenesWithImages}
        imageResolution={imageResolution}
        isGeneratingAllImages={isGeneratingAllImages}
        onCopyPrompts={() => setShowPromptsDialog(true)}
        onRegenerateAll={() => {
          if (confirm(`Are you sure you want to regenerate ALL ${project.scenes.length} scene images? This will cost approximately ${formatCostCompact(getImageCost(imageResolution) * project.scenes.length)}.`)) {
            handleRegenerateAllImages();
          }
        }}
        onGenerateAllImages={handleGenerateAllSceneImages}
        onStopGeneration={handleStopImageGeneration}
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
