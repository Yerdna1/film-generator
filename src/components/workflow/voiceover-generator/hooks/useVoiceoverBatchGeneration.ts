'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import type { DialogueLineWithScene } from '../types';
import { toast } from '@/lib/toast';
import { getProviderDisplayName, getModelDisplayName, formatDuration } from '@/lib/llm/toast-utils';

interface VoiceoverGenerationJob {
  id: string;
  status: string;
  totalAudioLines: number;
  completedAudioLines: number;
  failedAudioLines: number;
  progress: number;
  errorDetails?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  audioProvider?: string;
  audioModel?: string;
}

type GeneratingAudioState = {
  [lineId: string]: boolean;
};

// Hook for voiceover batch generation using Inngest
export function useVoiceoverBatchGeneration(
  project: { id: string; scenes?: any[]; characters?: any[] },
  language: string = 'en'
) {
  const { updateScene } = useProjectStore();
  const { handleApiResponse } = useCredits();

  // Audio generation state
  const [generatingAudio, setGeneratingAudio] = useState<GeneratingAudioState>({});
  const [failedLines, setFailedLines] = useState<string[]>([]);

  // Background job state
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<VoiceoverGenerationJob | null>(null);
  const jobPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Start voiceover generation for specific dialogue lines using Inngest
  const generateVoiceovers = useCallback(async (dialogueLines: DialogueLineWithScene[]) => {
    if (dialogueLines.length === 0) return;

    // Update UI to show generating state
    const newGeneratingState: GeneratingAudioState = {};
    dialogueLines.forEach(line => {
      newGeneratingState[line.id] = true;
    });
    setGeneratingAudio(prev => ({ ...prev, ...newGeneratingState }));

    try {
      // Prepare audio lines for batch processing
      const audioLines = dialogueLines.map(line => {
        // Find the character to get their voiceId
        const character = project.characters?.find(c => c.id === line.characterId);
        return {
          lineId: line.id,
          sceneId: line.sceneId,
          sceneNumber: line.sceneNumber,
          text: line.text,
          characterId: line.characterId,
          voiceId: character?.voiceId || 'adam', // Default voice
        };
      });

      const response = await fetch('/api/voiceover/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          audioLines,
          language,
        }),
      });

      // Check response.ok FIRST before calling handleApiResponse
      if (!response.ok) {
        // Clear generating state on error
        dialogueLines.forEach(line => {
          setGeneratingAudio(prev => {
            const next = { ...prev };
            delete next[line.id];
            return next;
          });
        });

        // Parse error safely
        let errorMessage = 'Failed to start voiceover generation';
        try {
          const error = await response.json();
          if (error && typeof error === 'object') {
            errorMessage = error.error || error.message || errorMessage;
          }
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }

        // Show error toast
        toast.error('Failed to start voiceover generation', {
          description: errorMessage,
        });

        return false;
      }

      // Only call handleApiResponse for successful responses
      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        // Clear generating state on error
        dialogueLines.forEach(line => {
          setGeneratingAudio(prev => {
            const next = { ...prev };
            delete next[line.id];
            return next;
          });
        });
        return 'insufficient_credits';
      }

      const data = await response.json();
      const jobId = data.jobId;

      if (!jobId) {
        throw new Error('No job ID returned from server');
      }

      setBackgroundJobId(jobId);

      // Start polling immediately
      pollJobStatus(jobId);

      // Show toast for batch generation
      if (audioLines.length === 1) {
        console.log(`[Voiceover Generation] Started job ${jobId} for single line`);
      } else {
        toast.info(`Started generating ${audioLines.length} voiceovers`, {
          description: 'Progress will be shown below.',
        });
      }

      return true;

    } catch (error) {
      console.error('Error starting voiceover generation:', error);
      toast.error('Failed to start voiceover generation', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clear generating state on error
      dialogueLines.forEach(line => {
        setGeneratingAudio(prev => {
          const next = { ...prev };
          delete next[line.id];
          return next;
        });
      });

      return false;
    }
  }, [project.id, language, handleApiResponse]);

  // Generate voiceovers for all dialogue lines without audio
  const handleGenerateAllVoiceovers = useCallback(async () => {
    // Collect all dialogue lines from all scenes
    const allDialogueLines: DialogueLineWithScene[] = [];
    (project.scenes || []).forEach(scene => {
      const dialogue = scene.dialogue || [];
      dialogue.forEach((line: any) => {
        if (!line.audioUrl) {
          allDialogueLines.push({
            id: line.id,
            sceneId: scene.id,
            sceneTitle: scene.title,
            sceneNumber: scene.number,
            text: line.text,
            characterId: line.characterId,
            characterName: line.characterName,
          });
        }
      });
    });

    if (allDialogueLines.length === 0) {
      toast.info('All dialogue lines already have voiceovers');
      return;
    }

    await generateVoiceovers(allDialogueLines);
  }, [project.scenes, generateVoiceovers]);

  // Generate batch of voiceovers
  const handleGenerateBatch = useCallback(async (batchSize: number) => {
    // Collect all dialogue lines without audio
    const allDialogueLines: DialogueLineWithScene[] = [];
    (project.scenes || []).forEach(scene => {
      const dialogue = scene.dialogue || [];
      dialogue.forEach((line: any) => {
        if (!line.audioUrl) {
          allDialogueLines.push({
            id: line.id,
            sceneId: scene.id,
            sceneTitle: scene.title,
            sceneNumber: scene.number,
            text: line.text,
            characterId: line.characterId,
            characterName: line.characterName,
          });
        }
      });
    });

    const batchLines = allDialogueLines.slice(0, batchSize);

    if (batchLines.length === 0) {
      toast.info('All dialogue lines already have voiceovers');
      return;
    }

    await generateVoiceovers(batchLines);
  }, [project.scenes, generateVoiceovers]);

  // Regenerate selected dialogue lines
  const handleRegenerateSelected = useCallback(async (selectedLines: Set<string>) => {
    const dialogueLines: DialogueLineWithScene[] = [];
    (project.scenes || []).forEach(scene => {
      const dialogue = scene.dialogue || [];
      dialogue.forEach((line: any) => {
        if (selectedLines.has(line.id)) {
          dialogueLines.push({
            id: line.id,
            sceneId: scene.id,
            sceneTitle: scene.title,
            sceneNumber: scene.number,
            text: line.text,
            characterId: line.characterId,
            characterName: line.characterName,
          });
        }
      });
    });

    if (dialogueLines.length === 0) return;

    await generateVoiceovers(dialogueLines);
  }, [project.scenes, generateVoiceovers]);

  // Regenerate all voiceovers
  const handleRegenerateAllVoiceovers = useCallback(async () => {
    const allDialogueLines: DialogueLineWithScene[] = [];
    (project.scenes || []).forEach(scene => {
      const dialogue = scene.dialogue || [];
      dialogue.forEach((line: any) => {
        allDialogueLines.push({
          id: line.id,
          sceneId: scene.id,
          sceneTitle: scene.title,
          sceneNumber: scene.number,
          text: line.text,
          characterId: line.characterId,
          characterName: line.characterName,
        });
      });
    });

    if (allDialogueLines.length === 0) return;

    const confirmRegenerate = window.confirm(
      `This will regenerate ALL ${allDialogueLines.length} voiceovers. Are you sure?`
    );
    if (!confirmRegenerate) return;

    await generateVoiceovers(allDialogueLines);
  }, [project.scenes, generateVoiceovers]);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    // Clear any existing polling
    if (jobPollingIntervalRef.current) {
      clearInterval(jobPollingIntervalRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/voiceover/generate-batch?jobId=${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch job status');

        const job = await response.json() as VoiceoverGenerationJob;
        setJobStatus(job);

        // Update generating state based on job progress
        if (job.status === 'processing') {
          // Show loading toast with provider/model info if not already shown
          if (!toastIdRef.current && job.audioProvider && job.audioModel) {
            const providerDisplay = getProviderDisplayName(job.audioProvider);
            const modelDisplay = getModelDisplayName(job.audioModel);

            toastIdRef.current = toast.loading('Generating voiceovers...', {
              description: `${providerDisplay} ${modelDisplay}`,
            });
          }
        } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'completed_with_errors') {
          // Clear all generating states
          setGeneratingAudio({});

          // Clear polling
          if (jobPollingIntervalRef.current) {
            clearInterval(jobPollingIntervalRef.current);
            jobPollingIntervalRef.current = null;
          }

          // Clear job ID
          setBackgroundJobId(null);

          // Calculate duration
          let duration = null;
          if (job.startedAt && job.completedAt) {
            const startTime = new Date(job.startedAt).getTime();
            const endTime = new Date(job.completedAt).getTime();
            duration = endTime - startTime;
          }

          // Show completion toast with provider/model/duration
          if (toastIdRef.current) {
            const providerDisplay = job.audioProvider ? getProviderDisplayName(job.audioProvider) : 'Provider';
            const modelDisplay = job.audioModel ? getModelDisplayName(job.audioModel) : 'Model';
            const durationFormatted = duration ? formatDuration(duration) : null;

            let description = `${providerDisplay} ${modelDisplay}`;
            if (durationFormatted) {
              description += ` • ${durationFormatted}`;
            }

            if (job.status === 'completed') {
              toast.success('Voiceovers generated!', {
                id: toastIdRef.current,
                description,
              });
            } else if (job.status === 'completed_with_errors') {
              // Parse error details to get the first meaningful error message
              let firstError = 'Some voiceovers failed to generate';
              if (job.errorDetails) {
                try {
                  const errors = JSON.parse(job.errorDetails);
                  if (Array.isArray(errors) && errors.length > 0 && errors[0]?.error) {
                    firstError = errors[0].error;
                  }
                } catch (e) {
                  console.error('Failed to parse errorDetails:', e);
                }
              }

              toast.warning('Generation completed with errors', {
                id: toastIdRef.current,
                description: `${job.failedAudioLines || 0} failed: ${firstError}`,
              });
            } else if (job.status === 'failed') {
              // Parse error details to get the first meaningful error message
              let errorMessage = job.errorDetails || 'Unknown error';
              if (job.errorDetails) {
                try {
                  const errors = JSON.parse(job.errorDetails);
                  if (Array.isArray(errors) && errors.length > 0 && errors[0]?.error) {
                    errorMessage = errors[0].error;
                  }
                } catch (e) {
                  console.error('Failed to parse errorDetails:', e);
                }
              }

              toast.error('Voiceover generation failed', {
                id: toastIdRef.current,
                description: errorMessage,
              });
            }
            toastIdRef.current = null;
          }

          // Refresh the page to show updated voiceovers
          if (job.status === 'completed' || job.status === 'completed_with_errors') {
            setTimeout(() => {
              window.location.reload();
            }, 2000); // Wait 2 seconds to let user see the toast
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    // Poll immediately
    poll();

    // Then poll every 2 seconds
    jobPollingIntervalRef.current = setInterval(poll, 2000);
  }, []);

  // Start polling if we have a job ID
  const startPolling = useCallback((jobId: string) => {
    setBackgroundJobId(jobId);
    pollJobStatus(jobId);
  }, [pollJobStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (jobPollingIntervalRef.current) {
        clearInterval(jobPollingIntervalRef.current);
      }
      // Dismiss toast on unmount
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

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
