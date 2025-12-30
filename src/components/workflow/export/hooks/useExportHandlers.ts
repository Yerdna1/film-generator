import { useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import {
  exportProjectAsMarkdown,
  formatCharacterForExport,
  formatSceneForExport,
} from '@/lib/prompts/master-prompt';
import { downloadBlob, sanitizeFilename } from '../utils/file-helpers';
import type { Project } from '@/types/project';
import type { ExportHandlers } from '../types';

export function useExportHandlers(project: Project): ExportHandlers {
  const { exportProject } = useProjectStore();

  const handleExportJSON = useCallback(() => {
    const json = exportProject(project.id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      downloadBlob(blob, `${sanitizeFilename(project.name)}_project.json`);
    }
  }, [project.id, project.name, exportProject]);

  const handleExportMarkdown = useCallback(() => {
    const markdown = exportProjectAsMarkdown(
      project.story,
      project.characters,
      project.scenes,
      project.style
    );
    const blob = new Blob([markdown], { type: 'text/markdown' });
    downloadBlob(blob, `${sanitizeFilename(project.name)}_prompts.md`);
  }, [project.story, project.characters, project.scenes, project.style, project.name]);

  const handleExportText = useCallback(() => {
    let text = `# ${project.story.title}\n\n`;
    text += `## Characters\n\n`;
    project.characters.forEach((c) => {
      text += formatCharacterForExport(c) + '\n\n';
    });
    text += `## Scenes\n\n`;
    project.scenes.forEach((s) => {
      text += formatSceneForExport(s) + '\n\n';
    });

    const blob = new Blob([text], { type: 'text/plain' });
    downloadBlob(blob, `${sanitizeFilename(project.name)}_prompts.txt`);
  }, [project.story.title, project.characters, project.scenes, project.name]);

  const handleExportCapCut = useCallback(() => {
    const fps = 30;
    const sceneDuration = 6;
    const framesPerScene = fps * sceneDuration;
    const totalDuration = project.scenes.length * sceneDuration;
    const totalFrames = project.scenes.length * framesPerScene;

    const capcutProject = {
      meta: {
        name: project.story.title || project.name,
        duration: totalDuration,
        fps: fps,
        width: 1920,
        height: 1080,
        createdAt: new Date().toISOString(),
        generator: 'Film Generator AI Studio',
      },
      tracks: {
        video: project.scenes.map((scene, index) => ({
          id: scene.id,
          name: `Scene ${scene.number || index + 1}: ${scene.title}`,
          start: index * sceneDuration,
          duration: sceneDuration,
          startFrame: index * framesPerScene,
          endFrame: (index + 1) * framesPerScene,
          source: scene.videoUrl ? 'video' : scene.imageUrl ? 'image' : 'placeholder',
          hasVideo: !!scene.videoUrl,
          hasImage: !!scene.imageUrl,
          prompt: scene.imageToVideoPrompt,
        })),
        audio: project.scenes.flatMap((scene, sceneIndex) =>
          scene.dialogue.map((line, lineIndex) => ({
            id: `audio_${scene.id}_${lineIndex}`,
            sceneId: scene.id,
            character: line.characterName,
            text: line.text,
            start: sceneIndex * sceneDuration + lineIndex * 2,
            hasAudio: !!line.audioUrl,
          }))
        ),
      },
      assets: {
        videos: project.scenes
          .filter((s) => s.videoUrl)
          .map((s) => ({
            id: s.id,
            title: s.title,
            duration: s.duration || 6,
          })),
        images: project.scenes
          .filter((s) => s.imageUrl && !s.videoUrl)
          .map((s) => ({
            id: s.id,
            title: s.title,
          })),
        audio: project.scenes.flatMap((s) =>
          s.dialogue
            .filter((d) => d.audioUrl)
            .map((d) => ({
              character: d.characterName,
              text: d.text,
            }))
        ),
      },
      timeline: {
        totalDuration,
        totalFrames,
        scenes: project.scenes.map((scene, index) => ({
          number: scene.number || index + 1,
          title: scene.title,
          timeStart: `${Math.floor((index * sceneDuration) / 60)}:${String((index * sceneDuration) % 60).padStart(2, '0')}`,
          timeEnd: `${Math.floor(((index + 1) * sceneDuration) / 60)}:${String(((index + 1) * sceneDuration) % 60).padStart(2, '0')}`,
          dialogueLines: scene.dialogue.length,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(capcutProject, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${sanitizeFilename(project.name)}_capcut_project.json`);
  }, [project.scenes, project.story.title, project.name]);

  const getFullMarkdown = useCallback(() => {
    return exportProjectAsMarkdown(project.story, project.characters, project.scenes, project.style);
  }, [project.story, project.characters, project.scenes, project.style]);

  return {
    handleExportJSON,
    handleExportMarkdown,
    handleExportText,
    handleExportCapCut,
    getFullMarkdown,
  };
}
