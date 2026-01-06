import { useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';
import type { DialogueLineWithScene } from '../types';

interface AudioManagementHookResult {
  downloadLine: (lineId: string) => Promise<void>;
  deleteAudioForLine: (lineId: string, sceneId: string) => Promise<void>;
  deleteAllAudio: () => Promise<void>;
  selectVersion: (lineId: string, sceneId: string, audioUrl: string, provider: string) => void;
  switchAllToProvider: (provider: string, language: string) => void;
  getAvailableVersions: () => Array<{ provider: string; language: string; count: number }>;
}

export function useAudioManagement(
  project: Project,
  allDialogueLines: DialogueLineWithScene[],
  audioRefs: React.MutableRefObject<{ [key: string]: HTMLAudioElement }>,
  playingAudio: string | null,
  setPlayingAudio: (lineId: string | null) => void,
  safePlay: (lineId: string) => void
): AudioManagementHookResult {
  const { updateScene } = useProjectStore();

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

  // Delete ONLY the currently selected audio version for a dialogue line
  const deleteAudioForLine = useCallback(async (lineId: string, sceneId: string) => {
    const scene = (project.scenes || []).find(s => s.id === sceneId);
    if (!scene?.dialogue) return;

    const updatedDialogue = scene.dialogue.map(d => {
      if (d.id !== lineId) return d;

      // Remove the currently selected version from audioVersions
      const currentAudioUrl = d.audioUrl;
      const remainingVersions = (d.audioVersions || []).filter(v => v.audioUrl !== currentAudioUrl);

      // If there are remaining versions, switch to the first one
      if (remainingVersions.length > 0) {
        const nextVersion = remainingVersions[0];
        return {
          ...d,
          audioUrl: nextVersion.audioUrl,
          audioDuration: nextVersion.duration,
          ttsProvider: nextVersion.provider as 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts',
          audioVersions: remainingVersions,
        };
      }

      // No versions left - clear everything
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
  }, [project.id, project.scenes, updateScene]);

  // Select a specific audio version for a dialogue line and play it
  const selectVersion = useCallback((lineId: string, sceneId: string, audioUrl: string, provider: string) => {
    const scene = (project.scenes || []).find(s => s.id === sceneId);
    if (!scene?.dialogue) return;

    // Stop any current playback first
    if (playingAudio) {
      audioRefs.current[playingAudio]?.pause();
    }

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

    // Play the new version after a short delay to allow audio element to update
    setPlayingAudio(lineId);
    setTimeout(() => {
      const audioEl = audioRefs.current[lineId];
      if (audioEl) {
        audioEl.load(); // Force reload with new src
        audioEl.oncanplay = () => {
          safePlay(lineId);
          audioEl.oncanplay = null; // Clean up listener
        };
      }
    }, 50);
  }, [project.id, project.scenes, updateScene, playingAudio, audioRefs, setPlayingAudio, safePlay]);

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

  return {
    downloadLine,
    deleteAudioForLine,
    deleteAllAudio,
    selectVersion,
    switchAllToProvider,
    getAvailableVersions,
  };
}
