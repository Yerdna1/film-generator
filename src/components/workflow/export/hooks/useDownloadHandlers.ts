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
      console.log('[DownloadImages] Starting download. Characters:', characters.length, 'Scenes:', scenes.length);
      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      const charactersFolder = imagesFolder?.folder('characters');
      const scenesFolder = imagesFolder?.folder('scenes');

      let successCount = 0;
      let failCount = 0;

      for (const char of characters) {
        if (char.imageUrl) {
          console.log('[DownloadImages] Fetching character image:', char.name, char.imageUrl);
          const blob = await fetchAsBlob(char.imageUrl);
          if (blob) {
            const ext = getExtension(char.imageUrl, blob.type);
            charactersFolder?.file(`${sanitizeFilename(char.name)}.${ext}`, blob);
            successCount++;
            console.log('[DownloadImages] ✓ Character image added:', char.name);
          } else {
            failCount++;
            console.warn('[DownloadImages] ✗ Failed to fetch character image:', char.name);
          }
        }
      }

      for (const scene of scenes) {
        if (scene.imageUrl) {
          console.log('[DownloadImages] Fetching scene image:', scene.title, scene.imageUrl);
          const blob = await fetchAsBlob(scene.imageUrl);
          if (blob) {
            const ext = getExtension(scene.imageUrl, blob.type);
            const sceneNum = scene.number || scenes.indexOf(scene) + 1;
            scenesFolder?.file(
              `scene_${String(sceneNum).padStart(2, '0')}_${sanitizeFilename(scene.title)}.${ext}`,
              blob
            );
            successCount++;
            console.log('[DownloadImages] ✓ Scene image added:', scene.title);
          } else {
            failCount++;
            console.warn('[DownloadImages] ✗ Failed to fetch scene image:', scene.title);
          }
        }
      }

      console.log(`[DownloadImages] Complete: ${successCount} succeeded, ${failCount} failed`);

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
      console.log('[DownloadVideos] Starting download. Scenes:', scenes.length);
      const zip = new JSZip();
      const videosFolder = zip.folder('videos');

      let successCount = 0;
      let failCount = 0;

      for (const scene of scenes) {
        if (scene.videoUrl) {
          console.log('[DownloadVideos] Fetching video:', scene.title, scene.videoUrl);
          const blob = await fetchAsBlob(scene.videoUrl);
          if (blob) {
            const ext = getExtension(scene.videoUrl, blob.type);
            const sceneNum = scene.number || scenes.indexOf(scene) + 1;
            videosFolder?.file(
              `scene_${String(sceneNum).padStart(2, '0')}_${sanitizeFilename(scene.title)}.${ext}`,
              blob
            );
            successCount++;
            console.log('[DownloadVideos] ✓ Video added:', scene.title);
          } else {
            failCount++;
            console.warn('[DownloadVideos] ✗ Failed to fetch video:', scene.title);
          }
        }
      }

      console.log(`[DownloadVideos] Complete: ${successCount} succeeded, ${failCount} failed`);

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
      console.log('[DownloadAudio] Starting download. Scenes:', scenes.length);
      const zip = new JSZip();
      const audioFolder = zip.folder('audio');

      let successCount = 0;
      let failCount = 0;

      for (const scene of scenes) {
        const sceneNum = scene.number || scenes.indexOf(scene) + 1;
        const sceneFolder = audioFolder?.folder(`scene_${String(sceneNum).padStart(2, '0')}`);

        const dialogueLines = scene.dialogue || [];
        for (let i = 0; i < dialogueLines.length; i++) {
          const line = dialogueLines[i];

          // Try to get audio from primary audioUrl or audioVersions array
          const audioUrl = line.audioUrl || (line.audioVersions && line.audioVersions.length > 0 ? line.audioVersions[0].audioUrl : null);

          if (audioUrl) {
            console.log('[DownloadAudio] Fetching audio:', line.characterName, line.text?.substring(0, 30), audioUrl.substring(0, 100));
            const blob = await fetchAsBlob(audioUrl);
            if (blob) {
              const ext = getExtension(audioUrl, blob.type);
              sceneFolder?.file(
                `${String(i + 1).padStart(2, '0')}_${sanitizeFilename(line.characterName || 'unknown')}.${ext}`,
                blob
              );
              successCount++;
              console.log('[DownloadAudio] ✓ Audio added:', line.characterName);
            } else {
              failCount++;
              console.warn('[DownloadAudio] ✗ Failed to fetch audio:', line.characterName);
            }
          } else {
            console.log('[DownloadAudio] No audio found for dialogue:', line.characterName, line.text?.substring(0, 30));
          }
        }
      }

      console.log(`[DownloadAudio] Complete: ${successCount} succeeded, ${failCount} failed`);

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
      console.log('[DownloadAll] Starting full download');
      const zip = new JSZip();

      let imageSuccess = 0;
      let videoSuccess = 0;
      let audioSuccess = 0;

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
            imageSuccess++;
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
            imageSuccess++;
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
            videoSuccess++;
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

          // Try to get audio from primary audioUrl or audioVersions array
          const audioUrl = line.audioUrl || (line.audioVersions && line.audioVersions.length > 0 ? line.audioVersions[0].audioUrl : null);

          if (audioUrl) {
            console.log('[DownloadAll] Fetching audio:', line.characterName, line.text?.substring(0, 30), audioUrl.substring(0, 100));
            const blob = await fetchAsBlob(audioUrl);
            if (blob) {
              const ext = getExtension(audioUrl, blob.type);
              sceneAudioFolder?.file(
                `${String(i + 1).padStart(2, '0')}_${sanitizeFilename(line.characterName || 'unknown')}.${ext}`,
                blob
              );
              audioSuccess++;
              console.log('[DownloadAll] ✓ Audio added:', line.characterName);
            } else {
              console.warn('[DownloadAll] ✗ Failed to fetch audio:', line.characterName);
            }
          } else {
            console.log('[DownloadAll] No audio found for dialogue:', line.characterName, line.text?.substring(0, 30));
          }
        }
      }

      console.log(`[DownloadAll] Complete - Images: ${imageSuccess}, Videos: ${videoSuccess}, Audio: ${audioSuccess}`);

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
    console.log('[DownloadDialogues] Starting. Project:', project.name, 'Scenes:', scenes.length);

    let dialoguesText = `# ${project.story?.title || project.name}\n# Complete Dialogues\n\n`;

    let totalDialogues = 0;

    for (const scene of scenes) {
      const sceneNum = scene.number || scenes.indexOf(scene) + 1;
      console.log(`[DownloadDialogues] Scene ${sceneNum}: ${scene.title}, Dialogue lines:`, scene.dialogue?.length || 0);

      dialoguesText += `═══════════════════════════════════════════════════════════════\n`;
      dialoguesText += `SCENE ${sceneNum}: ${scene.title}\n`;
      dialoguesText += `═══════════════════════════════════════════════════════════════\n\n`;

      const dialogueLines = scene.dialogue || [];
      if (dialogueLines.length === 0) {
        dialoguesText += `(No dialogue)\n\n`;
      } else {
        for (const line of dialogueLines) {
          dialoguesText += `${line.characterName}:\n"${line.text}"\n\n`;
          totalDialogues++;
        }
      }
    }

    console.log(`[DownloadDialogues] Complete. Total dialogue lines: ${totalDialogues}`);
    console.log(`[DownloadDialogues] Text length: ${dialoguesText.length} characters`);

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
