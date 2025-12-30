import { useMemo } from 'react';
import { COSTS } from '@/lib/services/credits';
import type { Project } from '@/types/project';
import type { ProjectStats, CreditsSpent } from '../types';

export function useProjectStats(project: Project): { stats: ProjectStats; credits: CreditsSpent } {
  const stats = useMemo<ProjectStats>(() => {
    const totalCharacters = project.characters.length;
    const charactersWithImages = project.characters.filter((c) => c.imageUrl).length;
    const totalScenes = project.scenes.length;
    const scenesWithImages = project.scenes.filter((s) => s.imageUrl).length;
    const scenesWithVideos = project.scenes.filter((s) => s.videoUrl).length;
    const totalDialogueLines = project.scenes.reduce((acc, s) => acc + s.dialogue.length, 0);
    const dialogueLinesWithAudio = project.scenes.reduce(
      (acc, s) => acc + s.dialogue.filter((d) => d.audioUrl).length,
      0
    );

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
  }, [project.characters, project.scenes]);

  const credits = useMemo<CreditsSpent>(() => {
    const images = stats.scenesWithImages * COSTS.IMAGE_GENERATION + stats.charactersWithImages * COSTS.IMAGE_GENERATION;
    const videos = stats.scenesWithVideos * COSTS.VIDEO_GENERATION;
    const voiceovers = stats.dialogueLinesWithAudio * COSTS.VOICEOVER_LINE;
    const scenes = stats.totalScenes * COSTS.SCENE_GENERATION;
    const total = images + videos + voiceovers + scenes;

    return { images, videos, voiceovers, scenes, total };
  }, [stats]);

  return { stats, credits };
}
