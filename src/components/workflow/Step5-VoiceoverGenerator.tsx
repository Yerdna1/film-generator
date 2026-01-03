'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Mic, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useProjectStore } from '@/lib/stores/project-store';
import type { VoiceProvider, VoiceLanguage } from '@/types/project';
import type { RegenerationRequest, DeletionRequest } from '@/types/collaboration';
import {
  Step5Props,
  getVoicesForProvider,
} from './voiceover-generator/types';
import { useVoiceoverAudio } from './voiceover-generator/hooks';
import {
  VoiceSettingsDialog,
  ProviderSelector,
  VoiceoverProgress,
  SceneDialogueCard,
} from './voiceover-generator/components';

export function Step5VoiceoverGenerator({ project: initialProject, permissions, userRole, isReadOnly = false, isAuthenticated = false }: Step5Props) {
  const t = useTranslations();
  const { updateVoiceSettings, updateCharacter, projects } = useProjectStore();

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  // Store may contain summary data without scenes
  const storeProject = projects.find(p => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

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

  // Custom hook for audio generation
  const {
    audioStates,
    playingAudio,
    isGeneratingAll,
    allDialogueLines,
    generateAudioForLine,
    handleGenerateAll,
    togglePlay,
    setAudioRef,
    handleAudioEnded,
  } = useVoiceoverAudio(project);

  // Safety check for voiceSettings (may be undefined in some data states)
  const voiceSettings = project.voiceSettings || { provider: 'gemini-tts', language: 'sk', characterVoices: {} };
  const voices = getVoicesForProvider(voiceSettings.provider);
  const generatedCount = allDialogueLines.filter((line) => line.audioUrl).length;

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

  const handleProviderChange = (provider: VoiceProvider, language: VoiceLanguage) => {
    updateVoiceSettings(project.id, { language, provider });
  };

  const handleDownloadAll = () => {
    // TODO: Implement download all
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 px-4">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 mb-4"
        >
          <Mic className="w-8 h-8 text-violet-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.voiceover.title')}</h2>
        <p className="text-muted-foreground">{t('steps.voiceover.description')}</p>
      </div>

      {/* Provider Selection & Controls */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-violet-400" />
            <span className="text-sm text-muted-foreground mr-2">TTS Provider:</span>
            {!isReadOnly ? (
              <ProviderSelector
                provider={voiceSettings.provider}
                onProviderChange={handleProviderChange}
              />
            ) : (
              <span className="text-sm font-medium">{voiceSettings.provider}</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!isReadOnly && (
              <VoiceSettingsDialog
                open={showVoiceSettings}
                onOpenChange={setShowVoiceSettings}
                characters={project.characters || []}
                voices={voices}
                onVoiceChange={handleVoiceChange}
              />
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              {volume[0] === 0 ? (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              )}
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="w-24"
              />
            </div>
          </div>
        </div>

        {/* Progress & Actions - only for editors */}
        {!isReadOnly && (
          <VoiceoverProgress
            generatedCount={generatedCount}
            totalCount={allDialogueLines.length}
            isGeneratingAll={isGeneratingAll}
            provider={voiceSettings.provider}
            onGenerateAll={handleGenerateAll}
            onDownloadAll={handleDownloadAll}
          />
        )}
      </div>

      {/* No dialogue warning */}
      {allDialogueLines.length === 0 && (
        <div className="glass rounded-xl p-6 border-l-4 border-amber-500 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">{t('steps.voiceover.noDialogue')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('steps.voiceover.noDialogueDescription')}
          </p>
        </div>
      )}

      {/* Dialogue Lines by Scene - 3 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(project.scenes || [])
          .filter((scene) => (scene.dialogue || []).length > 0)
          .map((scene, sceneIndex) => (
            <SceneDialogueCard
              key={scene.id}
              scene={scene}
              sceneIndex={sceneIndex}
              projectId={project.id}
              characters={project.characters || []}
              audioStates={audioStates}
              playingAudio={playingAudio}
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
              onDeletionRequested={fetchDeletionRequests}
              onUseRegenerationAttempt={handleUseRegenerationAttempt}
              onSelectRegeneration={handleSelectRegeneration}
            />
          ))}
      </div>
    </div>
  );
}
