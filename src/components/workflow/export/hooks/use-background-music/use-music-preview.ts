// Preview state management for background music

import { useState, useCallback, useRef } from 'react';

export interface UseMusicPreviewReturn {
  previewUrl: string | null;
  isPreviewPlaying: boolean;
  previewRef: React.RefObject<HTMLAudioElement | null>;
  setPreviewUrl: (url: string | null) => void;
  togglePreview: () => void;
  clearPreview: () => void;
}

export function useMusicPreview(): UseMusicPreviewReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = useCallback(() => {
    if (!previewRef.current) return;

    if (isPreviewPlaying) {
      previewRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewRef.current.play();
      setIsPreviewPlaying(true);
    }
  }, [isPreviewPlaying]);

  const clearPreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.pause();
    }
    setPreviewUrl(null);
    setIsPreviewPlaying(false);
  }, []);

  return {
    previewUrl,
    isPreviewPlaying,
    previewRef,
    setPreviewUrl,
    togglePreview,
    clearPreview,
  };
}
