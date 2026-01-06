import { useCallback } from 'react';
import type { Project } from '@/types/project';
import type { DialogueLineWithScene } from '../types';

interface AudioPlaybackHookResult {
  togglePlay: (lineId: string) => void;
  setAudioRef: (lineId: string, el: HTMLAudioElement | null) => void;
  handleAudioEnded: () => void;
  playAllSceneVoices: (sceneId: string) => void;
  stopScenePlayback: () => void;
  playAllDialogues: () => void;
}

export function useAudioPlayback(
  project: Project,
  allDialogueLines: DialogueLineWithScene[],
  playingAudio: string | null,
  playingSceneId: string | null,
  scenePlaybackIndex: number,
  setPlayingAudio: (lineId: string | null) => void,
  setPlayingSceneId: (sceneId: string | null) => void,
  setScenePlaybackIndex: (index: number) => void,
  audioRefs: React.MutableRefObject<{ [key: string]: HTMLAudioElement }>,
  safePlay: (lineId: string) => void
): AudioPlaybackHookResult {

  const togglePlay = useCallback((lineId: string) => {
    if (playingAudio === lineId) {
      audioRefs.current[lineId]?.pause();
      setPlayingAudio(null);
    } else {
      if (playingAudio) {
        audioRefs.current[playingAudio]?.pause();
      }
      safePlay(lineId);
      setPlayingAudio(lineId);
    }
  }, [playingAudio, audioRefs, safePlay, setPlayingAudio]);

  const setAudioRef = useCallback((lineId: string, el: HTMLAudioElement | null) => {
    if (el) {
      audioRefs.current[lineId] = el;
    }
  }, [audioRefs]);

  // Handle audio ended - supports sequential scene and global playback
  const handleAudioEnded = useCallback(() => {
    if (playingSceneId === '__all__') {
      // Global playback - all dialogues across all scenes
      const linesWithAudio = allDialogueLines.filter(l => l.audioUrl);
      const nextIndex = scenePlaybackIndex + 1;

      if (nextIndex < linesWithAudio.length) {
        setScenePlaybackIndex(nextIndex);
        const nextLineId = linesWithAudio[nextIndex].id;
        setPlayingAudio(nextLineId);
        safePlay(nextLineId);
      } else {
        // All lines played
        setPlayingSceneId(null);
        setScenePlaybackIndex(0);
        setPlayingAudio(null);
      }
    } else if (playingSceneId) {
      // Scene-specific playback
      const scene = (project.scenes || []).find(s => s.id === playingSceneId);
      const linesWithAudio = scene?.dialogue?.filter(l => l.audioUrl) || [];
      const nextIndex = scenePlaybackIndex + 1;

      if (nextIndex < linesWithAudio.length) {
        // Play next line in sequence
        setScenePlaybackIndex(nextIndex);
        const nextLineId = linesWithAudio[nextIndex].id;
        setPlayingAudio(nextLineId);
        safePlay(nextLineId);
      } else {
        // All lines played - stop scene playback
        setPlayingSceneId(null);
        setScenePlaybackIndex(0);
        setPlayingAudio(null);
      }
    } else {
      setPlayingAudio(null);
    }
  }, [playingSceneId, scenePlaybackIndex, project.scenes, allDialogueLines, setScenePlaybackIndex, setPlayingAudio, safePlay]);

  // Play all voices in a scene sequentially
  const playAllSceneVoices = useCallback((sceneId: string) => {
    const scene = (project.scenes || []).find(s => s.id === sceneId);
    if (!scene) return;

    const linesWithAudio = scene.dialogue?.filter(l => l.audioUrl) || [];
    if (linesWithAudio.length === 0) return;

    // Stop any current playback
    if (playingAudio) {
      audioRefs.current[playingAudio]?.pause();
    }

    setPlayingSceneId(sceneId);
    setScenePlaybackIndex(0);
    const firstLineId = linesWithAudio[0].id;
    setPlayingAudio(firstLineId);
    safePlay(firstLineId);
  }, [project.scenes, playingAudio, audioRefs, setPlayingSceneId, setScenePlaybackIndex, setPlayingAudio, safePlay]);

  // Stop scene playback
  const stopScenePlayback = useCallback(() => {
    if (playingAudio) {
      audioRefs.current[playingAudio]?.pause();
    }
    setPlayingSceneId(null);
    setScenePlaybackIndex(0);
    setPlayingAudio(null);
  }, [playingAudio, audioRefs, setPlayingSceneId, setScenePlaybackIndex, setPlayingAudio]);

  // Play all dialogues across all scenes sequentially
  const playAllDialogues = useCallback(() => {
    const linesWithAudio = allDialogueLines.filter(l => l.audioUrl);
    if (linesWithAudio.length === 0) return;

    // Stop any current playback
    if (playingAudio) {
      audioRefs.current[playingAudio]?.pause();
    }

    // Use first scene's ID to track that we're doing global playback
    setPlayingSceneId('__all__');
    setScenePlaybackIndex(0);
    const firstLineId = linesWithAudio[0].id;
    setPlayingAudio(firstLineId);
    safePlay(firstLineId);
  }, [allDialogueLines, playingAudio, audioRefs, setPlayingSceneId, setScenePlaybackIndex, setPlayingAudio, safePlay]);

  return {
    togglePlay,
    setAudioRef,
    handleAudioEnded,
    playAllSceneVoices,
    stopScenePlayback,
    playAllDialogues,
  };
}
