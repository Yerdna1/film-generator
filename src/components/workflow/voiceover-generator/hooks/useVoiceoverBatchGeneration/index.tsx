'use client';

import { useState, useCallback } from 'react';
import { useCredits } from '@/contexts/CreditsContext';
import { toast } from '@/lib/toast';
import type { DialogueLineWithScene } from '../../types';
import type { VoiceoverGenerationJob, GeneratingAudioState } from './types';
import { validateAndNotifyVoices } from './validation';
import {
  collectLinesWithoutAudio,
  collectAllDialogueLines,
  collectSelectedDialogueLines,
  collectDialogueBatch,
} from './dialogue-collector';
import { startVoiceoverGeneration } from './api-client';
import { useJobPolling } from './job-polling';

// Hook for voiceover batch generation using Inngest
export function useVoiceoverBatchGeneration(
  project: { id: string; scenes?: any[]; characters?: any[] },
  language: string = 'en'
) {
  const { handleApiResponse } = useCredits();

  // Audio generation state
  const [generatingAudio, setGeneratingAudio] = useState<GeneratingAudioState>({});
  const [failedLines, setFailedLines] = useState<string[]>([]);

  // Background job state
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<VoiceoverGenerationJob | null>(null);

  // Helper to set generating state for specific lines
  const setGenerating = useCallback((lineIds: string[]) => {
    const newState: GeneratingAudioState = {};
    lineIds.forEach(id => {
      newState[id] = true;
    });
    setGeneratingAudio(prev => ({ ...prev, ...newState }));
  }, []);

  // Helper to clear generating state for specific lines
  const clearGenerating = useCallback((lineIds: string[]) => {
    setGeneratingAudio(prev => {
      const next = { ...prev };
      lineIds.forEach(id => {
        delete next[id];
      });
      return next;
    });
  }, []);

  // Clear all generating state
  const clearAllGenerating = useCallback(() => {
    setGeneratingAudio({});
  }, []);

  // Handle insufficient credits
  const handleInsufficientCredits = useCallback((lineIds: string[]) => {
    clearGenerating(lineIds);
  }, [clearGenerating]);

  // Start voiceover generation for specific dialogue lines using Inngest
  const generateVoiceovers = useCallback(async (dialogueLines: DialogueLineWithScene[]) => {
    if (dialogueLines.length === 0) return false;

    // Validate that all characters have voices assigned
    const isValid = validateAndNotifyVoices(dialogueLines, project.characters);
    if (!isValid) {
      return false;
    }

    // Start generation via API
    const result = await startVoiceoverGeneration(dialogueLines, {
      projectId: project.id,
      language,
      characters: project.characters,
      onSetGenerating: setGenerating,
      onClearGenerating: clearGenerating,
    });

    // Handle credits check
    if (result.success && result.jobId) {
      const response = await fetch('/api/voiceover/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          audioLines: [],
          language,
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response.clone());
      if (isInsufficientCredits) {
        handleInsufficientCredits(dialogueLines.map(l => l.id));
        return 'insufficient_credits';
      }
    }

    if (result.success && result.jobId) {
      setBackgroundJobId(result.jobId);
      startPolling(result.jobId);
    }

    return result.success;
  }, [project.id, project.characters, language, handleApiResponse, setGenerating, clearGenerating, handleInsufficientCredits]);

  // Generate voiceovers for all dialogue lines without audio
  const handleGenerateAllVoiceovers = useCallback(async () => {
    const allDialogueLines = collectLinesWithoutAudio(project.scenes);

    if (allDialogueLines.length === 0) {
      toast.info('All dialogue lines already have voiceovers');
      return;
    }

    await generateVoiceovers(allDialogueLines);
  }, [project.scenes, generateVoiceovers]);

  // Generate batch of voiceovers
  const handleGenerateBatch = useCallback(async (batchSize: number) => {
    const batchLines = collectDialogueBatch(project.scenes, batchSize);

    if (batchLines.length === 0) {
      toast.info('All dialogue lines already have voiceovers');
      return;
    }

    await generateVoiceovers(batchLines);
  }, [project.scenes, generateVoiceovers]);

  // Regenerate selected dialogue lines
  const handleRegenerateSelected = useCallback(async (selectedLines: Set<string>) => {
    const dialogueLines = collectSelectedDialogueLines(project.scenes, selectedLines);

    if (dialogueLines.length === 0) return;

    await generateVoiceovers(dialogueLines);
  }, [project.scenes, generateVoiceovers]);

  // Regenerate all voiceovers
  const handleRegenerateAllVoiceovers = useCallback(async () => {
    const allDialogueLines = collectAllDialogueLines(project.scenes);

    if (allDialogueLines.length === 0) return;

    const confirmRegenerate = window.confirm(
      `This will regenerate ALL ${allDialogueLines.length} voiceovers. Are you sure?`
    );
    if (!confirmRegenerate) return;

    await generateVoiceovers(allDialogueLines);
  }, [project.scenes, generateVoiceovers]);

  // Setup job polling
  const { pollJobStatus, startPolling } = useJobPolling({
    onJobStatusChange: setJobStatus,
    onPollStart: (jobId) => setBackgroundJobId(jobId),
    onPollEnd: () => {
      clearAllGenerating();
      setBackgroundJobId(null);
    },
  });

  return {
    // State
    generatingAudio,
    failedLines,
    jobStatus,
    backgroundJobId,

    // Actions
    generateVoiceovers,
    handleGenerateAllVoiceovers,
    handleGenerateBatch,
    handleRegenerateSelected,
    handleRegenerateAllVoiceovers,
    startPolling,

    // Utilities
    isProcessing: jobStatus?.status === 'processing',
    isCompleted: jobStatus?.status === 'completed' || jobStatus?.status === 'completed_with_errors',
    progress: jobStatus?.progress || 0,
  };
}

// Re-export types for external use
export type { VoiceoverGenerationJob, GeneratingAudioState, AudioLineRequest } from './types';
