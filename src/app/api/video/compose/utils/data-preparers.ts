// Video Composition - Data Preparation Utilities

import type { Scene, BackgroundMusic } from '@/types/project';
import type { SceneData, VoiceoverData, CaptionData, MusicData } from '../types';

/**
 * Convert project scenes to composition format for Modal API
 */
export function prepareSceneData(
  scenes: Scene[],
  transitions?: Record<string, string>,
  includeVoiceovers: boolean = true,
  replaceVideoAudio: boolean = false
): SceneData[] {
  return scenes.map((scene, index) => {
    // Collect voiceovers from dialogue lines that have audio
    const voiceovers: VoiceoverData[] = [];
    let dialogueTime = 0;

    if (includeVoiceovers && scene.dialogue) {
      for (const line of scene.dialogue) {
        if (line.audioUrl) {
          voiceovers.push({
            audio_url: line.audioUrl,
            start_time: dialogueTime,
            duration: line.audioDuration || 3,
            volume: 1.0,
            character_name: line.characterName,
          });
          dialogueTime += (line.audioDuration || 3) + 0.3; // Small gap between lines
        }
      }
    }

    return {
      id: scene.id,
      video_url: scene.videoUrl || undefined,
      image_url: scene.imageUrl || undefined,
      duration: scene.duration || 6,
      transition_to_next: transitions?.[scene.id] || (index < scenes.length - 1 ? 'fade' : undefined),
      voiceovers: voiceovers.length > 0 ? voiceovers : undefined,
      strip_original_audio: replaceVideoAudio,
    };
  });
}

/**
 * Convert project captions to composition format for Modal API
 */
export function prepareCaptionData(scenes: Scene[]): CaptionData[] {
  const captions: CaptionData[] = [];
  let globalTime = 0;

  for (const scene of scenes) {
    const sceneDuration = scene.duration || 6;

    if (scene.captions) {
      for (const caption of scene.captions) {
        captions.push({
          text: caption.text,
          start_time: globalTime + (caption.startTime || 0),
          end_time: globalTime + (caption.endTime || sceneDuration),
          font_size: caption.style?.fontSize === 'large' ? 48 : caption.style?.fontSize === 'small' ? 24 : 36,
          font_color: caption.style?.color || '#FFFFFF',
          background_color: caption.style?.backgroundColor || '#00000080',
          position: caption.style?.position || 'bottom',
        });
      }
    }

    globalTime += sceneDuration;
  }

  return captions;
}

/**
 * Prepare music data for composition
 */
export function prepareMusicData(music: BackgroundMusic | undefined): MusicData | null {
  if (!music || !music.audioUrl) return null;

  return {
    audio_url: music.audioUrl,
    volume: music.volume || 0.3,
    start_offset: music.startOffset || 0,
    fade_in: 2.0,
    fade_out: 2.0,
  };
}
