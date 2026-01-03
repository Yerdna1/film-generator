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
    const totalDialogueLines = scenes.reduce((acc, s) => acc + (s.dialogue?.length || 0), 0);
    const dialogueLinesWithAudio = scenes.reduce(
      (acc, s) => acc + (s.dialogue || []).filter((d) => d.audioUrl).length,
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
  }, [characters, scenes]);

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
