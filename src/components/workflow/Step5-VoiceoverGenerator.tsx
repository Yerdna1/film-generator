'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Mic, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { VoiceProvider, VoiceLanguage } from '@/types/project';
import type { RegenerationRequest, DeletionRequest } from '@/types/collaboration';
import {
  Step5Props,
  getVoicesForProvider,
  ELEVENLABS_VOICES,
} from './voiceover-generator/types';
import { useVoiceoverAudio } from './voiceover-generator/hooks';
import {
  VoiceSettingsDialog,
  ProviderSelector,
  VoiceoverProgress,
  SceneDialogueCard,
  KieTtsModal,
} from './voiceover-generator/components';
import { Pagination } from '@/components/workflow/video-generator/components/Pagination';
import { SCENES_PER_PAGE } from '@/lib/constants/workflow';
import { InsufficientCreditsModal } from '@/components/workflow/character-generator/components/InsufficientCreditsModal';

export function Step5VoiceoverGenerator({ project: initialProject, permissions, userRole, isReadOnly = false, isAuthenticated = false }: Step5Props) {
  const t = useTranslations();
  const { updateVoiceSettings, updateCharacter, updateScene, updateProject, projects } = useProjectStore();

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  // Store may contain summary data without scenes
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

  // Track if dialogue data has been loaded
  const [dialogueLoaded, setDialogueLoaded] = useState(false);
  const [isLoadingDialogue, setIsLoadingDialogue] = useState(false);

  // Load dialogue data on mount if not already present
  useEffect(() => {
    const hasDialogue = project.scenes?.some(s => s.dialogue && s.dialogue.length > 0);

    // If we already have dialogue data or it's already loaded, skip
    if (hasDialogue || dialogueLoaded) return;

    const loadDialogue = async () => {
      setIsLoadingDialogue(true);
      try {
        // Fetch all scenes with dialogue in one call
        const response = await fetch(
          `/api/projects/${project.id}/scenes?withDialogue=true&limit=1000`
        );
        if (response.ok) {
          const data = await response.json();
          // Update project in store with dialogue data
          updateProject(project.id, {
            scenes: data.scenes || [],
          });
          setDialogueLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load dialogue data:', error);
      } finally {
        setIsLoadingDialogue(false);
      }
    };

    loadDialogue();
  }, [project.id, project.scenes, dialogueLoaded, updateProject]);

  // Find the first dialogue line overall (for unauthenticated user restriction)
  // Only the first dialogue line is accessible to unauthenticated users
  const allDialogues = (project.scenes || []).flatMap(s => s.dialogue || []);
  const firstDialogueLineId = allDialogues.length > 0 ? allDialogues[0].id : null;

  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [volume, setVolume] = useState([75]);

  // Determine if user can delete directly (admin) or must request (collaborator)
  const canDeleteDirectly = permissions?.canDelete ?? true;

  // Regeneration requests state
  const [regenerationRequests, setRegenerationRequests] = useState<RegenerationRequest[]>([]);
  const [approvedRegenerationRequests, setApprovedRegenerationRequests] = useState<RegenerationRequest[]>([]);

  // Deletion requests state
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);

  // Credits for free users
  const creditsData = useCredits();

  // KIE AI modal state for TTS generation
  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);

  // Insufficient credits modal state
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);

  // Pending voiceover generation (for credit check flow)
  const [pendingVoiceoverGeneration, setPendingVoiceoverGeneration] = useState<{
    type: 'single' | 'all';
    lineId?: string;
    sceneId?: string;
  } | null>(null);

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

  // Fetch regeneration requests for this project (audio type)
  const fetchRegenerationRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/regeneration-requests?status=pending&type=audio`);
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
      const response = await fetch(`/api/projects/${project.id}/regeneration-requests?status=approved,generating,selecting,awaiting_final&type=audio`);
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
      const response = await fetch(`/api/projects/${project.id}/deletion-requests?status=pending&type=audio`);
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

  // Create memoized sets for quick lookup
  const pendingAudioRegenLineIds = useMemo(() => {
    return new Set(
      regenerationRequests
        .filter(r => r.targetType === 'audio' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [regenerationRequests]);

  const pendingDeletionLineIds = useMemo(() => {
    return new Set(
      deletionRequests
        .filter(r => r.targetType === 'audio' && r.status === 'pending')
        .map(r => r.targetId)
    );
  }, [deletionRequests]);

  const approvedRegenByLineId = useMemo(() => {
    const map = new Map<string, RegenerationRequest>();
    for (const req of approvedRegenerationRequests) {
      if (req.targetType === 'audio') {
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

      await fetchApprovedRegenerationRequests();
    } catch (error) {
      console.error('Failed to use regeneration attempt:', error);
      throw error;
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

      await fetchApprovedRegenerationRequests();
    } catch (error) {
      console.error('Failed to select regeneration:', error);
      throw error;
    }
  }, [project.id, fetchApprovedRegenerationRequests]);

  // Credit check wrapper for single voiceover generation
  const handleGenerateAudioWithCreditCheck = useCallback(async (lineId: string, sceneId: string) => {
    setPendingVoiceoverGeneration({ type: 'single', lineId, sceneId });
    setIsInsufficientCreditsModalOpen(true);
  }, []);

  // Credit check wrapper for all voiceovers generation
  const handleGenerateAllWithCreditCheck = useCallback(async () => {
    setPendingVoiceoverGeneration({ type: 'all' });
    setIsInsufficientCreditsModalOpen(true);
  }, []);

  // Custom hook for audio generation
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

  // Proceed with generation using app credits
  const handleUseAppCredits = useCallback(async () => {
    if (!pendingVoiceoverGeneration) return;

    setIsInsufficientCreditsModalOpen(false);

    if (pendingVoiceoverGeneration.type === 'single' && pendingVoiceoverGeneration.lineId && pendingVoiceoverGeneration.sceneId) {
      await generateAudioForLine(pendingVoiceoverGeneration.lineId, pendingVoiceoverGeneration.sceneId, false); // Use app credits
    } else if (pendingVoiceoverGeneration.type === 'all') {
      await handleGenerateAll(false); // Use app credits
    }

    setPendingVoiceoverGeneration(null);
  }, [pendingVoiceoverGeneration, generateAudioForLine, handleGenerateAll]);

  // Save KIE AI API key handler
  const handleSaveKieApiKey = useCallback(async (
    apiKey: string,
    model: string,
    voiceAssignments?: Array<{ characterId: string; voiceId: string }>
  ): Promise<void> => {
    setIsSavingKieKey(true);

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kieApiKey: apiKey,
          kieTtsModel: model,
          ttsProvider: 'kie',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save API key');
      }

      // Update voice assignments for characters
      if (voiceAssignments && voiceAssignments.length > 0) {
        voiceAssignments.forEach(({ characterId, voiceId }) => {
          const voice = ELEVENLABS_VOICES.find(v => v.id === voiceId);
          if (voice) {
            // Update character voice settings
            updateCharacter(project.id, characterId, {
              voiceId,
              voiceName: voice.name,
            });

            // Update project voiceSettings characterVoices
            updateVoiceSettings(project.id, {
              characterVoices: {
                ...(project.voiceSettings?.characterVoices || {}),
                [characterId]: { voiceId, voiceName: voice.name },
              },
            });
          }
        });
      }

      // Update project voice settings to use KIE provider
      updateVoiceSettings(project.id, { provider: 'kie' });

      toast.success('KIE AI API Key uložený', {
        description: 'Generujem hlasový prejav...',
      });

      setIsKieModalOpen(false);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Process pending generation with KIE key (skip credit check by calling original handlers)
      if (pendingVoiceoverGeneration) {
        if (pendingVoiceoverGeneration.type === 'single' && pendingVoiceoverGeneration.lineId && pendingVoiceoverGeneration.sceneId) {
          await generateAudioForLine(pendingVoiceoverGeneration.lineId, pendingVoiceoverGeneration.sceneId, true); // Skip credit check, use KIE key
        } else if (pendingVoiceoverGeneration.type === 'all') {
          await handleGenerateAll(true); // Skip credit check, use KIE key
        }
        setPendingVoiceoverGeneration(null);
      }
    } catch (error) {
      toast.error('Failed to Save API Key', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      setIsSavingKieKey(false);
    }
  }, [pendingVoiceoverGeneration, generateAudioForLine, handleGenerateAll, project, updateCharacter, updateVoiceSettings]);

  // Handler for toggling TTS usage in video composition per scene
  const handleToggleUseTts = useCallback((sceneId: string) => {
    const scene = (project.scenes || []).find(s => s.id === sceneId);
    if (scene) {
      updateScene(project.id, sceneId, { useTtsInVideo: !(scene.useTtsInVideo ?? true) });
    }
  }, [project.id, project.scenes, updateScene]);

  // Safety check for voiceSettings (may be undefined in some data states)
  const voiceSettings = project.voiceSettings || { provider: 'gemini-tts', language: 'sk', characterVoices: {} };
  const voices = getVoicesForProvider(voiceSettings.provider);

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

  const handleVoiceChange = (characterId: string, voiceId: string) => {
    const voice = voices.find((v) => v.id === voiceId);
    if (!voice) return;

    updateVoiceSettings(project.id, {
      characterVoices: {
        ...voiceSettings.characterVoices,
        [characterId]: { voiceId, voiceName: voice.name },
      },
    });

    updateCharacter(project.id, characterId, {
      voiceId,
      voiceName: voice.name,
    });
  };

  const handleVoiceSettingsChange = (characterId: string, settings: {
    voiceInstructions?: string;
    voiceStability?: number;
    voiceSimilarityBoost?: number;
    voiceStyle?: number;
  }) => {
    updateCharacter(project.id, characterId, settings);
  };

  const handleProviderChange = (provider: VoiceProvider) => {
    updateVoiceSettings(project.id, { provider });
  };

  const handleLanguageChange = (language: VoiceLanguage) => {
    updateVoiceSettings(project.id, { language });
  };

  const handleDownloadAll = () => {
    // TODO: Implement download all
  };

  return (
    <div className="max-w-[1920px] mx-auto space-y-6 px-4">
      {/* Loading dialogue indicator */}
      {isLoadingDialogue && (
        <div className="glass rounded-xl p-6 text-center">
          <Loader2 className="w-8 h-8 text-violet-400 mx-auto mb-3 animate-spin" />
          <h3 className="font-semibold mb-2">{t('steps.voiceover.loadingDialogue')}</h3>
        </div>
      )}

      {/* No dialogue warning */}
      {!isLoadingDialogue && allDialogueLines.length === 0 && (
        <div className="glass rounded-xl p-6 border-l-4 border-amber-500 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">{t('steps.voiceover.noDialogue')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('steps.voiceover.noDialogueDescription')}
          </p>
        </div>
      )}

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {paginatedScenes.map((scene, idx) => {
          // Calculate the actual scene index across all pages
          const actualIndex = startIndex + idx;
          return (
            <SceneDialogueCard
              key={scene.id}
              scene={scene}
              sceneIndex={actualIndex}
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
          );
        })}
      </div>

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

      {/* Provider Selection & Controls */}
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Mic className="w-5 h-5 text-violet-400 shrink-0" />
            {!isReadOnly ? (
              <ProviderSelector
                provider={voiceSettings.provider}
                language={voiceSettings.language}
                onProviderChange={handleProviderChange}
                onLanguageChange={handleLanguageChange}
              />
            ) : (
              <span className="text-sm font-medium">{voiceSettings.provider} ({voiceSettings.language})</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-start sm:justify-end">
            {!isReadOnly && (
              <VoiceSettingsDialog
                open={showVoiceSettings}
                onOpenChange={setShowVoiceSettings}
                characters={project.characters || []}
                voices={voices}
                provider={voiceSettings.provider}
                onVoiceChange={handleVoiceChange}
                onVoiceSettingsChange={handleVoiceSettingsChange}
              />
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              {volume[0] === 0 ? (
                <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="w-20 sm:w-24"
              />
            </div>
          </div>
        </div>

        {/* Progress & Actions - only for editors */}
        {!isReadOnly && (
          <VoiceoverProgress
            generatedCount={generatedCount}
            totalCount={liveDialogueLines.length}
            remainingCount={remainingCount}
            totalCharacters={totalCharacters}
            isGeneratingAll={isGeneratingAll}
            isPlayingAll={playingSceneId === '__all__'}
            provider={voiceSettings.provider}
            language={voiceSettings.language}
            availableVersions={getAvailableVersions()}
            onGenerateAll={handleGenerateAllWithCreditCheck}
            onDownloadAll={handleDownloadAll}
            onDeleteAll={deleteAllAudio}
            onPlayAll={playAllDialogues}
            onStopPlayback={stopScenePlayback}
            onSwitchAllToProvider={switchAllToProvider}
          />
        )}
      </div>

      {/* Insufficient Credits Modal for TTS generation */}
      <InsufficientCreditsModal
        isOpen={isInsufficientCreditsModalOpen}
        onClose={() => setIsInsufficientCreditsModalOpen(false)}
        onOpenKieModal={() => {
          setIsInsufficientCreditsModalOpen(false);
          setIsKieModalOpen(true);
        }}
        onUseAppCredits={handleUseAppCredits}
        creditsNeeded={ACTION_COSTS.voiceover.elevenlabs * (pendingVoiceoverGeneration?.type === 'all' ? (allDialogueLines.length || 1) : 1)}
        currentCredits={creditsData?.credits?.balance ?? 0}
        generationType="audio"
      />

      {/* KIE AI API Key Modal for TTS generation */}
      <KieTtsModal
        isOpen={isKieModalOpen}
        onClose={() => setIsKieModalOpen(false)}
        onSave={handleSaveKieApiKey}
        isLoading={isSavingKieKey}
        characters={project.characters || []}
        currentVoiceAssignments={new Map(
          Object.entries(project.voiceSettings?.characterVoices || {}).map(([charId, voiceData]) => [
            charId,
            (voiceData as any).voiceId || voiceData
          ])
        )}
      />
    </div>
  );
}
