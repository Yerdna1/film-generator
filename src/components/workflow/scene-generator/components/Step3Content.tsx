'use client';

import { useState, useMemo } from 'react';
import type { Scene, Character, ImageProvider, AspectRatio } from '@/types/project';
import { SCENES_PER_PAGE } from '@/lib/constants/workflow';
import { getImageCreditCost } from '@/lib/services/credits';
import { Pagination } from '@/components/workflow/video-generator/components/Pagination';
import { RequestRegenerationDialog } from '@/components/collaboration/RequestRegenerationDialog';
import { InsufficientCreditsModal } from '@/components/workflow/character-generator/components';
import { KieApiKeyModal } from '@/components/workflow/character-generator/components/KieApiKeyModal';
import {
  SceneCard,
  AddSceneDialog,
  EditSceneDialog,
  ImagePreviewModal,
  PromptsDialog,
  QuickActions,
  SceneHeader,
  OpenRouterModal,
} from './index';
import type { PendingSceneGeneration } from '../types';

interface Step3ContentProps {
  // Project data
  projectId: string;
  scenes: Scene[];
  characters: Character[];
  projectSettings: { sceneCount?: number; imageResolution?: string };
  imageResolution: string;
  sceneAspectRatio: AspectRatio;
  imageProvider: ImageProvider;

  // Generation state
  isGeneratingScenes: boolean;
  generatingImageForScene: string | null;
  isGeneratingAllImages: boolean;
  sceneJobProgress: number;
  sceneJobStatus: string | null;
  isSceneJobRunning: boolean;
  backgroundJobProgress: number;
  isBackgroundJobRunning: boolean;
  isGenerating: boolean;
  useInngest: boolean;

  // UI State
  isAddingScene: boolean;
  setIsAddingScene: (value: boolean) => void;
  editingScene: string | null;
  editSceneData: any;
  setEditSceneData: (value: any) => void;
  expandedScenes: string[];
  previewImage: string | null;
  setPreviewImage: (value: string | null) => void;
  showPromptsDialog: boolean;
  setShowPromptsDialog: (value: boolean) => void;
  sceneJobId: string | null;

  // Selection state
  selectedScenes: Set<string>;
  toggleSceneSelection: (sceneId: string) => void;
  clearSelection: () => void;
  selectAll: (scenes: Scene[]) => void;
  selectAllWithImages: () => void;
  handleRegenerateSelected: () => void;

  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  paginatedScenes: Scene[];

  // Actions
  toggleExpanded: (sceneId: string) => void;
  handleAddScene: (scene: any) => void;
  saveEditScene: () => void;
  cancelEditScene: () => void;
  handleGenerateAllScenesWithCreditCheck: () => void;
  handleGenerateImages: () => void;
  handleGenerateBatch?: (batchSize: number) => void;
  handleStopImageGeneration: () => void;
  handleGenerateSceneImageWithCreditCheck: (scene: Scene) => Promise<void>;
  regeneratePrompts: (scene: Scene) => void;
  handleCancelSceneGeneration: () => void;
  deleteScene: (sceneId: string) => void;
  startEditScene: (scene: Scene) => void;

  // Collaboration
  pendingImageRegenSceneIds: Set<string>;
  pendingDeletionSceneIds: Set<string>;
  approvedRegenBySceneId: Map<string, any>;
  canDeleteDirectly: boolean;
  isAdmin: boolean;
  fetchRegenerationRequests: () => void;
  fetchDeletionRequests: () => void;
  handleUseRegenerationAttempt: (requestId: string) => Promise<void>;
  handleSelectRegeneration: (requestId: string, selectedUrl: string) => Promise<void>;
  handleToggleLock: (sceneId: string) => Promise<void>;

  // API Keys & Credits
  isKieModalOpen: boolean;
  setIsKieModalOpen: (value: boolean) => void;
  isSavingKieKey: boolean;
  handleSaveKieApiKey: (apiKey: string, model: string) => Promise<void>;
  isInsufficientCreditsModalOpen: boolean;
  setIsInsufficientCreditsModalOpen: (value: boolean) => void;
  isOpenRouterModalOpen: boolean;
  setIsOpenRouterModalOpen: (value: boolean) => void;
  isSavingOpenRouterKey: boolean;
  pendingSceneGeneration: PendingSceneGeneration | null;
  pendingSceneTextGeneration: boolean;
  sceneTextCreditsNeeded: number;
  handleUseAppCredits: () => Promise<void>;
  handleUseAppCreditsForScenes: () => Promise<void>;
  handleSaveOpenRouterKey: (apiKey: string, model: string) => Promise<void>;
  creditsData: any;

  // Permissions
  isReadOnly: boolean;
  isAuthenticated: boolean;
}

