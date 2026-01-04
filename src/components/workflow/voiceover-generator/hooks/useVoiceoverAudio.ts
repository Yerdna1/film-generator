import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { useCredits } from '@/contexts/CreditsContext';
import type { Project, Character, AudioVersion, VoiceProvider } from '@/types/project';
import type { AudioState, DialogueLineWithScene } from '../types';
import { getValidGeminiVoice, getVoiceForProvider, getProviderDisplayName } from '../types';

export function useVoiceoverAudio(project: Project) {
  const { updateScene } = useProjectStore();
  const { handleApiResponse } = useCredits();

  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Scene playback state
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [scenePlaybackIndex, setScenePlaybackIndex] = useState(0);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const abortRef = useRef(false);  // For stopping batch generation

  // Safety check for scenes array (may be undefined in summary data)
  const allDialogueLines: DialogueLineWithScene[] = (project.scenes || []).flatMap((scene) =>
    (scene.dialogue || []).map((line) => ({
      ...line,
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneNumber: scene.number,
    }))
  );

  // Return type indicates: true = success, false = failed, 'insufficient_credits' = stop batch
  const generateAudioForLine = useCallback(async (lineId: string, sceneId: string): Promise<boolean | 'insufficient_credits'> => {
    // Read fresh data from store to avoid race conditions when generating multiple lines
    const freshProject = useProjectStore.getState().projects.find(p => p.id === project.id);
    const scene = (freshProject?.scenes || project.scenes || []).find((s) => s.id === sceneId);
    const line = scene?.dialogue?.find((l) => l.id === lineId);
    if (!line) return false;

    const character = (freshProject?.characters || project.characters || []).find((c) => c.id === line.characterId);

    setAudioStates((prev) => ({
      ...prev,
      [lineId]: { status: 'generating', progress: 10 },
    }));

    try {
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: { status: 'generating', progress: 30 },
      }));

      // Use unified TTS endpoint - pass provider from UI selection
      const provider = project.voiceSettings?.provider || 'gemini-tts';

      // Get valid voice for the current provider
      // Returns null if character doesn't have a voice configured for this provider
      const voiceId = getVoiceForProvider(character?.voiceId, provider);

      if (!voiceId) {
        const characterName = character?.name || line.characterName || 'Unknown';
        const providerName = getProviderDisplayName(provider);
        setAudioStates((prev) => ({
          ...prev,
          [lineId]: {
            status: 'error',
            progress: 0,
            error: `${characterName} has no voice for ${providerName}. Open Voice Settings to assign voices.`
          },
        }));
        return false;
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.text,
          voiceName: getValidGeminiVoice(voiceId),
          voiceId,
          language: project.voiceSettings?.language || 'sk',
          provider,
          projectId: project.id,
          // Voice customization settings
          voiceInstructions: character?.voiceInstructions,
          voiceStability: character?.voiceStability,
          voiceSimilarityBoost: character?.voiceSimilarityBoost,
          voiceStyle: character?.voiceStyle,
        }),
      });

      const isInsufficientCredits = await handleApiResponse(response);
      if (isInsufficientCredits) {
        setAudioStates((prev) => ({
          ...prev,
          [lineId]: { status: 'idle', progress: 0 },
        }));
        return 'insufficient_credits';
      }

      setAudioStates((prev) => ({
        ...prev,
        [lineId]: { status: 'generating', progress: 70 },
      }));

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          // CRITICAL: Read fresh scene data from store before updating to avoid race conditions
          // When generating multiple lines, each update must use the latest scene state
          const currentProject = useProjectStore.getState().projects.find(p => p.id === project.id);
          const currentScene = (currentProject?.scenes || project.scenes || []).find((s) => s.id === sceneId);

          if (!currentScene?.dialogue) {
            console.error('Scene not found for audio update:', sceneId);
            return false;
          }

          const usedProvider = project.voiceSettings?.provider || 'gemini-tts';
          const usedLanguage = project.voiceSettings?.language || 'sk';

          // Create new audio version entry
          const newVersion: AudioVersion = {
            audioUrl: data.audioUrl,
            provider: usedProvider as VoiceProvider,
            language: usedLanguage,
            voiceId: character?.voiceId,
            voiceName: character?.voiceName,
            duration: data.duration,
            createdAt: new Date().toISOString(),
          };

          const updatedDialogue = currentScene.dialogue.map((d) => {
            if (d.id !== lineId) return d;

            // Add new version to audioVersions array (or create it)
            const existingVersions = d.audioVersions || [];
            // Check if we already have this provider+language combo and update it
            const versionKey = `${usedProvider}_${usedLanguage}`;
            const filteredVersions = existingVersions.filter(
              (v) => `${v.provider}_${v.language}` !== versionKey
            );

            return {
              ...d,
              audioUrl: data.audioUrl,
              audioDuration: data.duration,
              ttsProvider: usedProvider,
              audioVersions: [...filteredVersions, newVersion],
            };
          });

          updateScene(project.id, sceneId, { dialogue: updatedDialogue });

          setAudioStates((prev) => ({
            ...prev,
            [lineId]: { status: 'complete', progress: 100 },
          }));
          window.dispatchEvent(new CustomEvent('credits-updated'));
          return true;
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
      return false;
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
      return false;
    }
  }, [project, updateScene, handleApiResponse]);

  const handleGenerateAll = useCallback(async () => {
    abortRef.current = false;  // Reset abort flag
    setIsGeneratingAll(true);

    // Get current provider+language to check for existing versions
    const currentProvider = project.voiceSettings?.provider || 'gemini-tts';
    const currentLanguage = project.voiceSettings?.language || 'sk';
    const versionKey = `${currentProvider}_${currentLanguage}`;

    for (let i = 0; i < allDialogueLines.length; i++) {
      if (abortRef.current) {
        console.log('TTS generation stopped by user');
        break;
      }
      const line = allDialogueLines[i];

      // Check if THIS provider+language version already exists (not just any audio)
      const hasThisVersion = line.audioVersions?.some(
        v => `${v.provider}_${v.language}` === versionKey
      );

      if (!hasThisVersion) {
        const result = await generateAudioForLine(line.id, line.sceneId);
        // Stop batch generation if insufficient credits
        if (result === 'insufficient_credits') {
          console.log('TTS generation stopped: insufficient credits');
          break;
        }
        // Add delay between requests to avoid rate limits (Gemini: 10 req/min)
        // Wait 7 seconds between requests to stay under limit
        if (i < allDialogueLines.length - 1 && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 7000));
        }
      }
    }
    setIsGeneratingAll(false);
  }, [allDialogueLines, generateAudioForLine, project.voiceSettings?.provider, project.voiceSettings?.language]);

  // Stop batch TTS generation
  const stopGeneratingAll = useCallback(() => {
    abortRef.current = true;
    setIsGeneratingAll(false);
  }, []);

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
        audioRefs.current[nextLineId]?.play();
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
        audioRefs.current[nextLineId]?.play();
      } else {
        // All lines played - stop scene playback
        setPlayingSceneId(null);
        setScenePlaybackIndex(0);
        setPlayingAudio(null);
      }
    } else {
      setPlayingAudio(null);
    }
  }, [playingSceneId, scenePlaybackIndex, project.scenes, allDialogueLines]);

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
    audioRefs.current[firstLineId]?.play();
  }, [project.scenes, playingAudio]);

  // Stop scene playback
  const stopScenePlayback = useCallback(() => {
    if (playingAudio) {
      audioRefs.current[playingAudio]?.pause();
    }
    setPlayingSceneId(null);
    setScenePlaybackIndex(0);
    setPlayingAudio(null);
  }, [playingAudio]);

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
    audioRefs.current[firstLineId]?.play();
  }, [allDialogueLines, playingAudio]);

  // Download a single dialogue line audio
  const downloadLine = useCallback(async (lineId: string) => {
    const line = allDialogueLines.find(l => l.id === lineId);
    if (!line?.audioUrl) return;

    try {
      // Dynamically import file helpers
      const { fetchAsBlob, downloadBlob, sanitizeFilename, getExtension } = await import(
        '@/components/workflow/export/utils/file-helpers'
      );

      const blob = await fetchAsBlob(line.audioUrl);
      if (blob) {
        const ext = getExtension(line.audioUrl, blob.type);
        const filename = `${sanitizeFilename(line.characterName)}_scene${line.sceneNumber}_${lineId.slice(-4)}.${ext}`;
        downloadBlob(blob, filename);
      }
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  }, [allDialogueLines]);

  // Delete audio for a single dialogue line
  const deleteAudioForLine = useCallback(async (lineId: string, sceneId: string) => {
    const scene = (project.scenes || []).find(s => s.id === sceneId);
    if (!scene?.dialogue) return;

    const updatedDialogue = scene.dialogue.map(d => {
      if (d.id !== lineId) return d;
      return {
        ...d,
        audioUrl: undefined,
        audioDuration: undefined,
        ttsProvider: undefined,
        audioVersions: [],
      };
    });

    // Update the scene in the store
    updateScene(project.id, sceneId, { dialogue: updatedDialogue });

    // Reset audio state for this line
    setAudioStates((prev) => {
      const newStates = { ...prev };
      delete newStates[lineId];
      return newStates;
    });
  }, [project.id, project.scenes, updateScene]);

  // Delete all audio from all dialogue lines
  const deleteAllAudio = useCallback(async () => {
    for (const scene of (project.scenes || [])) {
      if (!scene.dialogue?.length) continue;

      const hasAudio = scene.dialogue.some(d => d.audioUrl);
      if (!hasAudio) continue;

      const updatedDialogue = scene.dialogue.map(d => ({
        ...d,
        audioUrl: undefined,
        audioDuration: undefined,
        ttsProvider: undefined,
        audioVersions: [],
      }));

      updateScene(project.id, scene.id, { dialogue: updatedDialogue });
    }
    // Reset audio states
    setAudioStates({});
  }, [project.id, project.scenes, updateScene]);

  // Select a specific audio version for a dialogue line
  const selectVersion = useCallback((lineId: string, sceneId: string, audioUrl: string, provider: string) => {
    const scene = (project.scenes || []).find(s => s.id === sceneId);
    if (!scene?.dialogue) return;

    const updatedDialogue = scene.dialogue.map(d => {
      if (d.id !== lineId) return d;
      // Find the version to get duration
      const version = d.audioVersions?.find(v => v.audioUrl === audioUrl);
      return {
        ...d,
        audioUrl,
        audioDuration: version?.duration,
        ttsProvider: provider as 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts',
      };
    });

    updateScene(project.id, sceneId, { dialogue: updatedDialogue });
  }, [project.id, project.scenes, updateScene]);

  // Switch all dialogue lines to a specific provider+language version
  const switchAllToProvider = useCallback((provider: string, language: string) => {
    const versionKey = `${provider}_${language}`;

    for (const scene of (project.scenes || [])) {
      if (!scene.dialogue?.length) continue;

      let hasChanges = false;
      const updatedDialogue = scene.dialogue.map(d => {
        // Find version for this provider+language
        const version = d.audioVersions?.find(v => `${v.provider}_${v.language}` === versionKey);
        if (!version || d.audioUrl === version.audioUrl) return d;

        hasChanges = true;
        return {
          ...d,
          audioUrl: version.audioUrl,
          audioDuration: version.duration,
          ttsProvider: provider as 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts',
        };
      });

      if (hasChanges) {
        updateScene(project.id, scene.id, { dialogue: updatedDialogue });
      }
    }
  }, [project.id, project.scenes, updateScene]);

  // Get unique provider+language combinations that have audio versions
  const getAvailableVersions = useCallback(() => {
    const versions = new Map<string, { provider: string; language: string; count: number }>();

    for (const line of allDialogueLines) {
      for (const v of (line.audioVersions || [])) {
        const key = `${v.provider}_${v.language}`;
        const existing = versions.get(key);
        if (existing) {
          existing.count++;
        } else {
          versions.set(key, { provider: v.provider, language: v.language, count: 1 });
        }
      }
    }

    return Array.from(versions.values());
  }, [allDialogueLines]);

  // Calculate total characters for cost estimation
  const totalCharacters = allDialogueLines.reduce((sum, line) => sum + line.text.length, 0);

  return {
    audioStates,
    playingAudio,
    playingSceneId,
    isGeneratingAll,
    allDialogueLines,
    totalCharacters,
    generateAudioForLine,
    handleGenerateAll,
    stopGeneratingAll,
    deleteAudioForLine,
    deleteAllAudio,
    selectVersion,
    switchAllToProvider,
    getAvailableVersions,
    togglePlay,
    setAudioRef,
    handleAudioEnded,
    playAllSceneVoices,
    playAllDialogues,
    stopScenePlayback,
    downloadLine,
  };
}
