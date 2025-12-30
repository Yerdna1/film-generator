'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, BackgroundMusic } from '@/types/project';

export type SunoModel = 'V4' | 'V4.5' | 'V4.5ALL' | 'V4.5PLUS' | 'V5';

export interface GenerationState {
  isGenerating: boolean;
  taskId: string | null;
  status: 'idle' | 'processing' | 'complete' | 'error';
  progress: number;
  error: string | null;
}

export interface UseBackgroundMusicReturn {
  // Current music
  currentMusic: BackgroundMusic | null;
  hasMusic: boolean;

  // Generation state
  generationState: GenerationState;

  // Preview state
  previewUrl: string | null;
  isPreviewPlaying: boolean;
  previewRef: React.RefObject<HTMLAudioElement | null>;

  // Form state
  prompt: string;
  setPrompt: (prompt: string) => void;
  model: SunoModel;
  setModel: (model: SunoModel) => void;
  instrumental: boolean;
  setInstrumental: (instrumental: boolean) => void;

  // Actions
  generateMusic: () => Promise<void>;
  cancelGeneration: () => void;
  applyPreviewToProject: () => void;
  removeMusic: () => void;
  uploadMusic: (file: File) => Promise<void>;
  togglePreview: () => void;
  clearPreview: () => void;
}

const POLL_INTERVAL = 3000; // 3 seconds

export function useBackgroundMusic(project: Project): UseBackgroundMusicReturn {
  const { updateProject } = useProjectStore();

  // Form state
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<SunoModel>('V4.5');
  const [instrumental, setInstrumental] = useState(true);

  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    taskId: null,
    status: 'idle',
    progress: 0,
    error: null,
  });

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentMusic = project.backgroundMusic || null;
  const hasMusic = !!currentMusic;

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

  const generateMusic = useCallback(async () => {
    if (!prompt.trim()) return;

    setGenerationState({
      isGenerating: true,
      taskId: null,
      status: 'processing',
      progress: 0,
      error: null,
    });

    abortControllerRef.current = new AbortController();

    try {
      // Start generation
      const response = await fetch('/api/suno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          instrumental,
          projectId: project.id,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start music generation');
      }

      const taskId = data.taskId;
      setGenerationState(prev => ({ ...prev, taskId, progress: 10 }));

      // Start polling for status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `/api/suno?taskId=${taskId}&projectId=${project.id}`,
            { signal: abortControllerRef.current?.signal }
          );
          const statusData = await statusResponse.json();

          if (statusData.status === 'complete') {
            // Clear polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            setPreviewUrl(statusData.audioUrl);
            setGenerationState({
              isGenerating: false,
              taskId,
              status: 'complete',
              progress: 100,
              error: null,
            });
          } else if (statusData.status === 'error') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            setGenerationState({
              isGenerating: false,
              taskId,
              status: 'error',
              progress: 0,
              error: statusData.error || 'Music generation failed',
            });
          } else {
            // Still processing - increment progress
            setGenerationState(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 5, 90),
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
      });
    }
  }, [prompt, model, instrumental, project.id]);

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

  const applyPreviewToProject = useCallback(() => {
    if (!previewUrl) return;

    const newMusic: BackgroundMusic = {
      id: uuidv4(),
      title: `Generated: ${prompt.slice(0, 50)}...`,
      audioUrl: previewUrl,
      duration: 0, // Will be set when audio loads
      volume: 0.3,
      source: 'suno',
      sunoPrompt: prompt,
    };

    updateProject(project.id, { backgroundMusic: newMusic });
    setPreviewUrl(null);
    setIsPreviewPlaying(false);
    setPrompt('');
    setGenerationState({
      isGenerating: false,
      taskId: null,
      status: 'idle',
      progress: 0,
      error: null,
    });
  }, [previewUrl, prompt, project.id, updateProject]);

  const removeMusic = useCallback(() => {
    updateProject(project.id, { backgroundMusic: undefined, musicVolume: undefined });
  }, [project.id, updateProject]);

  const uploadMusic = useCallback(async (file: File) => {
    try {
      const reader = new FileReader();

      const audioUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Create audio element to get duration
      const audio = new Audio(audioUrl);
      const duration = await new Promise<number>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
        audio.addEventListener('error', () => {
          resolve(0);
        });
      });

      const newMusic: BackgroundMusic = {
        id: uuidv4(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        audioUrl,
        duration,
        volume: 0.3,
        source: 'upload',
      };

      updateProject(project.id, { backgroundMusic: newMusic });
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  }, [project.id, updateProject]);

  const togglePreview = useCallback(() => {
    if (!previewRef.current) return;

    if (isPreviewPlaying) {
      previewRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewRef.current.play();
      setIsPreviewPlaying(true);
    }
  }, [isPreviewPlaying]);

  const clearPreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.pause();
    }
    setPreviewUrl(null);
    setIsPreviewPlaying(false);
    setGenerationState({
      isGenerating: false,
      taskId: null,
      status: 'idle',
      progress: 0,
      error: null,
    });
  }, []);

  return {
    currentMusic,
    hasMusic,
    generationState,
    previewUrl,
    isPreviewPlaying,
    previewRef,
    prompt,
    setPrompt,
    model,
    setModel,
    instrumental,
    setInstrumental,
    generateMusic,
    cancelGeneration,
    applyPreviewToProject,
    removeMusic,
    uploadMusic,
    togglePreview,
    clearPreview,
  };
}
