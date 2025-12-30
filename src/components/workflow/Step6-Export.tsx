'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import {
  Download,
  FileJson,
  FileText,
  Package,
  Copy,
  CheckCircle2,
  Users,
  Film,
  Video,
  Mic,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  FolderArchive,
  ClipboardList,
  Clock,
  Play,
  Pause,
  Scissors,
  Coins,
  ImageDown,
  VideoIcon,
  Music,
  Archive,
  FileDown,
  Loader2,
  MessageSquareText,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  Wand2,
  Trash2,
} from 'lucide-react';
import { COSTS } from '@/lib/services/credits';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TransitionType, Caption } from '@/types/project';

// Transition variants for Framer Motion
export const transitionVariants: Record<TransitionType, {
  initial: object;
  animate: object;
  exit: object;
}> = {
  none: { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideLeft: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 }
  },
  slideRight: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 }
  },
  slideUp: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 }
  },
  slideDown: {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 }
  },
  zoomIn: {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.5, opacity: 0 }
  },
  zoomOut: {
    initial: { scale: 1.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 }
  },
  swoosh: {
    initial: { x: '100%', rotate: -10, opacity: 0 },
    animate: { x: 0, rotate: 0, opacity: 1 },
    exit: { x: '-100%', rotate: 10, opacity: 0 }
  },
};

// Caption animation variants
export const captionAnimations: Record<string, {
  initial: object;
  animate: object;
  exit: object;
}> = {
  none: { initial: {}, animate: {}, exit: {} },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
  },
  typewriter: {
    initial: { opacity: 0, width: 0 },
    animate: { opacity: 1, width: 'auto' },
    exit: { opacity: 0 }
  },
  popIn: {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 }
  },
};

// Default caption style
export const defaultCaptionStyle = {
  fontSize: 'medium' as const,
  fontFamily: 'default' as const,
  color: '#ffffff',
  backgroundColor: 'rgba(0,0,0,0.7)',
  position: 'bottom' as const,
  textShadow: true,
};

// Font size mapping
const fontSizes = {
  small: '0.875rem',
  medium: '1.125rem',
  large: '1.5rem',
};

// Transition type labels for UI
const transitionLabels: Record<TransitionType, string> = {
  none: 'None',
  fade: 'Fade',
  slideLeft: 'Slide Left',
  slideRight: 'Slide Right',
  slideUp: 'Slide Up',
  slideDown: 'Slide Down',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  swoosh: 'Swoosh',
};

// dB to linear volume conversion (for music)
// Range: -30dB to +6dB (mapped to 0.0316 to 2.0 linear, capped at 1.0 for HTML audio)
const dBToLinear = (dB: number): number => {
  // dB = 20 * log10(linear), so linear = 10^(dB/20)
  const linear = Math.pow(10, dB / 20);
  return Math.min(linear, 1); // Cap at 1.0 for HTML audio
};

const linearToDb = (linear: number): number => {
  if (linear <= 0) return -60; // Effectively silent
  return 20 * Math.log10(linear);
};

// Default transition settings
const DEFAULT_TRANSITION_TYPE: TransitionType = 'swoosh';
const DEFAULT_TRANSITION_DURATION = 400; // 0.4 seconds

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useProjectStore } from '@/lib/stores/project-store';
import { exportProjectAsMarkdown, formatCharacterForExport, formatSceneForExport } from '@/lib/prompts/master-prompt';
import { CopyButton } from '@/components/shared/CopyButton';
import type { Project, ExportFormat } from '@/types/project';

interface Step6Props {
  project: Project;
}

