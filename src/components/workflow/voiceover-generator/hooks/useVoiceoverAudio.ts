import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import type { Project, Character } from '@/types/project';
import type { AudioState, DialogueLineWithScene } from '../types';
import { getValidGeminiVoice } from '../types';

export function useVoiceoverAudio(project: Project) {
  const { updateScene } = useProjectStore();
  const { handleApiResponse } = useCredits();

  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const allDialogueLines: DialogueLineWithScene[] = project.scenes.flatMap((scene) =>
    scene.dialogue.map((line) => ({
      ...line,
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneNumber: scene.number,
    }))
  );

  const generateAudioForLine = useCallback(async (lineId: string, sceneId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    const line = scene?.dialogue.find((l) => l.id === lineId);
    if (!line) return;

    const character = project.characters.find((c) => c.id === line.characterId);

    setAudioStates((prev) => ({
      ...prev,
      [lineId]: { status: 'generating', progress: 10 },
    }));

    try {
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: { status: 'generating', progress: 30 },
      }));

      // Use unified TTS endpoint - routes based on user's ttsProvider setting
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.text,
          voiceName: getValidGeminiVoice(character?.voiceId),
          voiceId: character?.voiceId || 'pNInz6obpgDQGcFmaJgB',
          language: project.voiceSettings.language,
          projectId: project.id,
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        setAudioStates((prev) => ({
          ...prev,
          [lineId]: { status: 'idle', progress: 0 },
        }));
        return;
      }

      setAudioStates((prev) => ({
        ...prev,
        [lineId]: { status: 'generating', progress: 70 },
      }));

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl && scene) {
          const usedProvider = project.voiceSettings.provider;
          const updatedDialogue = scene.dialogue.map((d) =>
            d.id === lineId ? { ...d, audioUrl: data.audioUrl, ttsProvider: usedProvider } : d
          );
          updateScene(project.id, sceneId, { dialogue: updatedDialogue });

          setAudioStates((prev) => ({
            ...prev,
            [lineId]: { status: 'complete', progress: 100 },
          }));
          window.dispatchEvent(new CustomEvent('credits-updated'));
          return;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      console.warn('TTS API failed:', errorData);
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: {
          status: 'error',
          progress: 0,
          error: errorData.error || 'TTS API not configured - check Settings'
        },
      }));
    } catch (error) {
      console.error('Error generating audio:', error);
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Generation failed'
        },
      }));
    }
  }, [project, updateScene, handleApiResponse]);

  const handleGenerateAll = useCallback(async () => {
    setIsGeneratingAll(true);
    for (const line of allDialogueLines) {
      if (!line.audioUrl) {
        await generateAudioForLine(line.id, line.sceneId);
      }
    }
    setIsGeneratingAll(false);
  }, [allDialogueLines, generateAudioForLine]);

  const togglePlay = useCallback((lineId: string) => {
    if (playingAudio === lineId) {
      audioRefs.current[lineId]?.pause();
      setPlayingAudio(null);
    } else {
      if (playingAudio) {
        audioRefs.current[playingAudio]?.pause();
      }
      audioRefs.current[lineId]?.play();
      setPlayingAudio(lineId);
    }
  }, [playingAudio]);

  const setAudioRef = useCallback((lineId: string, el: HTMLAudioElement | null) => {
    if (el) {
      audioRefs.current[lineId] = el;
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setPlayingAudio(null);
  }, []);

  return {
    audioStates,
    playingAudio,
    isGeneratingAll,
    allDialogueLines,
    generateAudioForLine,
    handleGenerateAll,
    togglePlay,
    setAudioRef,
    handleAudioEnded,
  };
}
