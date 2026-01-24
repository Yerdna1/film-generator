import { useMemo } from 'react';
import { COSTS } from '@/lib/services/credits';
import type { Project } from '@/types/project';
import type { ProjectStats, CreditsSpent } from '../types';

export function useProjectStats(project: Project): { stats: ProjectStats; credits: CreditsSpent } {
  // Safe accessors for arrays that may be undefined
  const characters = project.characters || [];
  const scenes = project.scenes || [];

  const stats = useMemo<ProjectStats>(() => {
    const totalCharacters = characters.length;
    const charactersWithImages = characters.filter((c) => c.imageUrl).length;
    const totalScenes = scenes.length;
    const scenesWithImages = scenes.filter((s) => s.imageUrl).length;
    const scenesWithVideos = scenes.filter((s) => s.videoUrl).length;

    // Count dialogue lines - scenes might not have dialogue loaded yet
    const totalDialogueLines = scenes.reduce((acc, s) => {
      const dialogue = s.dialogue;
      if (!dialogue || dialogue.length === 0) {
        console.log(`[useProjectStats] Scene ${s.number || '(unknown)'} (${s.title}): No dialogue array`);
      }
      return acc + (dialogue?.length || 0);
    }, 0);

    console.log(`[useProjectStats] Total dialogue lines: ${totalDialogueLines} across ${totalScenes} scenes`);

    // Check both primary audioUrl and audioVersions array
    const dialogueLinesWithAudio = scenes.reduce(
      (acc, s) => {
        const dialogueAudioCount = (s.dialogue || []).filter(
          (d) => {
            const hasAudio = !!(d.audioUrl || (d.audioVersions && d.audioVersions.length > 0));
            if (!hasAudio && d.text) {
              console.log(`[useProjectStats] Dialogue line has no audio: "${d.text?.substring(0, 30)}..."`);
            }
            return hasAudio;
          }
        ).length;
        return acc + dialogueAudioCount;
      },
      0
    );

    console.log(`[useProjectStats] Dialogue lines with audio: ${dialogueLinesWithAudio}`);

    const overallProgress = Math.round(
      ((charactersWithImages + scenesWithImages + scenesWithVideos + dialogueLinesWithAudio) /
        (Math.max(totalCharacters, 1) +
          Math.max(totalScenes, 1) +
          Math.max(totalScenes, 1) +
          Math.max(totalDialogueLines, 1))) *
        100
    );

    const totalDuration = totalScenes * 6;
    const totalMinutes = Math.floor(totalDuration / 60);
    const totalSeconds = totalDuration % 60;

    return {
      totalCharacters,
      charactersWithImages,
      totalScenes,
      scenesWithImages,
      scenesWithVideos,
      totalDialogueLines,
      dialogueLinesWithAudio,
      overallProgress,
      totalDuration,
      totalMinutes,
      totalSeconds,
    };
  }, [characters, scenes]);

  const credits = useMemo<CreditsSpent>(() => {
    const images = stats.scenesWithImages * COSTS.IMAGE_GENERATION + stats.charactersWithImages * COSTS.IMAGE_GENERATION;
    const videos = stats.scenesWithVideos * COSTS.VIDEO_GENERATION;
    const voiceovers = stats.dialogueLinesWithAudio * COSTS.VOICEOVER_LINE;
    const scenesCost = stats.totalScenes * COSTS.SCENE_GENERATION;
    const total = images + videos + voiceovers + scenesCost;

    return { images, videos, voiceovers, scenes: scenesCost, total };
  }, [stats]);

  return { stats, credits };
}
