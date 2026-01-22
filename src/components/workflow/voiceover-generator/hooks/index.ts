'use client';

import { useMemo, useState } from 'react';
import type { Project } from '@/types/project';
import { useApiKeys } from '@/hooks';
import type { DialogueLineWithScene } from '../types';
import { useAudioUIState } from './useAudioUIState';
import { useAudioGeneration } from './useAudioGeneration';
import { useAudioPlayback } from './useAudioPlayback';
import { useAudioManagement } from './useAudioManagement';
import { useVoiceoverBatchGeneration } from './useVoiceoverBatchGeneration';

// Re-export individual hooks for external use
export { useAudioUIState } from './useAudioUIState';
export { useAudioGeneration } from './useAudioGeneration';
export { useAudioPlayback } from './useAudioPlayback';
export { useAudioManagement } from './useAudioManagement';
export { useVoiceoverBatchGeneration } from './useVoiceoverBatchGeneration';

// Environment variable to control whether to use Inngest for TTS
const USE_INGEST_TTS = process.env.NEXT_PUBLIC_USE_INGEST_TTS === 'true';

export function useVoiceoverAudio(project: Project) {
  // UI State
  const uiState = useAudioUIState();

  // Get API keys for provider configuration
  const { data: apiKeys } = useApiKeys();

  // Safety check for scenes array (may be undefined in summary data)
  const allDialogueLines: DialogueLineWithScene[] = (project.scenes || []).flatMap((scene) =>
    (scene.dialogue || []).map((line) => ({
      ...line,
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneNumber: scene.number,
    }))
  );

  // Audio Generation - pass apiKeys for provider configuration
  const browserGeneration = useAudioGeneration({ project, apiKeys });

  // Inngest batch generation (new)
  const batchGeneration = useVoiceoverBatchGeneration(project, apiKeys?.voiceLanguage || 'en');

  // State to track which generation mode is active
  const [isUsingBatchGeneration, setIsUsingBatchGeneration] = useState(false);

  // Audio Playback
  const playback = useAudioPlayback(
    project,
    allDialogueLines,
    uiState.playingAudio,
    uiState.playingSceneId,
    uiState.scenePlaybackIndex,
    uiState.setPlayingAudio,
    uiState.setPlayingSceneId,
    uiState.setScenePlaybackIndex,
    uiState.audioRefs,
    uiState.safePlay
  );

  // Audio Management
  const management = useAudioManagement(
    project,
    allDialogueLines,
    uiState.audioRefs,
    uiState.playingAudio,
    uiState.setPlayingAudio,
    uiState.safePlay
  );

  // Calculate total characters for cost estimation
  const totalCharacters = useMemo(
    () => allDialogueLines.reduce((sum, line) => sum + line.text.length, 0),
    [allDialogueLines]
  );

  // Wrapper for generateAudioForLine - uses browser generation for single lines
  const generateAudioForLine = async (lineId: string, sceneId: string, skipCreditCheck?: boolean) => {
    // For single line generation, always use browser-based (faster for single items)
    return browserGeneration.generateAudioForLine(lineId, sceneId, uiState.setAudioStates, skipCreditCheck);
  };

  // Wrapper for handleGenerateAll - uses Inngest batch generation for multiple lines
  const handleGenerateAll = async (skipCreditCheck?: boolean) => {
    const linesWithoutAudio = allDialogueLines.filter(line => !line.audioUrl);

    if (linesWithoutAudio.length === 0) {
      return;
    }

    // For multiple lines, use Inngest batch generation
    if (linesWithoutAudio.length >= 2) {
      setIsUsingBatchGeneration(true);
      const result = await batchGeneration.generateVoiceovers(linesWithoutAudio);
      setIsUsingBatchGeneration(false);
      return result;
    }

    // For single line, use browser generation
    setIsUsingBatchGeneration(false);
    return browserGeneration.handleGenerateAll(
      allDialogueLines,
      uiState.abortRef,
      uiState.setAudioStates,
      () => {},
      skipCreditCheck
    );
  };

  // Wrapper for stopGeneratingAll
  const stopGeneratingAll = () => {
    if (isUsingBatchGeneration) {
      // Can't really stop Inngest jobs, but we can update UI state
      setIsUsingBatchGeneration(false);
    } else {
      browserGeneration.stopGeneratingAll(uiState.abortRef, () => {});
    }
  };

  return {
    // UI State
    audioStates: isUsingBatchGeneration ? batchGeneration.generatingAudio : uiState.audioStates,
    playingAudio: uiState.playingAudio,
    playingSceneId: uiState.playingSceneId,
    isGeneratingAll: batchGeneration.isProcessing || (batchGeneration.backgroundJobId !== null),
    allDialogueLines,
    totalCharacters,

    // Batch generation state (from Inngest)
    jobStatus: batchGeneration.jobStatus,
    batchProgress: batchGeneration.progress,

    // Audio Generation
    generateAudioForLine,
    handleGenerateAll,
    stopGeneratingAll,

    // Audio Playback
    togglePlay: playback.togglePlay,
    setAudioRef: playback.setAudioRef,
    handleAudioEnded: playback.handleAudioEnded,
    playAllSceneVoices: playback.playAllSceneVoices,
    stopScenePlayback: playback.stopScenePlayback,
    playAllDialogues: playback.playAllDialogues,

    // Audio Management
    deleteAudioForLine: management.deleteAudioForLine,
    deleteAllAudio: management.deleteAllAudio,
    selectVersion: management.selectVersion,
    switchAllToProvider: management.switchAllToProvider,
    getAvailableVersions: management.getAvailableVersions,
    downloadLine: management.downloadLine,
  };
}
