'use client';

import { useMemo } from 'react';
import type { Project } from '@/types/project';
import type { DialogueLineWithScene } from '../types';
import { useAudioUIState } from './useAudioUIState';
import { useAudioGeneration } from './useAudioGeneration';
import { useAudioPlayback } from './useAudioPlayback';
import { useAudioManagement } from './useAudioManagement';

export function useVoiceoverAudio(project: Project) {
  // UI State
  const uiState = useAudioUIState();

  // Safety check for scenes array (may be undefined in summary data)
  const allDialogueLines: DialogueLineWithScene[] = (project.scenes || []).flatMap((scene) =>
    (scene.dialogue || []).map((line) => ({
      ...line,
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneNumber: scene.number,
    }))
  );

  // Audio Generation
  const generation = useAudioGeneration(project);

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

  return {
    // UI State
    audioStates: uiState.audioStates,
    playingAudio: uiState.playingAudio,
    playingSceneId: uiState.playingSceneId,
    isGeneratingAll: false, // Will be set by handleGenerateAll
    allDialogueLines,
    totalCharacters,

    // Audio Generation
    generateAudioForLine: (lineId: string, sceneId: string, skipCreditCheck?: boolean) =>
      generation.generateAudioForLine(lineId, sceneId, uiState.setAudioStates, skipCreditCheck),
    handleGenerateAll: (skipCreditCheck?: boolean) =>
      generation.handleGenerateAll(allDialogueLines, uiState.abortRef, uiState.setAudioStates, () => {/* setIsGeneratingAll handled inline */}, skipCreditCheck),
    stopGeneratingAll: () =>
      generation.stopGeneratingAll(uiState.abortRef, () => {/* setIsGeneratingAll handled inline */}),

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
