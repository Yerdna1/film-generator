import { useState, useRef, useCallback } from 'react';
import type { ItemGenerationState } from '@/lib/constants/workflow';

interface AudioUIStateHookResult {
  audioStates: Record<string, ItemGenerationState>;
  setAudioStates: React.Dispatch<React.SetStateAction<Record<string, ItemGenerationState>>>;
  playingAudio: string | null;
  playingSceneId: string | null;
  scenePlaybackIndex: number;
  audioRefs: React.MutableRefObject<{ [key: string]: HTMLAudioElement }>;
  abortRef: React.MutableRefObject<boolean>;
  safePlay: (lineId: string) => void;
  setPlayingAudio: (lineId: string | null) => void;
  setPlayingSceneId: (sceneId: string | null) => void;
  setScenePlaybackIndex: (index: number) => void;
}

export function useAudioUIState(): AudioUIStateHookResult {
  const [audioStates, setAudioStates] = useState<Record<string, ItemGenerationState>>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [scenePlaybackIndex, setScenePlaybackIndex] = useState(0);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const abortRef = useRef(false);

  // Safe play helper - catches AbortError which is harmless (audio source changed)
  const safePlay = useCallback((lineId: string) => {
    audioRefs.current[lineId]?.play()?.catch((e: Error) => {
      if (e.name !== 'AbortError') {
        console.error('Audio playback error:', e);
      }
    });
  }, []);

  return {
    audioStates,
    setAudioStates,
    playingAudio,
    playingSceneId,
    scenePlaybackIndex,
    audioRefs,
    abortRef,
    safePlay,
    setPlayingAudio,
    setPlayingSceneId,
    setScenePlaybackIndex,
  };
}