export function Step6Export({ project: initialProject }: Step6Props) {
  const t = useTranslations();
  const { exportProject, projects, updateScene, updateProject } = useProjectStore();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingImages, setDownloadingImages] = useState(false);
  const [downloadingVideos, setDownloadingVideos] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Movie Preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(project.musicVolume ?? 0.3);
  const [musicVolumeDb, setMusicVolumeDb] = useState(() => linearToDb(project.musicVolume ?? 0.3));
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);

  // Movie Preview refs
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoBlobCache = useRef<Map<string, string>>(new Map());
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const seekPositionRef = useRef<number>(0); // Track seek position in seconds within current scene

  // Calculate completion stats
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

  // Movie Preview - Scene duration and total calculations
  const SCENE_DURATION = 6; // 6 seconds per scene
  const totalPreviewDuration = totalScenes * SCENE_DURATION;
  const currentScene = project.scenes[currentPreviewIndex];
  const hasVideo = currentScene?.videoUrl;
  const hasImage = currentScene?.imageUrl;
  const hasMedia = hasVideo || hasImage;

  // Get cached video URL or original
  const getVideoUrl = useCallback((url: string) => {
    return videoBlobCache.current.get(url) || url;
  }, []);

  // Format time as MM:SS
  const formatPreviewTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate current time in the movie
  const currentMovieTime = currentPreviewIndex * SCENE_DURATION + (previewProgress / 100) * SCENE_DURATION;

  // Clear all preview timers
  const clearPreviewTimers = useCallback(() => {
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
  const goToNextPreviewScene = useCallback(() => {
    clearPreviewTimers();
    setPreviewProgress(0);
    seekPositionRef.current = 0;

    if (currentPreviewIndex < totalScenes - 1) {
      setCurrentPreviewIndex(prev => prev + 1);
    } else {
      // End of movie - stop playback and reset
      setIsPreviewPlaying(false);
      setCurrentPreviewIndex(0);
    }
  }, [currentPreviewIndex, totalScenes, clearPreviewTimers]);

  // Go to previous scene
  const goToPreviousPreviewScene = useCallback(() => {
    clearPreviewTimers();
    setPreviewProgress(0);
    seekPositionRef.current = 0;

    if (currentPreviewIndex > 0) {
      setCurrentPreviewIndex(prev => prev - 1);
    }
  }, [currentPreviewIndex, clearPreviewTimers]);

  // Play/Pause toggle
  const handlePreviewPlayPause = useCallback(() => {
    setIsPreviewPlaying(prev => !prev);
  }, []);

  // Jump to first scene
  const jumpToFirstScene = useCallback(() => {
    clearPreviewTimers();
    setPreviewProgress(0);
    seekPositionRef.current = 0;
    setCurrentPreviewIndex(0);
    setIsPreviewPlaying(false);
  }, [clearPreviewTimers]);

  // Jump to last scene
  const jumpToLastScene = useCallback(() => {
    clearPreviewTimers();
    setPreviewProgress(0);
    seekPositionRef.current = 0;
    setCurrentPreviewIndex(totalScenes - 1);
    setIsPreviewPlaying(false);
  }, [clearPreviewTimers, totalScenes]);

  // Handle slider seek
  const handlePreviewSeek = useCallback((value: number[]) => {
    const seekTime = value[0];
    const sceneIndex = Math.floor(seekTime / SCENE_DURATION);
    const timeInScene = seekTime % SCENE_DURATION;
    const progressInScene = (timeInScene / SCENE_DURATION) * 100;

    clearPreviewTimers();
    seekPositionRef.current = timeInScene;
    setCurrentPreviewIndex(Math.min(sceneIndex, totalScenes - 1));
    setPreviewProgress(progressInScene);

    // If video, seek to position
    if (previewVideoRef.current && project.scenes[sceneIndex]?.videoUrl) {
      previewVideoRef.current.currentTime = timeInScene;
    }
  }, [clearPreviewTimers, totalScenes, project.scenes]);

  // Handle video ended
  const handlePreviewVideoEnded = useCallback(() => {
    goToNextPreviewScene();
  }, [goToNextPreviewScene]);

  // Handle video time update
  const handlePreviewVideoTimeUpdate = useCallback(() => {
    if (previewVideoRef.current) {
      const video = previewVideoRef.current;
      const duration = video.duration || SCENE_DURATION;
      const progress = (video.currentTime / duration) * 100;
      setPreviewProgress(Math.min(progress, 100));
    }
  }, []);

  // Jump to specific scene
  const jumpToScene = useCallback((index: number) => {
    clearPreviewTimers();
    setPreviewProgress(0);
    seekPositionRef.current = 0;
    setCurrentPreviewIndex(index);
  }, [clearPreviewTimers]);

  // Handle volume change
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setPreviewVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (previewVideoRef.current) {
      previewVideoRef.current.volume = newVolume;
      previewVideoRef.current.muted = newVolume === 0;
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (previewVideoRef.current) {
        previewVideoRef.current.muted = newMuted;
      }
      return newMuted;
    });
  }, []);

  // Handle music volume change (using dB scale)
  const handleMusicVolumeDbChange = useCallback((value: number[]) => {
    const newDb = value[0];
    const newLinear = dBToLinear(newDb);
    setMusicVolumeDb(newDb);
    setMusicVolume(newLinear);
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = newLinear;
    }
    // Save to project (store linear value)
    updateProject(project.id, { musicVolume: newLinear });
  }, [project.id, updateProject]);

  // Update scene transition
  const handleTransitionChange = useCallback((sceneId: string, transitionType: TransitionType) => {
    updateScene(project.id, sceneId, {
      transition: { type: transitionType, duration: DEFAULT_TRANSITION_DURATION }
    });
  }, [project.id, updateScene]);

  // Apply default transition (swoosh) to all scenes at once
  const applyTransitionToAll = useCallback((transitionType: TransitionType = DEFAULT_TRANSITION_TYPE) => {
    project.scenes.forEach((scene) => {
      updateScene(project.id, scene.id, {
        transition: { type: transitionType, duration: DEFAULT_TRANSITION_DURATION }
      });
    });
  }, [project.id, project.scenes, updateScene]);

  // Clear all transitions (set to none)
  const clearAllTransitions = useCallback(() => {
    project.scenes.forEach((scene) => {
      updateScene(project.id, scene.id, {
        transition: { type: 'none', duration: 0 }
      });
    });
  }, [project.id, project.scenes, updateScene]);

  // Get current transition for a scene (defaults to fade)
  const getSceneTransition = useCallback((sceneIndex: number) => {
    const scene = project.scenes[sceneIndex];
    return scene?.transition?.type || 'fade';
  }, [project.scenes]);

  // Get transition duration for a scene
  const getTransitionDuration = useCallback((sceneIndex: number) => {
    const scene = project.scenes[sceneIndex];
    return (scene?.transition?.duration || 500) / 1000; // Convert to seconds
  }, [project.scenes]);

  // Update current caption based on playback time
  useEffect(() => {
    const scene = project.scenes[currentPreviewIndex];
    if (!scene?.captions || scene.captions.length === 0) {
      setCurrentCaption(null);
      return;
    }

    const timeInScene = (previewProgress / 100) * SCENE_DURATION;
    const activeCaption = scene.captions.find(
      cap => timeInScene >= cap.startTime && timeInScene <= cap.endTime
    );
    setCurrentCaption(activeCaption || null);
  }, [currentPreviewIndex, previewProgress, project.scenes]);

  // Sync background music with playback
  useEffect(() => {
    if (!backgroundMusicRef.current || !project.backgroundMusic) return;

    const music = backgroundMusicRef.current;
    music.volume = musicVolume;

    if (isPreviewPlaying) {
      music.play().catch(err => console.warn('Music playback error:', err));
    } else {
      music.pause();
    }
  }, [isPreviewPlaying, project.backgroundMusic, musicVolume]);

  // Sync volume to video element when it changes
  useEffect(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.volume = previewVolume;
      previewVideoRef.current.muted = isMuted;
    }
  }, [currentPreviewIndex, previewVolume, isMuted]);

  // Prefetch video blobs for smoother playback
  useEffect(() => {
    const prefetchVideos = async () => {
      for (const scene of project.scenes) {
        if (scene.videoUrl && !videoBlobCache.current.has(scene.videoUrl)) {
          try {
            const response = await fetch(scene.videoUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            videoBlobCache.current.set(scene.videoUrl, blobUrl);
          } catch (error) {
            // Keep original URL on error
            console.warn('Failed to prefetch video:', error);
          }
        }
      }
    };

    prefetchVideos();

    // Cleanup blob URLs on unmount
    return () => {
      videoBlobCache.current.forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl);
      });
      videoBlobCache.current.clear();
    };
  }, [project.scenes]);

  // Handle video canplay event - play when video is ready
  const handleVideoCanPlay = useCallback(() => {
    if (!isPreviewPlaying || !previewVideoRef.current) return;

    const video = previewVideoRef.current;
    // Set position from seek ref if needed
    if (seekPositionRef.current > 0 && Math.abs(video.currentTime - seekPositionRef.current) > 0.5) {
      video.currentTime = seekPositionRef.current;
    }

    // Store the play promise to handle pause correctly
    playPromiseRef.current = video.play();
    playPromiseRef.current.catch((error) => {
      // Ignore AbortError - it's expected when play is interrupted by pause
      if (error.name !== 'AbortError') {
        console.error('Video playback error:', error);
      }
    });
  }, [isPreviewPlaying]);

  // Handle scene transitions and playback
  useEffect(() => {
    if (!isPreviewPlaying) {
      clearPreviewTimers();
      // Properly handle pause to avoid AbortError
      if (previewVideoRef.current) {
        const video = previewVideoRef.current;
        // Store current position when pausing
        seekPositionRef.current = video.currentTime;
        if (playPromiseRef.current) {
          // Wait for play promise to resolve before pausing
          playPromiseRef.current
            .then(() => video.pause())
            .catch(() => {}); // Ignore AbortError
          playPromiseRef.current = null;
        } else {
          video.pause();
        }
      }
      return;
    }

    const scene = project.scenes[currentPreviewIndex];
    if (!scene) return;

    if (scene.videoUrl && previewVideoRef.current) {
      // Video playback - the canplay event handler will start playback
      // when the video is ready. If video is already loaded, trigger play
      const video = previewVideoRef.current;
      if (video.readyState >= 3) {
        // Video is already ready to play
        if (seekPositionRef.current > 0) {
          video.currentTime = seekPositionRef.current;
        }
        playPromiseRef.current = video.play();
        playPromiseRef.current.catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('Video playback error:', error);
          }
        });
      }
      // Otherwise, canplay event will handle it
    } else {
      // Image slideshow - use timer
      const startOffset = seekPositionRef.current * 1000;
      const startTime = Date.now() - startOffset;
      const duration = SCENE_DURATION * 1000;
      const remainingTime = duration - startOffset;

      imageTimerRef.current = setTimeout(() => {
        goToNextPreviewScene();
      }, remainingTime);

      // Progress update interval for images
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = (elapsed / duration) * 100;
        setPreviewProgress(Math.min(newProgress, 100));
      }, 100);
    }

    return () => {
      clearPreviewTimers();
    };
  }, [isPreviewPlaying, currentPreviewIndex, project.scenes, clearPreviewTimers, goToNextPreviewScene]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPreviewTimers();
    };
  }, [clearPreviewTimers]);

  const handleExportJSON = () => {
    const json = exportProject(project.id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_project.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportMarkdown = () => {
    const markdown = exportProjectAsMarkdown(
      project.story,
      project.characters,
      project.scenes,
      project.style
    );
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_prompts.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_prompts.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate CapCut-compatible project structure (simplified XML/JSON)
  const handleExportCapCut = () => {
    const fps = 30;
    const sceneDuration = 6; // seconds per scene
    const framesPerScene = fps * sceneDuration;

    // Calculate total duration
    const totalDuration = project.scenes.length * sceneDuration;
    const totalFrames = project.scenes.length * framesPerScene;

    // Create a structured project file for CapCut import
    const capcutProject = {
      meta: {
        name: project.story.title || project.name,
        duration: totalDuration,
        fps: fps,
        width: 1920,
        height: 1080,
        createdAt: new Date().toISOString(),
        generator: 'Film Generator AI Studio'
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
            start: sceneIndex * sceneDuration + (lineIndex * 2), // Stagger dialogue
            hasAudio: !!line.audioUrl,
          }))
        ),
      },
      assets: {
        videos: project.scenes.filter(s => s.videoUrl).map(s => ({
          id: s.id,
          title: s.title,
          duration: s.duration || 6,
        })),
        images: project.scenes.filter(s => s.imageUrl && !s.videoUrl).map(s => ({
          id: s.id,
          title: s.title,
        })),
        audio: project.scenes.flatMap(s =>
          s.dialogue.filter(d => d.audioUrl).map(d => ({
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
          timeStart: `${Math.floor(index * sceneDuration / 60)}:${String((index * sceneDuration) % 60).padStart(2, '0')}`,
          timeEnd: `${Math.floor((index + 1) * sceneDuration / 60)}:${String(((index + 1) * sceneDuration) % 60).padStart(2, '0')}`,
          dialogueLines: scene.dialogue.length,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(capcutProject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_capcut_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to fetch file as blob
  const fetchAsBlob = async (url: string): Promise<Blob | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.blob();
    } catch (error) {
      console.error('Failed to fetch:', url, error);
      return null;
    }
  };

  // Helper function to get file extension from URL or mime type
  const getExtension = (url: string, mimeType?: string): string => {
    if (mimeType) {
      if (mimeType.includes('mp4')) return 'mp4';
      if (mimeType.includes('webm')) return 'webm';
      if (mimeType.includes('png')) return 'png';
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
      if (mimeType.includes('webp')) return 'webp';
      if (mimeType.includes('mp3')) return 'mp3';
      if (mimeType.includes('wav')) return 'wav';
      if (mimeType.includes('ogg')) return 'ogg';
    }
    // Try to get from URL
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
    return 'bin';
  };

  // Download all images as ZIP
  const handleDownloadImages = async () => {
    setDownloadingImages(true);
    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      const charactersFolder = imagesFolder?.folder('characters');
      const scenesFolder = imagesFolder?.folder('scenes');

      // Download character images
      for (const char of project.characters) {
        if (char.imageUrl) {
          const blob = await fetchAsBlob(char.imageUrl);
          if (blob) {
            const ext = getExtension(char.imageUrl, blob.type);
            charactersFolder?.file(`${char.name.replace(/\s+/g, '_')}.${ext}`, blob);
          }
        }
      }

      // Download scene images
      for (const scene of project.scenes) {
        if (scene.imageUrl) {
          const blob = await fetchAsBlob(scene.imageUrl);
          if (blob) {
            const ext = getExtension(scene.imageUrl, blob.type);
            const sceneNum = scene.number || project.scenes.indexOf(scene) + 1;
            scenesFolder?.file(`scene_${String(sceneNum).padStart(2, '0')}_${scene.title.replace(/\s+/g, '_')}.${ext}`, blob);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_images.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download images:', error);
    } finally {
      setDownloadingImages(false);
    }
  };

  // Download all videos as ZIP
  const handleDownloadVideos = async () => {
    setDownloadingVideos(true);
    try {
      const zip = new JSZip();
      const videosFolder = zip.folder('videos');

      for (const scene of project.scenes) {
        if (scene.videoUrl) {
          const blob = await fetchAsBlob(scene.videoUrl);
          if (blob) {
            const ext = getExtension(scene.videoUrl, blob.type);
            const sceneNum = scene.number || project.scenes.indexOf(scene) + 1;
            videosFolder?.file(`scene_${String(sceneNum).padStart(2, '0')}_${scene.title.replace(/\s+/g, '_')}.${ext}`, blob);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_videos.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download videos:', error);
    } finally {
      setDownloadingVideos(false);
    }
  };

  // Download all audio as ZIP
  const handleDownloadAudio = async () => {
    setDownloadingAudio(true);
    try {
      const zip = new JSZip();
      const audioFolder = zip.folder('audio');

      for (const scene of project.scenes) {
        const sceneNum = scene.number || project.scenes.indexOf(scene) + 1;
        const sceneFolder = audioFolder?.folder(`scene_${String(sceneNum).padStart(2, '0')}`);

        for (let i = 0; i < scene.dialogue.length; i++) {
          const line = scene.dialogue[i];
          if (line.audioUrl) {
            const blob = await fetchAsBlob(line.audioUrl);
            if (blob) {
              const ext = getExtension(line.audioUrl, blob.type);
              sceneFolder?.file(`${String(i + 1).padStart(2, '0')}_${line.characterName?.replace(/\s+/g, '_') || 'unknown'}.${ext}`, blob);
            }
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_audio.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download audio:', error);
    } finally {
      setDownloadingAudio(false);
    }
  };

  // Download ALL assets as ZIP
  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const zip = new JSZip();

      // Images folder
      const imagesFolder = zip.folder('images');
      const charactersFolder = imagesFolder?.folder('characters');
      const scenesFolder = imagesFolder?.folder('scenes');

      for (const char of project.characters) {
        if (char.imageUrl) {
          const blob = await fetchAsBlob(char.imageUrl);
          if (blob) {
            const ext = getExtension(char.imageUrl, blob.type);
            charactersFolder?.file(`${char.name.replace(/\s+/g, '_')}.${ext}`, blob);
          }
        }
      }

      for (const scene of project.scenes) {
        if (scene.imageUrl) {
          const blob = await fetchAsBlob(scene.imageUrl);
          if (blob) {
            const ext = getExtension(scene.imageUrl, blob.type);
            const sceneNum = scene.number || project.scenes.indexOf(scene) + 1;
            scenesFolder?.file(`scene_${String(sceneNum).padStart(2, '0')}_${scene.title.replace(/\s+/g, '_')}.${ext}`, blob);
          }
        }
      }

      // Videos folder
      const videosFolder = zip.folder('videos');
      for (const scene of project.scenes) {
        if (scene.videoUrl) {
          const blob = await fetchAsBlob(scene.videoUrl);
          if (blob) {
            const ext = getExtension(scene.videoUrl, blob.type);
            const sceneNum = scene.number || project.scenes.indexOf(scene) + 1;
            videosFolder?.file(`scene_${String(sceneNum).padStart(2, '0')}_${scene.title.replace(/\s+/g, '_')}.${ext}`, blob);
          }
        }
      }

      // Audio folder
      const audioFolder = zip.folder('audio');
      for (const scene of project.scenes) {
        const sceneNum = scene.number || project.scenes.indexOf(scene) + 1;
        const sceneAudioFolder = audioFolder?.folder(`scene_${String(sceneNum).padStart(2, '0')}`);

        for (let i = 0; i < scene.dialogue.length; i++) {
          const line = scene.dialogue[i];
          if (line.audioUrl) {
            const blob = await fetchAsBlob(line.audioUrl);
            if (blob) {
              const ext = getExtension(line.audioUrl, blob.type);
              sceneAudioFolder?.file(`${String(i + 1).padStart(2, '0')}_${line.characterName?.replace(/\s+/g, '_') || 'unknown'}.${ext}`, blob);
            }
          }
        }
      }

      // Add dialogues.txt
      let dialoguesText = `# ${project.story.title || project.name}\n# Dialogues\n\n`;
      for (const scene of project.scenes) {
        const sceneNum = scene.number || project.scenes.indexOf(scene) + 1;
        dialoguesText += `## Scene ${sceneNum}: ${scene.title}\n\n`;
        for (const line of scene.dialogue) {
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
        project.characters,
        project.scenes,
        project.style
      );
      zip.file('prompts.md', markdown);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_complete.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download all assets:', error);
    } finally {
      setDownloadingAll(false);
    }
  };

  // Download dialogues as text file
  const handleDownloadDialogues = () => {
    let dialoguesText = `# ${project.story.title || project.name}\n# Complete Dialogues\n\n`;

    for (const scene of project.scenes) {
      const sceneNum = scene.number || project.scenes.indexOf(scene) + 1;
      dialoguesText += `═══════════════════════════════════════════════════════════════\n`;
      dialoguesText += `SCENE ${sceneNum}: ${scene.title}\n`;
      dialoguesText += `═══════════════════════════════════════════════════════════════\n\n`;

      if (scene.dialogue.length === 0) {
        dialoguesText += `(No dialogue)\n\n`;
      } else {
        for (const line of scene.dialogue) {
          dialoguesText += `${line.characterName}:\n"${line.text}"\n\n`;
        }
      }
    }

    const blob = new Blob([dialoguesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_dialogues.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate total project duration
  const totalDuration = project.scenes.length * 6; // 6 seconds per scene
  const totalMinutes = Math.floor(totalDuration / 60);
  const totalSeconds = totalDuration % 60;

  // Calculate total credits spent
  const creditsSpent = {
    images: scenesWithImages * COSTS.IMAGE_GENERATION + charactersWithImages * COSTS.IMAGE_GENERATION,
    videos: scenesWithVideos * COSTS.VIDEO_GENERATION,
    voiceovers: dialogueLinesWithAudio * COSTS.VOICEOVER_LINE,
    scenes: totalScenes * COSTS.SCENE_GENERATION,
  };
  const totalCreditsSpent = creditsSpent.images + creditsSpent.videos + creditsSpent.voiceovers + creditsSpent.scenes;

  const getFullMarkdown = () => {
    return exportProjectAsMarkdown(project.story, project.characters, project.scenes, project.style);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-4"
        >
          <Download className="w-8 h-8 text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.export.title')}</h2>
        <p className="text-muted-foreground">{t('steps.export.description')}</p>
      </div>

      {/* Project Summary Card */}
      <Card className="glass border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-400" />
              {t('steps.export.projectSummary')}
            </CardTitle>
            <Badge
              className={`${
                overallProgress >= 80
                  ? 'bg-green-500/20 text-green-400'
                  : overallProgress >= 50
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              } border-0`}
            >
              {overallProgress}% {t('steps.export.complete')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Characters */}
            <div className="glass rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalCharacters}</p>
              <p className="text-xs text-muted-foreground">{t('steps.export.characters')}</p>
              <Progress
                value={(charactersWithImages / Math.max(totalCharacters, 1)) * 100}
                className="h-1 mt-2"
              />
            </div>

            {/* Scenes */}
            <div className="glass rounded-xl p-4 text-center">
              <ImageIcon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalScenes}</p>
              <p className="text-xs text-muted-foreground">{t('steps.export.scenes')}</p>
              <Progress
                value={(scenesWithImages / Math.max(totalScenes, 1)) * 100}
                className="h-1 mt-2"
              />
            </div>

            {/* Videos */}
            <div className="glass rounded-xl p-4 text-center">
              <Video className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{scenesWithVideos}</p>
              <p className="text-xs text-muted-foreground">{t('steps.export.videos')}</p>
              <Progress
                value={(scenesWithVideos / Math.max(totalScenes, 1)) * 100}
                className="h-1 mt-2"
              />
            </div>

            {/* Voiceovers */}
            <div className="glass rounded-xl p-4 text-center">
              <Mic className="w-6 h-6 text-violet-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{dialogueLinesWithAudio}</p>
              <p className="text-xs text-muted-foreground">{t('steps.export.voiceovers')}</p>
              <Progress
                value={(dialogueLinesWithAudio / Math.max(totalDialogueLines, 1)) * 100}
                className="h-1 mt-2"
              />
            </div>
          </div>

          {/* Story Details */}
          <div className="glass rounded-xl p-4 space-y-2">
            <h3 className="font-semibold">{project.story.title || 'Untitled Story'}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{project.story.concept}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="border-white/10">
                {project.story.genre}
              </Badge>
              <Badge variant="outline" className="border-white/10">
                {project.story.tone}
              </Badge>
              <Badge variant="outline" className="border-white/10">
                {project.style}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movie Preview */}
      {totalScenes > 0 && (
        <Card className="glass border-white/10 border-purple-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-400" />
                {t('steps.export.moviePreview')}
              </CardTitle>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                {totalScenes} {t('steps.export.scenes')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Background Music Audio Element (hidden) */}
            {project.backgroundMusic && (
              <audio
                ref={backgroundMusicRef}
                src={project.backgroundMusic.audioUrl}
                loop
                preload="auto"
              />
            )}

            {/* Video/Image Display */}
            <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden">
              <AnimatePresence mode="wait">
                {hasVideo ? (
                  <motion.video
                    key={`video-${currentPreviewIndex}`}
                    ref={previewVideoRef}
                    src={getVideoUrl(currentScene.videoUrl!)}
                    className="w-full h-full object-contain"
                    playsInline
                    onEnded={handlePreviewVideoEnded}
                    onTimeUpdate={handlePreviewVideoTimeUpdate}
                    onCanPlay={handleVideoCanPlay}
                    initial={transitionVariants[getSceneTransition(currentPreviewIndex > 0 ? currentPreviewIndex - 1 : 0)].exit}
                    animate={transitionVariants[getSceneTransition(currentPreviewIndex)].animate}
                    exit={transitionVariants[getSceneTransition(currentPreviewIndex)].exit}
                    transition={{ duration: getTransitionDuration(currentPreviewIndex) }}
                  />
                ) : hasImage ? (
                  <motion.img
                    key={`image-${currentPreviewIndex}`}
                    src={currentScene.imageUrl!}
                    alt={currentScene.title}
                    className="w-full h-full object-contain"
                    initial={transitionVariants[getSceneTransition(currentPreviewIndex > 0 ? currentPreviewIndex - 1 : 0)].exit}
                    animate={transitionVariants[getSceneTransition(currentPreviewIndex)].animate}
                    exit={transitionVariants[getSceneTransition(currentPreviewIndex)].exit}
                    transition={{ duration: getTransitionDuration(currentPreviewIndex) }}
                  />
                ) : (
                  <motion.div
                    key={`empty-${currentPreviewIndex}`}
                    className="w-full h-full flex flex-col items-center justify-center text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <ImageIcon className="w-16 h-16 mb-2 opacity-30" />
                    <p className="text-sm">{t('steps.export.noMedia')}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Caption overlay */}
              <AnimatePresence>
                {currentCaption && (
                  <motion.div
                    key={currentCaption.id}
                    className={cn(
                      "absolute left-0 right-0 px-4 text-center z-10",
                      currentCaption.style.position === 'top' && 'top-4',
                      currentCaption.style.position === 'center' && 'top-1/2 -translate-y-1/2',
                      currentCaption.style.position === 'bottom' && 'bottom-20'
                    )}
                    initial={captionAnimations[currentCaption.animation]?.initial || { opacity: 0 }}
                    animate={captionAnimations[currentCaption.animation]?.animate || { opacity: 1 }}
                    exit={captionAnimations[currentCaption.animation]?.exit || { opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span
                      className={cn(
                        "px-4 py-2 rounded-lg inline-block max-w-[80%]",
                        currentCaption.style.textShadow && "drop-shadow-lg"
                      )}
                      style={{
                        fontSize: fontSizes[currentCaption.style.fontSize],
                        color: currentCaption.style.color,
                        backgroundColor: currentCaption.style.backgroundColor,
                        fontFamily: currentCaption.style.fontFamily === 'serif' ? 'Georgia, serif' :
                                   currentCaption.style.fontFamily === 'mono' ? 'monospace' : 'inherit'
                      }}
                    >
                      {currentCaption.text}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scene overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white text-sm font-medium">
                  {currentPreviewIndex + 1}. {currentScene?.title || `Scene ${currentPreviewIndex + 1}`}
                </p>
                {currentScene?.description && (
                  <p className="text-white/70 text-xs line-clamp-1 mt-1">{currentScene.description}</p>
                )}
              </div>

              {/* Media type indicator */}
              {hasVideo && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-green-500/80 text-white">
                    <Video className="w-3 h-3 mr-1" />
                    Video
                  </Badge>
                </div>
              )}
              {!hasVideo && hasImage && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-amber-500/80 text-white">
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Image
                  </Badge>
                </div>
              )}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={jumpToFirstScene}
                disabled={currentPreviewIndex === 0}
                className="text-muted-foreground hover:text-white"
                title={t('steps.export.firstScene')}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousPreviewScene}
                disabled={currentPreviewIndex === 0}
                className="text-muted-foreground hover:text-white"
                title={t('steps.export.previousScene')}
              >
                <Rewind className="w-4 h-4" />
              </Button>

              <Button
                variant="default"
                size="lg"
                onClick={handlePreviewPlayPause}
                className={`min-w-[120px] ${
                  isPreviewPlaying
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-purple-500 hover:bg-purple-600'
                }`}
              >
                {isPreviewPlaying ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    {t('steps.export.pauseMovie')}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    {t('steps.export.playMovie')}
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextPreviewScene}
                disabled={currentPreviewIndex === totalScenes - 1}
                className="text-muted-foreground hover:text-white"
                title={t('steps.export.nextScene')}
              >
                <FastForward className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={jumpToLastScene}
                disabled={currentPreviewIndex === totalScenes - 1}
                className="text-muted-foreground hover:text-white"
                title={t('steps.export.lastScene')}
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              {/* Volume Control */}
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-muted-foreground hover:text-white"
                  title={isMuted ? t('steps.export.unmute') : t('steps.export.mute')}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : previewVolume]}
                  max={1}
                  step={0.05}
                  onValueChange={handleVolumeChange}
                  className="w-24 cursor-pointer"
                />
              </div>

              {/* Music Volume Control (dB scale) */}
              {project.backgroundMusic && (
                <div className="flex items-center gap-2 ml-2 border-l border-white/10 pl-4">
                  <Music className="w-4 h-4 text-purple-400" />
                  <Slider
                    value={[musicVolumeDb]}
                    min={-30}
                    max={0}
                    step={1}
                    onValueChange={handleMusicVolumeDbChange}
                    className="w-24 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground w-12 font-mono">
                    {musicVolumeDb > -30 ? `${musicVolumeDb > 0 ? '+' : ''}${Math.round(musicVolumeDb)}dB` : '-∞'}
                  </span>
                </div>
              )}
            </div>

            {/* Time display and progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatPreviewTime(currentMovieTime)}</span>
                <span>Scene {currentPreviewIndex + 1} / {totalScenes}</span>
                <span>{formatPreviewTime(totalPreviewDuration)}</span>
              </div>
              <Slider
                value={[currentMovieTime]}
                max={totalPreviewDuration}
                step={0.1}
                onValueChange={handlePreviewSeek}
                className="cursor-pointer"
              />
            </div>

            {/* Quick transition actions */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t('steps.export.transitions')}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyTransitionToAll('swoosh')}
                  className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  title={t('steps.export.applySwooshAll')}
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  Swoosh All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllTransitions}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  title={t('steps.export.clearAllTransitions')}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Scene thumbnails with transition selectors */}
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {project.scenes.map((scene, index) => (
                <div key={scene.id} className="flex items-center flex-shrink-0">
                  {/* Scene thumbnail */}
                  <button
                    onClick={() => jumpToScene(index)}
                    className={`flex-shrink-0 w-16 h-10 rounded overflow-hidden border-2 transition-all ${
                      index === currentPreviewIndex
                        ? 'border-purple-500 ring-2 ring-purple-500/30'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    title={`${index + 1}. ${scene.title}`}
                  >
                    {scene.videoUrl ? (
                      <video
                        src={scene.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : scene.imageUrl ? (
                      <img
                        src={scene.imageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                      </div>
                    )}
                  </button>

                  {/* Transition selector (between scenes) */}
                  {index < project.scenes.length - 1 && (
                    <Select
                      value={getSceneTransition(index)}
                      onValueChange={(value: TransitionType) => handleTransitionChange(scene.id, value)}
                    >
                      <SelectTrigger className="w-8 h-6 px-1 mx-0.5 bg-white/5 border-white/10 hover:border-purple-500/50 text-[9px]">
                        <SelectValue>
                          <span className="truncate">{transitionLabels[getSceneTransition(index)].slice(0, 2)}</span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="min-w-[140px]">
                        {(Object.keys(transitionLabels) as TransitionType[]).map((type) => (
                          <SelectItem key={type} value={type} className="text-xs">
                            {transitionLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      <Card className="glass border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              {t('steps.export.timeline')}
            </CardTitle>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
              {totalMinutes}:{String(totalSeconds).padStart(2, '0')} {t('steps.export.totalDuration')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timeline visualization */}
          <div className="relative">
            {/* Timeline ruler */}
            <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
              {Array.from({ length: Math.min(project.scenes.length + 1, 13) }, (_, i) => {
                const time = i * 6;
                return (
                  <span key={i}>
                    {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
                  </span>
                );
              })}
            </div>

            {/* Video track */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-medium text-orange-400">{t('steps.export.videoTrack')}</span>
              </div>
              <div className="flex gap-1 h-16 overflow-x-auto pb-2">
                {project.scenes.map((scene, index) => (
                  <motion.div
                    key={scene.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex-shrink-0 w-24 h-full rounded-lg overflow-hidden border-2 relative ${
                      scene.videoUrl
                        ? 'border-green-500/50'
                        : scene.imageUrl
                        ? 'border-amber-500/50'
                        : 'border-white/10'
                    }`}
                  >
                    {scene.videoUrl ? (
                      <video
                        src={scene.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : scene.imageUrl ? (
                      <img
                        src={scene.imageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover opacity-70"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <p className="text-[10px] text-white truncate">{scene.number || index + 1}. {scene.title}</p>
                    </div>
                    {scene.videoUrl && (
                      <div className="absolute top-1 right-1">
                        <Play className="w-3 h-3 text-green-400" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Audio track */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-medium text-violet-400">{t('steps.export.audioTrack')}</span>
              </div>
              <div className="flex gap-1 h-8 overflow-x-auto pb-2">
                {project.scenes.map((scene, index) => (
                  <div
                    key={scene.id}
                    className="flex-shrink-0 w-24 h-full rounded-lg overflow-hidden flex items-center justify-center gap-0.5"
                  >
                    {scene.dialogue.length > 0 ? (
                      scene.dialogue.map((line, lineIdx) => (
                        <div
                          key={lineIdx}
                          className={`h-full flex-1 rounded ${
                            line.audioUrl
                              ? 'bg-violet-500/50'
                              : 'bg-violet-500/20 border border-dashed border-violet-500/30'
                          }`}
                          title={`${line.characterName}: ${line.text}`}
                        />
                      ))
                    ) : (
                      <div className="w-full h-full bg-white/5 rounded" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500/50 border border-green-500" />
              <span className="text-muted-foreground">{t('steps.export.hasVideo')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500/50 border border-amber-500" />
              <span className="text-muted-foreground">{t('steps.export.hasImage')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-violet-500/50" />
              <span className="text-muted-foreground">{t('steps.export.hasAudio')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-white/10 border border-dashed border-white/20" />
              <span className="text-muted-foreground">{t('steps.export.missing')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits Summary */}
      <Card className="glass border-white/10 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            {t('steps.export.creditsUsed')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('credits.image')}</p>
              <p className="font-semibold text-purple-400">{creditsSpent.images} pts</p>
            </div>
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('credits.video')}</p>
              <p className="font-semibold text-orange-400">{creditsSpent.videos} pts</p>
            </div>
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('credits.voiceover')}</p>
              <p className="font-semibold text-violet-400">{creditsSpent.voiceovers} pts</p>
            </div>
            <div className="glass rounded-lg p-3 text-center border border-amber-500/30">
              <p className="text-xs text-muted-foreground">{t('credits.title')}</p>
              <p className="font-bold text-lg text-amber-400">{totalCreditsSpent} pts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            {t('steps.export.exportOptions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* JSON Export */}
            <button
              onClick={handleExportJSON}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
            >
              <FileJson className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold mb-1">JSON</h4>
              <p className="text-xs text-muted-foreground">
                {t('steps.export.jsonDescription')}
              </p>
            </button>

            {/* Markdown Export */}
            <button
              onClick={handleExportMarkdown}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
            >
              <FileText className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold mb-1">Markdown</h4>
              <p className="text-xs text-muted-foreground">
                {t('steps.export.markdownDescription')}
              </p>
            </button>

            {/* Text Export */}
            <button
              onClick={handleExportText}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
            >
              <ClipboardList className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold mb-1">Text</h4>
              <p className="text-xs text-muted-foreground">
                {t('steps.export.textDescription')}
              </p>
            </button>

            {/* CapCut Export */}
            <button
              onClick={handleExportCapCut}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-cyan-500/30 group"
            >
              <Scissors className="w-8 h-8 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold mb-1">CapCut</h4>
              <p className="text-xs text-muted-foreground">
                {t('steps.export.capcutDescription')}
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Download Assets */}
      <Card className="glass border-white/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-purple-400" />
            {t('steps.export.downloadAssets')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t('steps.export.downloadAssetsDescription')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Download Images */}
            <Button
              onClick={handleDownloadImages}
              disabled={downloadingImages || (scenesWithImages === 0 && charactersWithImages === 0)}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 disabled:opacity-50"
            >
              {downloadingImages ? (
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              ) : (
                <ImageDown className="w-6 h-6 text-purple-400" />
              )}
              <span className="font-medium">Images</span>
              <span className="text-xs text-muted-foreground">
                {scenesWithImages + charactersWithImages} files
              </span>
            </Button>

            {/* Download Videos */}
            <Button
              onClick={handleDownloadVideos}
              disabled={downloadingVideos || scenesWithVideos === 0}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50 disabled:opacity-50"
            >
              {downloadingVideos ? (
                <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              ) : (
                <VideoIcon className="w-6 h-6 text-orange-400" />
              )}
              <span className="font-medium">Videos</span>
              <span className="text-xs text-muted-foreground">
                {scenesWithVideos} files
              </span>
            </Button>

            {/* Download Audio */}
            <Button
              onClick={handleDownloadAudio}
              disabled={downloadingAudio || dialogueLinesWithAudio === 0}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-500/50 disabled:opacity-50"
            >
              {downloadingAudio ? (
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              ) : (
                <Music className="w-6 h-6 text-violet-400" />
              )}
              <span className="font-medium">Audio</span>
              <span className="text-xs text-muted-foreground">
                {dialogueLinesWithAudio} files
              </span>
            </Button>

            {/* Download Dialogues */}
            <Button
              onClick={handleDownloadDialogues}
              disabled={totalDialogueLines === 0}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 disabled:opacity-50"
            >
              <MessageSquareText className="w-6 h-6 text-cyan-400" />
              <span className="font-medium">Dialogues</span>
              <span className="text-xs text-muted-foreground">
                {totalDialogueLines} lines
              </span>
            </Button>

            {/* Download All */}
            <Button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
            >
              {downloadingAll ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <FileDown className="w-6 h-6" />
              )}
              <span className="font-medium">All Assets</span>
              <span className="text-xs text-white/70">
                Complete ZIP
              </span>
            </Button>
          </div>

          {/* Download info */}
          <div className="glass rounded-lg p-3 mt-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-purple-400">Note:</strong> {t('steps.export.downloadNote')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prompts Preview */}
      <Card className="glass border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-400" />
              {t('steps.export.promptsPreview')}
            </CardTitle>
            <CopyButton text={getFullMarkdown()} />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="characters" className="w-full">
            <TabsList className="glass w-full justify-start mb-4">
              <TabsTrigger value="characters">
                <Users className="w-4 h-4 mr-2" />
                {t('steps.export.characters')}
              </TabsTrigger>
              <TabsTrigger value="scenes">
                <Film className="w-4 h-4 mr-2" />
                {t('steps.export.scenes')}
              </TabsTrigger>
              <TabsTrigger value="full">
                <FileText className="w-4 h-4 mr-2" />
                {t('steps.export.fullDocument')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="characters" className="space-y-4">
              {project.characters.map((character) => (
                <div key={character.id} className="glass rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {character.imageUrl ? (
                        <img
                          src={character.imageUrl}
                          alt={character.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                      )}
                      <h4 className="font-semibold">{character.name}</h4>
                    </div>
                    <CopyButton text={character.masterPrompt} size="icon" className="h-8 w-8" />
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-3 max-h-32 overflow-y-auto">
                    {character.masterPrompt}
                  </pre>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="scenes">
              <Accordion type="multiple" className="space-y-2">
                {project.scenes.map((scene, index) => (
                  <AccordionItem
                    key={scene.id}
                    value={scene.id}
                    className="glass rounded-lg border-white/5"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                          {scene.number || index + 1}
                        </Badge>
                        <span>{scene.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-emerald-400">{t('steps.scenes.textToImagePrompt')}</span>
                          <CopyButton text={scene.textToImagePrompt} size="icon" className="h-6 w-6" />
                        </div>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2">
                          {scene.textToImagePrompt}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-orange-400">{t('steps.scenes.imageToVideoPrompt')}</span>
                          <CopyButton text={scene.imageToVideoPrompt} size="icon" className="h-6 w-6" />
                        </div>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2">
                          {scene.imageToVideoPrompt}
                        </pre>
                      </div>
                      {scene.dialogue.length > 0 && (
                        <div>
                          <span className="text-xs text-violet-400">{t('steps.scenes.dialogue')}</span>
                          <div className="bg-black/20 rounded p-2 mt-1">
                            {scene.dialogue.map((line, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                <span className="text-violet-400">{line.characterName}:</span> "{line.text}"
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="full">
              <div className="glass rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                  {getFullMarkdown()}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-green-400" />
          {t('steps.export.nextSteps')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="glass rounded-lg p-4">
            <h4 className="font-medium mb-2 text-cyan-400">CapCut</h4>
            <p className="text-muted-foreground">
              {t('steps.export.capcutInstructions')}
            </p>
          </div>
          <div className="glass rounded-lg p-4">
            <h4 className="font-medium mb-2 text-purple-400">DaVinci Resolve</h4>
            <p className="text-muted-foreground">
              {t('steps.export.davinciInstructions')}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {overallProgress >= 80 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 border-2 border-green-500/30 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">{t('steps.export.congratulations')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('steps.export.congratulationsDescription')}
          </p>
          <Button
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0"
            onClick={handleExportMarkdown}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('steps.export.downloadAllPrompts')}
          </Button>
        </motion.div>
      )}

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-green-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-green-400">Tip:</strong> {t('steps.export.tip')}
        </p>
      </div>
    </div>
  );
}
