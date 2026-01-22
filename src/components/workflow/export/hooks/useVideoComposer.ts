'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Project, TransitionType } from '@/types/project';

export type OutputFormat = 'mp4' | 'draft' | 'both';
export type Resolution = 'sd' | 'hd' | '4k';
export type CaptionFontSize = 'small' | 'medium' | 'large';
export type CaptionPosition = 'top' | 'center' | 'bottom';
export type TransitionStyle = 'fade' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'zoomOut' | 'wipe' | 'none';

export interface CaptionStyle {
  fontSize: CaptionFontSize;
  fontColor: string;
  bgColor: string;
  bgAlpha: number;
  position: CaptionPosition;
  shadow: boolean;
}

export interface AudioSettings {
  musicVolume: number;
  fadeIn: number;
  fadeOut: number;
}

export interface CompositionState {
  isComposing: boolean;
  jobId: string | null;
  status: 'idle' | 'processing' | 'complete' | 'error';
  progress: number;
  phase: string | null;
  error: string | null;
}

export interface CompositionResult {
  videoUrl: string | null;
  videoBase64: string | null;
  draftUrl: string | null;
  draftBase64: string | null;
  srtContent: string | null;
  duration: number;
  fileSize: number;
}

export interface CompositionOptions {
  outputFormat: OutputFormat;
  resolution: Resolution;
  includeCaptions: boolean;
  includeMusic: boolean;
  includeVoiceovers: boolean;  // Include dialogue voiceovers from scenes
  replaceVideoAudio: boolean;  // Strip original video audio, use only voiceovers
  aiTransitions: boolean;
  // Caption styling
  captionStyle: CaptionStyle;
  // Transition settings
  transitionStyle: TransitionStyle;
  transitionDuration: number;
  // Audio settings
  audioSettings: AudioSettings;
  // Video effects
  kenBurnsEffect: boolean;
}

export interface CostEstimate {
  credits: number;
  realCost: number;
  breakdown: {
    scenes: number;
    music: number;
    captions: number;
    resolution: number;
  };
}

export interface UseVideoComposerReturn {
  // Composition state
  compositionState: CompositionState;
  result: CompositionResult | null;

  // Options
  options: CompositionOptions;
  setOutputFormat: (format: OutputFormat) => void;
  setResolution: (resolution: Resolution) => void;
  setIncludeCaptions: (include: boolean) => void;
  setIncludeMusic: (include: boolean) => void;
  setIncludeVoiceovers: (include: boolean) => void;
  setReplaceVideoAudio: (replace: boolean) => void;
  setAiTransitions: (enable: boolean) => void;
  // Caption styling
  setCaptionStyle: (style: Partial<CaptionStyle>) => void;
  // Transition settings
  setTransitionStyle: (style: TransitionStyle) => void;
  setTransitionDuration: (duration: number) => void;
  // Audio settings
  setAudioSettings: (settings: Partial<AudioSettings>) => void;
  // Video effects
  setKenBurnsEffect: (enable: boolean) => void;

  // AI Transitions
  suggestedTransitions: Record<string, TransitionType>;
  isLoadingTransitions: boolean;
  suggestTransitions: () => Promise<void>;
  applyTransitions: (transitions: Record<string, TransitionType>) => void;

  // Actions
  startComposition: () => Promise<void>;
  cancelComposition: () => void;
  downloadResult: (type: 'video' | 'draft' | 'srt') => void;
  isDownloading: boolean;

  // Cost estimation
  estimatedCost: CostEstimate;

  // Capabilities
  canCompose: boolean;
  hasEndpoint: boolean;
}

const POLL_INTERVAL = 3000; // 3 seconds

// Default values
const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontSize: 'medium',
  fontColor: '#FFFFFF',
  bgColor: '#000000',
  bgAlpha: 0.7,
  position: 'bottom',
  shadow: true,
};

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.3,
  fadeIn: 2.0,
  fadeOut: 2.0,
};

