// File upload handling for background music

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BackgroundMusic } from '@/types/project';
import { DEFAULT_VALUES } from './constants';

export interface UseMusicUploadReturn {
  uploadMusic: (file: File, projectId: string, updateProject: (id: string, data: any) => void) => Promise<void>;
}

export function useMusicUpload(): UseMusicUploadReturn {
  const uploadMusic = useCallback(async (file: File, projectId: string, updateProject: (id: string, data: any) => void) => {
    try {
      const reader = new FileReader();

      const audioUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Create audio element to get duration
      const audio = new Audio(audioUrl);
      const duration = await new Promise<number>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
        audio.addEventListener('error', () => {
          resolve(0);
        });
      });

      const newMusic: BackgroundMusic = {
        id: uuidv4(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        audioUrl,
        duration,
        volume: DEFAULT_VALUES.VOLUME,
        source: 'upload',
      };

      updateProject(projectId, { backgroundMusic: newMusic });
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  }, []);

  return {
    uploadMusic,
  };
}
