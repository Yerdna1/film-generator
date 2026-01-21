'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/hooks';
import { useApiKeys as useApiKeysContext } from '@/contexts/ApiKeysContext';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { Step5Props } from '../voiceover-generator/types';
import { useVoiceoverAudio } from '../voiceover-generator/hooks';
import { Pagination } from '@/components/workflow/video-generator/components/Pagination';
import { SCENES_PER_PAGE } from '@/lib/constants/workflow';
import { Button } from '@/components/ui/button';
import {
  VoiceoverHeader,
  SceneVoiceoverList,
  VoiceoverModals,
} from './components';
import { VoiceSettingsDialog } from '../voiceover-generator/components';
import { GenerateConfirmationDialog } from '../shared';
import {
  useDialogueLoader,
  useRegenerationRequests,
  useVoiceoverGeneration,
  useVoiceSettings
} from './hooks';
import { StepActionBar } from '../shared/StepActionBar';
import { Mic } from 'lucide-react';

export function Step5VoiceoverGenerator({ project: initialProject, permissions, userRole, isReadOnly = false, isAuthenticated = false }: Step5Props) {
  const t = useTranslations();
  const { updateScene, updateProject, projects } = useProjectStore();

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

  // Load dialogue data
  const { dialogueLoaded, isLoadingDialogue } = useDialogueLoader(project);

  // Find the first dialogue line overall (for unauthenticated user restriction)
  const allDialogues = (project.scenes || []).flatMap(s => s.dialogue || []);
  const firstDialogueLineId = allDialogues.length > 0 ? allDialogues[0].id : null;

  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [volume, setVolume] = useState([75]);

  // Determine if user can delete directly (admin) or must request (collaborator)
  const canDeleteDirectly = permissions?.canDelete ?? true;

  // Credits and API keys for free users
  const creditsData = useCredits();
  const { apiKeys, refreshApiKeys } = useApiKeysContext();

  // Convert ApiKeys to the format expected by the hook (has boolean flags)
  const apiKeysData = useMemo(() => {
    if (!apiKeys) return null;

    return {
      ...apiKeys,
      // Add boolean flags that the hook expects
      hasKieKey: !!apiKeys.kieApiKey,
      hasGeminiKey: !!apiKeys.geminiApiKey,
      hasOpenAIKey: !!apiKeys.openaiApiKey,
      hasElevenLabsKey: !!apiKeys.elevenLabsApiKey,
      hasOpenRouterKey: !!apiKeys.openRouterApiKey,
      hasPiApiKey: !!apiKeys.piapiApiKey,
      hasGrokKey: !!apiKeys.grokApiKey,
      hasClaudeKey: !!apiKeys.claudeApiKey,
      hasNanoBananaKey: !!apiKeys.nanoBananaApiKey,
      hasSunoKey: !!apiKeys.sunoApiKey,
    };
  }, [apiKeys]);

  // Refresh API keys when component mounts to ensure we have the latest data
  useEffect(() => {
    refreshApiKeys();
  }, [refreshApiKeys]);

  // Filter scenes with dialogue for pagination
  const scenesWithDialogue = useMemo(() =>
    (project.scenes || []).filter((scene) => (scene.dialogue || []).length > 0),
    [project.scenes]
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(scenesWithDialogue.length / SCENES_PER_PAGE);
  const startIndex = (currentPage - 1) * SCENES_PER_PAGE;
  const endIndex = startIndex + SCENES_PER_PAGE;

  const paginatedScenes = useMemo(() => {
    return scenesWithDialogue.slice(startIndex, endIndex);
  }, [scenesWithDialogue, startIndex, endIndex]);

  // Reset page if it exceeds total pages (e.g., after scenes deleted)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Regeneration and deletion requests
  const {
    regenerationRequests,
    approvedRegenerationRequests,
    deletionRequests,
    pendingAudioRegenLineIds,
    pendingDeletionLineIds,
    approvedRegenByLineId,
    fetchDeletionRequests,
    handleUseRegenerationAttempt,
    handleSelectRegeneration,
  } = useRegenerationRequests(project.id);

  // Audio generation and playback hooks
  const {
    audioStates,
    playingAudio,
    playingSceneId,
    isGeneratingAll,
    allDialogueLines,
    totalCharacters,
    generateAudioForLine,
    handleGenerateAll,
    stopGeneratingAll,
    deleteAudioForLine,
    deleteAllAudio,
    selectVersion,
    togglePlay,
    setAudioRef,
    handleAudioEnded,
    playAllSceneVoices,
    stopScenePlayback,
    playAllDialogues,
    switchAllToProvider,
    getAvailableVersions,
    downloadLine,
  } = useVoiceoverAudio(project);

  // Voiceover generation with credit checks
  const {
    isKieModalOpen,
    setIsKieModalOpen,
    isSavingKieKey,
    isInsufficientCreditsModalOpen,
    setIsInsufficientCreditsModalOpen,
    pendingVoiceoverGeneration,
    isGenerateAllDialogOpen,
    setIsGenerateAllDialogOpen,
    isGeneratingAll: isGeneratingAllDialog,
    getProviderAndModel,
    handleGenerateAudioWithCreditCheck,
    handleGenerateAllWithCreditCheck,
    handleUseAppCredits,
    handleSaveKieApiKey,
    handleConfirmGenerateAll,
  } = useVoiceoverGeneration(project, apiKeysData, async (lineId, sceneId, skipCreditCheck) => {
    await generateAudioForLine(lineId, sceneId, skipCreditCheck);
  }, async (skipCreditCheck) => {
    await handleGenerateAll(skipCreditCheck);
  });

  // Get provider and model from API keys (single source of truth)
  const { provider: apiKeysProvider, model: apiKeysModel } = getProviderAndModel(apiKeysData);

  // Handler for toggling TTS usage in video composition per scene
  const handleToggleUseTts = (sceneId: string) => {
    const scene = (project.scenes || []).find(s => s.id === sceneId);
    if (scene) {
      updateScene(project.id, sceneId, { useTtsInVideo: !(scene.useTtsInVideo ?? true) });
    }
  };

  // Safety check for voiceSettings (may be undefined in some data states)
  const voiceSettings = project.voiceSettings || { provider: 'gemini-tts', language: 'sk', characterVoices: {} };

  // Voice settings management
  const {
    voices,
    handleVoiceChange,
    handleVoiceSettingsChange,
    handleProviderChange,
    handleLanguageChange,
  } = useVoiceSettings(project.id, voiceSettings);

  // Calculate counts directly from project.scenes (live from store)
  const liveDialogueLines = useMemo(() =>
    (project.scenes || []).flatMap(s => s.dialogue || []),
    [project.scenes]
  );

  // Count versions for CURRENT provider+language (not just any audio)
  const currentVersionKey = `${voiceSettings.provider}_${voiceSettings.language}`;
  const generatedCount = liveDialogueLines.filter((line) =>
    line.audioVersions?.some(v => `${v.provider}_${v.language}` === currentVersionKey)
  ).length;
  const remainingCount = liveDialogueLines.length - generatedCount;

  const handleDownloadAll = () => {
    // TODO: Implement download all
  };

  return (
    <div className="max-w-[1920px] mx-auto space-y-6 px-4">
      {/* Step Action Bar */}
      <StepActionBar
        title={t('steps.voiceover.title')}
        icon={Mic}
        subtitle={`${generatedCount} / ${liveDialogueLines.length} voiceovers generated`}
        operation="tts"
        showApiKeyButton={true}
        actions={[
          {
            label: isGeneratingAll ? 'Stop' : 'Generate All',
            onClick: isGeneratingAll ? stopGeneratingAll : handleGenerateAllWithCreditCheck,
            disabled: isReadOnly || liveDialogueLines.length === 0,
            variant: isGeneratingAll ? 'destructive' : 'primary',
          },
        ]}
      />

      <VoiceoverHeader
        isLoadingDialogue={isLoadingDialogue}
        dialogueCount={allDialogueLines.length}
      />

      {/* Top Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={scenesWithDialogue.length}
        onPageChange={setCurrentPage}
        isProcessing={isGeneratingAll}
        onStop={stopGeneratingAll}
      />

      {/* Dialogue Lines by Scene - 3 column grid */}
      <SceneVoiceoverList
        scenes={paginatedScenes}
        startIndex={startIndex}
        projectId={project.id}
        characters={project.characters || []}
        audioStates={audioStates}
        playingAudio={playingAudio}
        playingSceneId={playingSceneId}
        provider={voiceSettings.provider}
        isReadOnly={isReadOnly}
        isAuthenticated={isAuthenticated}
        firstDialogueLineId={firstDialogueLineId}
        canDeleteDirectly={canDeleteDirectly}
        pendingRegenLineIds={pendingAudioRegenLineIds}
        pendingDeletionLineIds={pendingDeletionLineIds}
        approvedRegenByLineId={approvedRegenByLineId}
        onTogglePlay={togglePlay}
        onGenerateAudio={generateAudioForLine}
        onAudioRef={setAudioRef}
        onAudioEnded={handleAudioEnded}
        onDownloadLine={downloadLine}
        onPlayAllScene={playAllSceneVoices}
        onStopScenePlayback={stopScenePlayback}
        onDeleteAudio={deleteAudioForLine}
        onSelectVersion={selectVersion}
        onToggleUseTts={handleToggleUseTts}
        onDeletionRequested={fetchDeletionRequests}
        onUseRegenerationAttempt={handleUseRegenerationAttempt}
        onSelectRegeneration={handleSelectRegeneration}
      />

      {/* Bottom Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={scenesWithDialogue.length}
        onPageChange={setCurrentPage}
        isProcessing={isGeneratingAll}
        onStop={stopGeneratingAll}
      />

      {/* Modals */}
      <VoiceSettingsDialog
        open={showVoiceSettings}
        onOpenChange={setShowVoiceSettings}
        characters={project.characters || []}
        voices={voices}
        provider={voiceSettings.provider}
        onVoiceChange={handleVoiceChange}
        onVoiceSettingsChange={handleVoiceSettingsChange}
      />

      <GenerateConfirmationDialog
        isOpen={isGenerateAllDialogOpen}
        icon="mic"
        title="Generovať Hlasové Prejavy"
        description={`Potvrdiť generovanie ${allDialogueLines.length} hlasových prejavov`}
        confirmLabel="Generovať Všetky Hlasy"
        cancelLabel="Zrušiť"
        infoItems={[
          { label: 'Jazyk', value: voiceSettings.language === 'sk' ? 'Slovenčina' : voiceSettings.language === 'en' ? 'English' : voiceSettings.language },
          { label: 'Počet replík', value: String(allDialogueLines.length) },
        ]}
        provider={apiKeysProvider}
        model={apiKeysModel}
        isGenerating={isGeneratingAllDialog}
        onConfirm={handleConfirmGenerateAll}
        onCancel={() => setIsGenerateAllDialogOpen(false)}
      />

      <VoiceoverModals
        isInsufficientCreditsModalOpen={isInsufficientCreditsModalOpen}
        setIsInsufficientCreditsModalOpen={setIsInsufficientCreditsModalOpen}
        isKieModalOpen={isKieModalOpen}
        setIsKieModalOpen={setIsKieModalOpen}
        isSavingKieKey={isSavingKieKey}
        pendingVoiceoverGeneration={pendingVoiceoverGeneration}
        dialogueCount={allDialogueLines.length}
        characters={project.characters || []}
        voiceAssignments={new Map(
          Object.entries(project.voiceSettings?.characterVoices || {}).map(([charId, voiceData]) => [
            charId,
            (voiceData as any).voiceId || voiceData,
          ])
        )}
        onUseAppCredits={handleUseAppCredits}
        onSaveKieApiKey={handleSaveKieApiKey}
      />
    </div>
  );
}