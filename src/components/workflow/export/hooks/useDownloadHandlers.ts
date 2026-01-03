import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { useProjectStore } from '@/lib/stores/project-store';
import { exportProjectAsMarkdown } from '@/lib/prompts/master-prompt';
import { fetchAsBlob, getExtension, downloadBlob, sanitizeFilename } from '../utils/file-helpers';
import type { Project } from '@/types/project';
import type { DownloadState, DownloadHandlers } from '../types';

export function useDownloadHandlers(project: Project): DownloadState & DownloadHandlers {
  const { exportProject } = useProjectStore();

  // Safe accessors for arrays
  const scenes = project.scenes || [];
  const characters = project.characters || [];

  const [downloadingImages, setDownloadingImages] = useState(false);
  const [downloadingVideos, setDownloadingVideos] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleDownloadImages = useCallback(async () => {
    setDownloadingImages(true);
    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      const charactersFolder = imagesFolder?.folder('characters');
      const scenesFolder = imagesFolder?.folder('scenes');

      for (const char of characters) {
        if (char.imageUrl) {
          const blob = await fetchAsBlob(char.imageUrl);
          if (blob) {
            const ext = getExtension(char.imageUrl, blob.type);
            charactersFolder?.file(`${sanitizeFilename(char.name)}.${ext}`, blob);
          }
        }
      }

      for (const scene of scenes) {
        if (scene.imageUrl) {
          const blob = await fetchAsBlob(scene.imageUrl);
          if (blob) {
            const ext = getExtension(scene.imageUrl, blob.type);
            const sceneNum = scene.number || scenes.indexOf(scene) + 1;
            scenesFolder?.file(
              `scene_${String(sceneNum).padStart(2, '0')}_${sanitizeFilename(scene.title)}.${ext}`,
              blob
            );
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, `${sanitizeFilename(project.name)}_images.zip`);
    } catch (error) {
      console.error('Failed to download images:', error);
    } finally {
      setDownloadingImages(false);
    }
  }, [characters, scenes, project.name]);

  const handleDownloadVideos = useCallback(async () => {
    setDownloadingVideos(true);
    try {
      const zip = new JSZip();
      const videosFolder = zip.folder('videos');

      for (const scene of scenes) {
        if (scene.videoUrl) {
          const blob = await fetchAsBlob(scene.videoUrl);
          if (blob) {
            const ext = getExtension(scene.videoUrl, blob.type);
            const sceneNum = scene.number || scenes.indexOf(scene) + 1;
            videosFolder?.file(
              `scene_${String(sceneNum).padStart(2, '0')}_${sanitizeFilename(scene.title)}.${ext}`,
              blob
            );
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, `${sanitizeFilename(project.name)}_videos.zip`);
    } catch (error) {
      console.error('Failed to download videos:', error);
    } finally {
      setDownloadingVideos(false);
    }
  }, [scenes, project.name]);

  const handleDownloadAudio = useCallback(async () => {
    setDownloadingAudio(true);
    try {
      const zip = new JSZip();
      const audioFolder = zip.folder('audio');

      for (const scene of scenes) {
        const sceneNum = scene.number || scenes.indexOf(scene) + 1;
        const sceneFolder = audioFolder?.folder(`scene_${String(sceneNum).padStart(2, '0')}`);

        const dialogueLines = scene.dialogue || [];
        for (let i = 0; i < dialogueLines.length; i++) {
          const line = dialogueLines[i];
          if (line.audioUrl) {
            const blob = await fetchAsBlob(line.audioUrl);
            if (blob) {
              const ext = getExtension(line.audioUrl, blob.type);
              sceneFolder?.file(
                `${String(i + 1).padStart(2, '0')}_${sanitizeFilename(line.characterName || 'unknown')}.${ext}`,
                blob
              );
            }
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, `${sanitizeFilename(project.name)}_audio.zip`);
    } catch (error) {
      console.error('Failed to download audio:', error);
    } finally {
      setDownloadingAudio(false);
    }
  }, [scenes, project.name]);

  const handleDownloadAll = useCallback(async () => {
    setDownloadingAll(true);
    try {
      const zip = new JSZip();

      // Images folder
      const imagesFolder = zip.folder('images');
      const charactersFolder = imagesFolder?.folder('characters');
      const scenesFolder = imagesFolder?.folder('scenes');

      for (const char of characters) {
        if (char.imageUrl) {
          const blob = await fetchAsBlob(char.imageUrl);
          if (blob) {
            const ext = getExtension(char.imageUrl, blob.type);
            charactersFolder?.file(`${sanitizeFilename(char.name)}.${ext}`, blob);
          }
        }
      }

      for (const scene of scenes) {
        if (scene.imageUrl) {
          const blob = await fetchAsBlob(scene.imageUrl);
          if (blob) {
            const ext = getExtension(scene.imageUrl, blob.type);
            const sceneNum = scene.number || scenes.indexOf(scene) + 1;
            scenesFolder?.file(
              `scene_${String(sceneNum).padStart(2, '0')}_${sanitizeFilename(scene.title)}.${ext}`,
              blob
            );
          }
        }
      }

      // Videos folder
      const videosFolder = zip.folder('videos');
      for (const scene of scenes) {
        if (scene.videoUrl) {
          const blob = await fetchAsBlob(scene.videoUrl);
          if (blob) {
            const ext = getExtension(scene.videoUrl, blob.type);
            const sceneNum = scene.number || scenes.indexOf(scene) + 1;
            videosFolder?.file(
              `scene_${String(sceneNum).padStart(2, '0')}_${sanitizeFilename(scene.title)}.${ext}`,
              blob
            );
          }
        }
      }

      // Audio folder
      const audioFolder = zip.folder('audio');
      for (const scene of scenes) {
        const sceneNum = scene.number || scenes.indexOf(scene) + 1;
        const sceneAudioFolder = audioFolder?.folder(`scene_${String(sceneNum).padStart(2, '0')}`);

        const dialogueLines = scene.dialogue || [];
        for (let i = 0; i < dialogueLines.length; i++) {
          const line = dialogueLines[i];
          if (line.audioUrl) {
            const blob = await fetchAsBlob(line.audioUrl);
            if (blob) {
              const ext = getExtension(line.audioUrl, blob.type);
              sceneAudioFolder?.file(
                `${String(i + 1).padStart(2, '0')}_${sanitizeFilename(line.characterName || 'unknown')}.${ext}`,
                blob
              );
            }
          }
        }
      }

      // Add dialogues.txt
      let dialoguesText = `# ${project.story?.title || project.name}\n# Dialogues\n\n`;
      for (const scene of scenes) {
        const sceneNum = scene.number || scenes.indexOf(scene) + 1;
        dialoguesText += `## Scene ${sceneNum}: ${scene.title}\n\n`;
        for (const line of (scene.dialogue || [])) {
          dialoguesText += `${line.characterName}: "${line.text}"\n`;
        }
        dialoguesText += '\n';
      }
      zip.file('dialogues.txt', dialoguesText);

      // Add project.json
      const projectJson = exportProject(project.id);
      if (projectJson) {
        zip.file('project.json', projectJson);
      }

      // Add prompts.md
      const markdown = exportProjectAsMarkdown(
        project.story,
        characters,
        scenes,
        project.style
      );
      zip.file('prompts.md', markdown);

      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, `${sanitizeFilename(project.name)}_complete.zip`);
    } catch (error) {
      console.error('Failed to download all assets:', error);
    } finally {
      setDownloadingAll(false);
    }
  }, [project, characters, scenes, exportProject]);

  const handleDownloadDialogues = useCallback(() => {
    let dialoguesText = `# ${project.story?.title || project.name}\n# Complete Dialogues\n\n`;

    for (const scene of scenes) {
      const sceneNum = scene.number || scenes.indexOf(scene) + 1;
      dialoguesText += `═══════════════════════════════════════════════════════════════\n`;
      dialoguesText += `SCENE ${sceneNum}: ${scene.title}\n`;
      dialoguesText += `═══════════════════════════════════════════════════════════════\n\n`;

      const dialogueLines = scene.dialogue || [];
      if (dialogueLines.length === 0) {
        dialoguesText += `(No dialogue)\n\n`;
      } else {
        for (const line of dialogueLines) {
          dialoguesText += `${line.characterName}:\n"${line.text}"\n\n`;
        }
      }
    }

    const blob = new Blob([dialoguesText], { type: 'text/plain' });
    downloadBlob(blob, `${sanitizeFilename(project.name)}_dialogues.txt`);
  }, [scenes, project.story?.title, project.name]);

  return {
    downloadingImages,
    downloadingVideos,
    downloadingAudio,
    downloadingAll,
    handleDownloadImages,
    handleDownloadVideos,
    handleDownloadAudio,
    handleDownloadAll,
    handleDownloadDialogues,
  };
}