export function Step3Content({
  projectId,
  scenes,
  characters,
  projectSettings,
  imageResolution,
  sceneAspectRatio,
  imageProvider,
  isGeneratingScenes,
  generatingImageForScene,
  isGeneratingAllImages,
  sceneJobProgress,
  sceneJobStatus,
  isSceneJobRunning,
  backgroundJobProgress,
  isBackgroundJobRunning,
  isGenerating,
  useInngest,
  isAddingScene,
  setIsAddingScene,
  editingScene,
  editSceneData,
  setEditSceneData,
  expandedScenes,
  previewImage,
  setPreviewImage,
  showPromptsDialog,
  setShowPromptsDialog,
  selectedScenes,
  toggleSceneSelection,
  clearSelection,
  selectAll,
  selectAllWithImages,
  handleRegenerateSelected,
  currentPage,
  setCurrentPage,
  totalPages,
  startIndex,
  endIndex,
  paginatedScenes,
  toggleExpanded,
  handleAddScene,
  saveEditScene,
  cancelEditScene,
  handleGenerateAllScenesWithCreditCheck,
  handleGenerateImages,
  handleGenerateBatch,
  handleStopImageGeneration,
  handleGenerateSceneImageWithCreditCheck,
  regeneratePrompts,
  handleCancelSceneGeneration,
  deleteScene,
  startEditScene,
  pendingImageRegenSceneIds,
  pendingDeletionSceneIds,
  approvedRegenBySceneId,
  canDeleteDirectly,
  isAdmin,
  fetchRegenerationRequests,
  fetchDeletionRequests,
  handleUseRegenerationAttempt,
  handleSelectRegeneration,
  handleToggleLock,
  isKieModalOpen,
  setIsKieModalOpen,
  isSavingKieKey,
  handleSaveKieApiKey,
  isInsufficientCreditsModalOpen,
  setIsInsufficientCreditsModalOpen,
  isOpenRouterModalOpen,
  setIsOpenRouterModalOpen,
  isSavingOpenRouterKey,
  pendingSceneTextGeneration,
  sceneTextCreditsNeeded,
  handleUseAppCredits,
  handleUseAppCreditsForScenes,
  handleSaveOpenRouterKey,
  creditsData,
  isReadOnly,
  isAuthenticated,
}: Step3ContentProps) {
  const [showRequestRegenDialog, setShowRequestRegenDialog] = useState(false);

  const scenesWithImages = scenes.filter(s => s.imageUrl).length;

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

  return (
    <>
      {/* Scene Header */}
      <SceneHeader
        sceneCount={projectSettings.sceneCount || 12}
        totalScenes={scenes.length}
        scenesWithImages={scenesWithImages}
        imageResolution={imageResolution as any}
        aspectRatio={sceneAspectRatio}
        imageProvider={imageProvider}
        hasCharacters={characters.length > 0}
        isGeneratingScenes={isGeneratingScenes}
        sceneJobProgress={sceneJobProgress}
        sceneJobStatus={sceneJobStatus}
        isSceneJobRunning={isSceneJobRunning}
        onGenerateAllScenes={handleGenerateAllScenesWithCreditCheck}
        onStopSceneGeneration={handleCancelSceneGeneration}
      />

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

      {/* Scenes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {paginatedScenes.map((scene, idx) => {
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
              projectId={projectId}
              isExpanded={expandedScenes.includes(scene.id)}
              isGeneratingImage={generatingImageForScene === scene.id}
              isGeneratingAllImages={isGeneratingAllImages}
              imageResolution={imageResolution as any}
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
              onGenerateImage={() => handleGenerateSceneImageWithCreditCheck(scene)}
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

      {/* Add Scene Button */}
      {!isReadOnly && scenes.length < (projectSettings.sceneCount || 12) && (
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

      {/* Quick Actions */}
      {!isReadOnly && (
        <QuickActions
          totalScenes={scenes.length}
          scenesWithImages={scenesWithImages}
          imageResolution={imageResolution as any}
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
          projectId={projectId}
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
        projectId={projectId}
        targetType="image"
        scenes={selectedScenesData}
        open={showRequestRegenDialog}
        onOpenChange={setShowRequestRegenDialog}
        onRequestSent={() => {
          clearSelection();
          fetchRegenerationRequests();
        }}
      />

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={isInsufficientCreditsModalOpen}
        onClose={() => setIsInsufficientCreditsModalOpen(false)}
        onOpenKieModal={() => {
          setIsInsufficientCreditsModalOpen(false);
          setIsKieModalOpen(true);
        }}
        onOpenRouterModal={() => {
          setIsInsufficientCreditsModalOpen(false);
          setIsOpenRouterModalOpen(true);
        }}
        onUseAppCredits={pendingSceneTextGeneration ? handleUseAppCreditsForScenes : handleUseAppCredits}
        creditsNeeded={pendingSceneTextGeneration ? sceneTextCreditsNeeded : getImageCreditCost(imageResolution as any)}
        currentCredits={creditsData?.credits.balance}
        generationType={pendingSceneTextGeneration ? 'text' : 'image'}
      />

      {/* KIE AI API Key Modal */}
      <KieApiKeyModal
        isOpen={isKieModalOpen}
        onClose={() => setIsKieModalOpen(false)}
        onSave={handleSaveKieApiKey}
        isLoading={isSavingKieKey}
      />

      {/* OpenRouter API Key Modal */}
      {pendingSceneTextGeneration && (
        <OpenRouterModal
          isOpen={isOpenRouterModalOpen}
          onClose={() => setIsOpenRouterModalOpen(false)}
          onSave={handleSaveOpenRouterKey}
          isLoading={isSavingOpenRouterKey}
          sceneCount={projectSettings.sceneCount || 12}
          creditsNeeded={sceneTextCreditsNeeded}
        />
      )}
    </>
  );
}
