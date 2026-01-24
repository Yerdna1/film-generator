// Music generation with polling logic

import { useState, useCallback, useEffect, useRef } from 'react';
import type { MusicProvider } from '@/types/project';
import type { SunoModel, UseBackgroundMusicProps } from './types';
import { POLL_INTERVAL } from './constants';

export interface GenerationState {
  isGenerating: boolean;
  taskId: string | null;
  status: 'idle' | 'processing' | 'complete' | 'error';
  progress: number;
  error: string | null;
  provider?: MusicProvider;
}

export interface UseMusicGenerationReturn {
  generationState: GenerationState;
  generateMusic: (prompt: string, instrumental: boolean, provider: MusicProvider, projectId: string, onPreviewUrl: (url: string) => void) => Promise<void>;
  cancelGeneration: () => void;
  clearGenerationState: () => void;
}

export function useMusicGeneration(): UseMusicGenerationReturn {
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    taskId: null,
    status: 'idle',
    progress: 0,
    error: null,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const providerRef = useRef<MusicProvider | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const generateMusic = useCallback(async (
    prompt: string,
    instrumental: boolean,
    provider: MusicProvider,
    projectId: string,
    onPreviewUrl: (url: string) => void
  ) => {
    if (!prompt.trim()) return;

    providerRef.current = provider;
    setGenerationState({
      isGenerating: true,
      taskId: null,
      status: 'processing',
      progress: 0,
      error: null,
      provider,
    });

    abortControllerRef.current = new AbortController();

    try {
      // Start generation - use Inngest batch API
      const response = await fetch('/api/music/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          instrumental,
          title: `Generated: ${prompt.slice(0, 50)}...`,
          projectId,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start music generation');
      }

      const jobId = data.jobId;
      setGenerationState(prev => ({ ...prev, taskId: jobId, progress: 10 }));

      // Start polling for job status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `/api/music/generate-batch?jobId=${jobId}`,
            { signal: abortControllerRef.current?.signal }
          );
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed') {
            // Clear polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            onPreviewUrl(statusData.audioUrl);
            setGenerationState({
              isGenerating: false,
              taskId: jobId,
              status: 'complete',
              progress: 100,
              error: null,
              provider: statusData.musicProvider || provider,
            });
          } else if (statusData.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            setGenerationState({
              isGenerating: false,
              taskId: jobId,
              status: 'error',
              progress: 0,
              error: statusData.errorDetails || 'Music generation failed',
              provider: statusData.musicProvider || provider,
            });
          } else {
            // Still processing - update progress from job
            setGenerationState(prev => ({
              ...prev,
              progress: statusData.progress || prev.progress,
            }));
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            return; // Cancelled
          }
          console.error('Status poll error:', err);
        }
      }, POLL_INTERVAL);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Cancelled
      }

      setGenerationState({
        isGenerating: false,
        taskId: null,
        status: 'error',
        progress: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
        provider: providerRef.current || provider,
      });
    }
  }, []);

  const cancelGeneration = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setGenerationState({
      isGenerating: false,
      taskId: null,
      status: 'idle',
      progress: 0,
      error: null,
    });
  }, []);

  const clearGenerationState = useCallback(() => {
    setGenerationState({
      isGenerating: false,
      taskId: null,
      status: 'idle',
      progress: 0,
      error: null,
    });
  }, []);

  return {
    generationState,
    generateMusic,
    cancelGeneration,
    clearGenerationState,
  };
}
