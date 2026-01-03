import { useState, useRef, useEffect, useCallback } from 'react';
import { dBToLinear, linearToDb } from '@/lib/utils/audio';
import { SCENE_DURATION } from '@/lib/constants/video-editor';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, Caption } from '@/types/project';

interface UsePreviewPlayerReturn {
  // State
  isPlaying: boolean;
  currentIndex: number;
  progress: number;
  volume: number;
  isMuted: boolean;
  musicVolume: number;
  musicVolumeDb: number;
  currentCaption: Caption | null;
  currentMovieTime: number;
  totalDuration: number;
  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  musicRef: React.RefObject<HTMLAudioElement | null>;
  // Controls
  togglePlayPause: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  jumpToFirst: () => void;
  jumpToLast: () => void;
  jumpToScene: (index: number) => void;
  handleSeek: (value: number[]) => void;
  handleVolumeChange: (value: number[]) => void;
  toggleMute: () => void;
  handleMusicVolumeDbChange: (value: number[]) => void;
  handleVideoEnded: () => void;
  handleVideoTimeUpdate: () => void;
  handleVideoCanPlay: () => void;
  getVideoUrl: (url: string) => string;
}

export function usePreviewPlayer(project: Project): UsePreviewPlayerReturn {
  const { updateProject } = useProjectStore();
  // Safe accessor for scenes array
  const scenes = project.scenes || [];
  const totalScenes = scenes.length;

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(project.musicVolume ?? 0.3);
  const [musicVolumeDb, setMusicVolumeDb] = useState(() => linearToDb(project.musicVolume ?? 0.3));
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoBlobCache = useRef<Map<string, string>>(new Map());
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const seekPositionRef = useRef<number>(0);

  const totalDuration = totalScenes * SCENE_DURATION;
  const currentMovieTime = currentIndex * SCENE_DURATION + (progress / 100) * SCENE_DURATION;

  // Get video URL (use proxy for S3 URLs to avoid CORS)
  const getVideoUrl = useCallback((url: string) => {
    // Check cache first
    const cached = videoBlobCache.current.get(url);
    if (cached) return cached;

    // Use proxy for S3 URLs
    const isS3Url = url.includes('s3.') && url.includes('amazonaws.com');
    return isS3Url ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Go to next scene
  const goToNext = useCallback(() => {
    clearTimers();
    setProgress(0);
    seekPositionRef.current = 0;

    if (currentIndex < totalScenes - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [currentIndex, totalScenes, clearTimers]);

  // Go to previous scene
  const goToPrevious = useCallback(() => {
    clearTimers();
    setProgress(0);
    seekPositionRef.current = 0;

    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, clearTimers]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Jump to first scene
  const jumpToFirst = useCallback(() => {
    clearTimers();
    setProgress(0);
    seekPositionRef.current = 0;
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [clearTimers]);

  // Jump to last scene
  const jumpToLast = useCallback(() => {
    clearTimers();
    setProgress(0);
    seekPositionRef.current = 0;
    setCurrentIndex(totalScenes - 1);
    setIsPlaying(false);
  }, [clearTimers, totalScenes]);

  // Jump to specific scene
  const jumpToScene = useCallback((index: number) => {
    clearTimers();
    setProgress(0);
    seekPositionRef.current = 0;
    setCurrentIndex(index);
  }, [clearTimers]);

  // Handle seek
  const handleSeek = useCallback((value: number[]) => {
    const seekTime = value[0];
    const sceneIndex = Math.floor(seekTime / SCENE_DURATION);
    const timeInScene = seekTime % SCENE_DURATION;
    const progressInScene = (timeInScene / SCENE_DURATION) * 100;

    clearTimers();
    seekPositionRef.current = timeInScene;
    setCurrentIndex(Math.min(sceneIndex, totalScenes - 1));
    setProgress(progressInScene);

    if (videoRef.current && scenes[sceneIndex]?.videoUrl) {
      videoRef.current.currentTime = timeInScene;
    }
  }, [clearTimers, totalScenes, scenes]);

  // Handle volume change
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (videoRef.current) {
        videoRef.current.muted = newMuted;
      }
      return newMuted;
    });
  }, []);

  // Handle music volume change (dB scale)
  const handleMusicVolumeDbChange = useCallback((value: number[]) => {
    const newDb = value[0];
    const newLinear = dBToLinear(newDb);
    setMusicVolumeDb(newDb);
    setMusicVolume(newLinear);
    if (musicRef.current) {
      musicRef.current.volume = newLinear;
    }
    updateProject(project.id, { musicVolume: newLinear });
  }, [project.id, updateProject]);

  // Handle video ended
  const handleVideoEnded = useCallback(() => {
    goToNext();
  }, [goToNext]);

  // Handle video time update
  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const duration = video.duration || SCENE_DURATION;
      const newProgress = (video.currentTime / duration) * 100;
      setProgress(Math.min(newProgress, 100));
    }
  }, []);

  // Handle video can play - this is called when video has enough data to start
  const handleVideoCanPlay = useCallback(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Set seek position if needed
    if (seekPositionRef.current > 0 && Math.abs(video.currentTime - seekPositionRef.current) > 0.5) {
      video.currentTime = seekPositionRef.current;
    }

    // Only play if we're supposed to be playing
    if (isPlaying) {
      playPromiseRef.current = video.play();
      playPromiseRef.current.catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Video playback error:', error);
        }
      });
    }
  }, [isPlaying]);

  // Update caption based on playback time
  useEffect(() => {
    const scene = scenes[currentIndex];
    if (!scene?.captions || scene.captions.length === 0) {
      setCurrentCaption(null);
      return;
    }

    const timeInScene = (progress / 100) * SCENE_DURATION;
    const activeCaption = scene.captions.find(
      cap => timeInScene >= cap.startTime && timeInScene <= cap.endTime
    );
    setCurrentCaption(activeCaption || null);
  }, [currentIndex, progress, scenes]);

  // Sync background music with playback
  useEffect(() => {
    if (!musicRef.current || !project.backgroundMusic) return;

    const music = musicRef.current;
    music.volume = musicVolume;

    if (isPlaying) {
      music.play().catch(err => console.warn('Music playback error:', err));
    } else {
      music.pause();
    }
  }, [isPlaying, project.backgroundMusic, musicVolume]);

  // Sync volume to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [currentIndex, volume, isMuted]);

  // Prefetch video blobs (use proxy for S3 URLs)
  useEffect(() => {
    const prefetchVideos = async () => {
      for (const scene of scenes) {
        if (scene.videoUrl && !videoBlobCache.current.has(scene.videoUrl)) {
          try {
            // Use proxy for S3 URLs to avoid CORS
            const isS3Url = scene.videoUrl.includes('s3.') && scene.videoUrl.includes('amazonaws.com');
            const fetchUrl = isS3Url ? `/api/proxy?url=${encodeURIComponent(scene.videoUrl)}` : scene.videoUrl;

            const response = await fetch(fetchUrl);
            if (!response.ok) continue;

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            videoBlobCache.current.set(scene.videoUrl, blobUrl);
          } catch (error) {
            console.warn('Failed to prefetch video:', error);
          }
        }
      }
    };

    prefetchVideos();

    return () => {
      videoBlobCache.current.forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl);
      });
      videoBlobCache.current.clear();
    };
  }, [scenes]);

  // Handle scene transitions and playback
  useEffect(() => {
    if (!isPlaying) {
      clearTimers();
      if (videoRef.current) {
        const video = videoRef.current;
        seekPositionRef.current = video.currentTime;
        if (playPromiseRef.current) {
          playPromiseRef.current
            .then(() => video.pause())
            .catch(() => {});
          playPromiseRef.current = null;
        } else {
          video.pause();
        }
      }
      return;
    }

    const scene = scenes[currentIndex];
    if (!scene) return;

    if (scene.videoUrl && videoRef.current) {
      const video = videoRef.current;

      // Try to play - if video is ready, play immediately
      // If not ready, the onCanPlay handler will play it
      const tryPlay = () => {
        if (seekPositionRef.current > 0) {
          video.currentTime = seekPositionRef.current;
        }
        playPromiseRef.current = video.play();
        playPromiseRef.current.catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('Video playback error:', error);
          }
        });
      };

      if (video.readyState >= 2) {
        // HAVE_CURRENT_DATA or better - try to play
        tryPlay();
      }
      // If not ready, onCanPlay will trigger playback
    } else {
      // Image-only scene - use timer
      const startOffset = seekPositionRef.current * 1000;
      const startTime = Date.now() - startOffset;
      const duration = SCENE_DURATION * 1000;
      const remainingTime = duration - startOffset;

      imageTimerRef.current = setTimeout(() => {
        goToNext();
      }, remainingTime);

      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = (elapsed / duration) * 100;
        setProgress(Math.min(newProgress, 100));
      }, 100);
    }

    return () => {
      clearTimers();
    };
  }, [isPlaying, currentIndex, scenes, clearTimers, goToNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isPlaying,
    currentIndex,
    progress,
    volume,
    isMuted,
    musicVolume,
    musicVolumeDb,
    currentCaption,
    currentMovieTime,
    totalDuration,
    videoRef,
    musicRef,
    togglePlayPause,
    goToNext,
    goToPrevious,
    jumpToFirst,
    jumpToLast,
    jumpToScene,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    handleMusicVolumeDbChange,
    handleVideoEnded,
    handleVideoTimeUpdate,
    handleVideoCanPlay,
    getVideoUrl,
  };
}
