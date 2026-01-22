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
import { UnifiedGenerateConfirmationDialog } from '../shared/UnifiedGenerateConfirmationDialog';
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

  // Individual line generation dialog state
  const [showIndividualDialog, setShowIndividualDialog] = useState(false);
  const [pendingLineGeneration, setPendingLineGeneration] = useState<{ lineId: string; sceneId: string; text: string } | null>(null);

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

  // Handler for individual line generation with dialog
  const handleGenerateLineWithDialog = (lineId: string, sceneId: string) => {
    // Find the dialogue text
    const scene = (project.scenes || []).find(s => s.id === sceneId);
    const line = scene?.dialogue?.find(d => d.id === lineId);
    if (line) {
      setPendingLineGeneration({ lineId, sceneId, text: line.text });
      setShowIndividualDialog(true);
    }
  };

  // Confirm individual line generation
  const handleConfirmIndividualGeneration = async () => {
    setShowIndividualDialog(false);
    if (pendingLineGeneration) {
      await handleGenerateAudioWithCreditCheck(pendingLineGeneration.lineId, pendingLineGeneration.sceneId);
    }
  };

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
        onGenerateAudio={handleGenerateLineWithDialog}
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

      <UnifiedGenerateConfirmationDialog
        isOpen={isGenerateAllDialogOpen}
        onClose={() => setIsGenerateAllDialogOpen(false)}
        onConfirm={handleConfirmGenerateAll}
        operation="tts"
        provider={apiKeysProvider}
        model={apiKeysModel}
        title={t('steps.voiceover.generateAll')}
        description={`This will generate voiceovers for ${allDialogueLines.length} dialogue lines using ${apiKeysProvider}.`}
        details={[
          { label: 'Language', value: voiceSettings.language === 'sk' ? 'Slovenčina' : voiceSettings.language === 'en' ? 'English' : voiceSettings.language, icon: Mic },
          { label: 'Dialogue Lines', value: allDialogueLines.length, icon: Mic },
          { label: 'Total Characters', value: `~${Math.ceil(allDialogueLines.reduce((sum, line) => sum + (line.text?.length || 0), 0) / 1000)}k`, icon: Mic },
        ]}
        estimatedCost={ACTION_COSTS.voiceover.geminiTts * allDialogueLines.length}
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

      {/* Individual Line Generation Dialog */}
      <UnifiedGenerateConfirmationDialog
        isOpen={showIndividualDialog}
        onClose={() => setShowIndividualDialog(false)}
        onConfirm={handleConfirmIndividualGeneration}
        operation="tts"
        provider={apiKeysProvider}
        model={apiKeysModel}
        title="Generate Voiceover"
        description={`This will generate voiceover for a dialogue line using ${apiKeysProvider}.`}
        details={[
          { label: 'Text', value: pendingLineGeneration?.text?.substring(0, 50) + (pendingLineGeneration?.text?.length || 0 > 50 ? '...' : '') || '', icon: Mic },
          { label: 'Language', value: voiceSettings.language === 'sk' ? 'Slovenčina' : voiceSettings.language === 'en' ? 'English' : voiceSettings.language, icon: Mic },
          { label: 'Characters', value: pendingLineGeneration?.text?.length || 0, icon: Mic },
        ]}
        estimatedCost={ACTION_COSTS.voiceover.geminiTts}
      />
    </div>
  );
}