export function useVideoComposer(project: Project): UseVideoComposerReturn {
  // Safe accessor for scenes array
  const scenes = project.scenes || [];

  // Options state
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('both');
  const [resolution, setResolution] = useState<Resolution>('hd');
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const [includeMusic, setIncludeMusic] = useState(true);
  const [includeVoiceovers, setIncludeVoiceovers] = useState(true);
  const [replaceVideoAudio, setReplaceVideoAudio] = useState(false);
  const [aiTransitions, setAiTransitions] = useState(false);

  // Caption styling
  const [captionStyle, setCaptionStyleState] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);

  // Transition settings
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('fade');
  const [transitionDuration, setTransitionDuration] = useState(1.0);

  // Audio settings
  const [audioSettings, setAudioSettingsState] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);

  // Video effects
  const [kenBurnsEffect, setKenBurnsEffect] = useState(true);

  // Setters for partial updates
  const setCaptionStyle = useCallback((style: Partial<CaptionStyle>) => {
    setCaptionStyleState(prev => ({ ...prev, ...style }));
  }, []);

  const setAudioSettings = useCallback((settings: Partial<AudioSettings>) => {
    setAudioSettingsState(prev => ({ ...prev, ...settings }));
  }, []);

  // Composition state
  const [compositionState, setCompositionState] = useState<CompositionState>({
    isComposing: false,
    jobId: null,
    status: 'idle',
    progress: 0,
    phase: null,
    error: null,
  });

  // Result state - initialize from project if available
  const [result, setResult] = useState<CompositionResult | null>(null);

  // Load existing rendered video on mount
  useEffect(() => {
    // First check project fields
    if (project.renderedVideoUrl || project.renderedDraftUrl) {
      setResult({
        videoUrl: project.renderedVideoUrl || null,
        videoBase64: null,
        draftUrl: project.renderedDraftUrl || null,
        draftBase64: null,
        srtContent: null,
        duration: 0,
        fileSize: 0,
      });
      return;
    }

    // Also check for completed composition job
    const checkExistingJob = async () => {
      try {
        const response = await fetch(`/api/video/compose?projectId=${project.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'complete' && (data.videoUrl || data.draftUrl)) {
            setResult({
              videoUrl: data.videoUrl || null,
              videoBase64: null,
              draftUrl: data.draftUrl || null,
              draftBase64: null,
              srtContent: null,
              duration: data.duration || 0,
              fileSize: data.fileSize || 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to check existing composition job:', error);
      }
    };
    checkExistingJob();
  }, [project.id, project.renderedVideoUrl, project.renderedDraftUrl]);

  // AI Transitions state
  const [suggestedTransitions, setSuggestedTransitions] = useState<Record<string, TransitionType>>({});
  const [isLoadingTransitions, setIsLoadingTransitions] = useState(false);

  // Endpoint availability
  const [hasEndpoint, setHasEndpoint] = useState(false);

  // Refs
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if endpoint is configured (public endpoint, works for authenticated and unauthenticated users)
  useEffect(() => {
    const checkEndpoint = async () => {
      try {
        const response = await fetch('/api/video/compose/check-endpoint');
        if (response.ok) {
          const data = await response.json();
          setHasEndpoint(!!data.hasEndpoint);
        }
      } catch {
        setHasEndpoint(false);
      }
    };
    checkEndpoint();
  }, []);

  // Cleanup on unmount
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

  // Calculate cost estimate
  const estimatedCost: CostEstimate = {
    credits: 0,
    realCost: 0,
    breakdown: {
      scenes: 0,
      music: 0,
      captions: 0,
      resolution: 1,
    },
  };

  const sceneCount = scenes.length;
  const captionCount = scenes.reduce((sum, s) => sum + (s.captions?.length || 0), 0);
  const hasMusic = !!project.backgroundMusic;

  // Base cost per scene
  estimatedCost.breakdown.scenes = sceneCount * 5;
  estimatedCost.credits = estimatedCost.breakdown.scenes;
  estimatedCost.realCost = sceneCount * 0.03;

  // Music overlay
  if (includeMusic && hasMusic) {
    estimatedCost.breakdown.music = 2;
    estimatedCost.credits += 2;
    estimatedCost.realCost += 0.02;
  }

  // Caption burn-in
  if (includeCaptions && captionCount > 0) {
    estimatedCost.breakdown.captions = Math.ceil(captionCount / 10);
    estimatedCost.credits += estimatedCost.breakdown.captions;
    estimatedCost.realCost += captionCount * 0.001;
  }

  // 4K resolution multiplier
  if (resolution === '4k') {
    estimatedCost.breakdown.resolution = 2;
    estimatedCost.credits *= 2;
    estimatedCost.realCost *= 1.5;
  }

  // Check if composition is possible
  const canCompose = sceneCount > 0 &&
    scenes.some(s => s.videoUrl || s.imageUrl) &&
    hasEndpoint;

  // Suggest AI transitions
  const suggestTransitions = useCallback(async () => {
    if (sceneCount < 2) return;

    setIsLoadingTransitions(true);
    try {
      const response = await fetch('/api/video/compose/suggest-transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          scenes: scenes.map(s => ({
            id: s.id,
            title: s.title,
            description: s.description,
            cameraShot: s.cameraShot,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const transitions: Record<string, TransitionType> = {};
        for (const suggestion of data.transitions || []) {
          transitions[suggestion.fromSceneId] = suggestion.type as TransitionType;
        }
        setSuggestedTransitions(transitions);
      }
    } catch (error) {
      console.error('Failed to suggest transitions:', error);
    } finally {
      setIsLoadingTransitions(false);
    }
  }, [project.id, scenes, sceneCount]);

  // Apply transitions to scenes
  const applyTransitions = useCallback((transitions: Record<string, TransitionType>) => {
    setSuggestedTransitions(transitions);
  }, []);

  // Poll for job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/video/compose?jobId=${jobId}`, {
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to check job status');
      }

      const data = await response.json();

      setCompositionState(prev => ({
        ...prev,
        status: data.status,
        progress: data.progress || 0,
        phase: data.phase,
        error: data.error,
      }));

      if (data.status === 'complete') {
        setResult({
          videoUrl: data.videoUrl,
          videoBase64: null,
          draftUrl: data.draftUrl,
          draftBase64: null,
          srtContent: data.srtContent,
          duration: data.duration || 0,
          fileSize: data.fileSize || 0,
        });

        setCompositionState(prev => ({
          ...prev,
          isComposing: false,
        }));

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else if (data.status === 'error') {
        setCompositionState(prev => ({
          ...prev,
          isComposing: false,
          error: data.error || 'Composition failed',
        }));

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Poll error:', error);
      }
    }
  }, []);

  // Start composition
  const startComposition = useCallback(async () => {
    if (!canCompose) return;

    setCompositionState({
      isComposing: true,
      jobId: null,
      status: 'processing',
      progress: 0,
      phase: 'Starting...',
      error: null,
    });
    setResult(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/video/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          outputFormat,
          resolution,
          includeCaptions,
          includeMusic: includeMusic && hasMusic,
          includeVoiceovers,
          replaceVideoAudio,
          aiTransitions,
          transitions: aiTransitions ? suggestedTransitions : undefined,
          // New VectCutAPI options
          captionStyle,
          transitionStyle,
          transitionDuration,
          audioSettings,
          kenBurnsEffect,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start composition');
      }

      if (data.status === 'complete') {
        // Immediate completion (synchronous processing)
        setResult({
          videoUrl: data.videoUrl,
          videoBase64: data.videoBase64,
          draftUrl: data.draftUrl,
          draftBase64: data.draftBase64,
          srtContent: data.srtContent,
          duration: data.duration || 0,
          fileSize: data.fileSize || 0,
        });
        setCompositionState({
          isComposing: false,
          jobId: data.jobId,
          status: 'complete',
          progress: 100,
          phase: 'Complete',
          error: null,
        });
      } else if (data.status === 'error') {
        throw new Error(data.error || 'Composition failed');
      } else {
        // Async processing - start polling
        setCompositionState(prev => ({
          ...prev,
          jobId: data.jobId,
          phase: 'Processing...',
        }));

        pollIntervalRef.current = setInterval(() => {
          pollJobStatus(data.jobId);
        }, POLL_INTERVAL);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setCompositionState(prev => ({
          ...prev,
          isComposing: false,
          status: 'error',
          error: (error as Error).message,
        }));
      }
    }
  }, [
    canCompose, project.id, outputFormat, resolution, includeCaptions,
    includeMusic, hasMusic, includeVoiceovers, replaceVideoAudio,
    aiTransitions, suggestedTransitions, pollJobStatus,
    captionStyle, transitionStyle, transitionDuration, audioSettings, kenBurnsEffect
  ]);

  // Cancel composition
  const cancelComposition = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setCompositionState({
      isComposing: false,
      jobId: null,
      status: 'idle',
      progress: 0,
      phase: null,
      error: null,
    });
  }, []);

  // Download state for UI feedback
  const [isDownloading, setIsDownloading] = useState(false);

  // Download result
  const downloadResult = useCallback(async (type: 'video' | 'draft' | 'srt') => {
    if (!result) return;
    setIsDownloading(true);

    let url: string | null = null;
    let filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}`;
    let mimeType = 'application/octet-stream';

    if (type === 'video') {
      if (result.videoUrl) {
        url = result.videoUrl;
        filename += '.mp4';
        mimeType = 'video/mp4';
      } else if (result.videoBase64) {
        url = `data:video/mp4;base64,${result.videoBase64}`;
        filename += '.mp4';
      }
    } else if (type === 'draft') {
      if (result.draftUrl) {
        url = result.draftUrl;
        filename += '_capcut_draft.zip';
        mimeType = 'application/zip';
      } else if (result.draftBase64) {
        url = `data:application/zip;base64,${result.draftBase64}`;
        filename += '_capcut_draft.zip';
      }
    } else if (type === 'srt' && result.srtContent) {
      const blob = new Blob([result.srtContent], { type: 'text/plain' });
      url = URL.createObjectURL(blob);
      filename += '.srt';
    }

    if (!url) {
      setIsDownloading(false);
      return;
    }

    try {
      // For external URLs (S3), fetch as blob to force download
      // The download attribute doesn't work for cross-origin URLs
      if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.error('Failed to download file:', error);
          // Fallback: open in new tab
          window.open(url, '_blank');
        }
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke blob URL if created
        if (type === 'srt') {
          URL.revokeObjectURL(url);
        }
      }
    } finally {
      setIsDownloading(false);
    }
  }, [result, project.name]);

  return {
    // Composition state
    compositionState,
    result,

    // Options
    options: {
      outputFormat,
      resolution,
      includeCaptions,
      includeMusic,
      includeVoiceovers,
      replaceVideoAudio,
      aiTransitions,
      captionStyle,
      transitionStyle,
      transitionDuration,
      audioSettings,
      kenBurnsEffect,
    },
    setOutputFormat,
    setResolution,
    setIncludeCaptions,
    setIncludeMusic,
    setIncludeVoiceovers,
    setReplaceVideoAudio,
    setAiTransitions,
    // Caption styling
    setCaptionStyle,
    // Transition settings
    setTransitionStyle,
    setTransitionDuration,
    // Audio settings
    setAudioSettings,
    // Video effects
    setKenBurnsEffect,

    // AI Transitions
    suggestedTransitions,
    isLoadingTransitions,
    suggestTransitions,
    applyTransitions,

    // Actions
    startComposition,
    cancelComposition,
    downloadResult,
    isDownloading,

    // Cost estimation
    estimatedCost,

    // Capabilities
    canCompose,
    hasEndpoint,
  };
}
