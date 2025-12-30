import type { Project, Caption, TransitionType } from '@/types/project';

export interface Step6Props {
  project: Project;
}

export interface ProjectStats {
  totalCharacters: number;
  charactersWithImages: number;
  totalScenes: number;
  scenesWithImages: number;
  scenesWithVideos: number;
  totalDialogueLines: number;
  dialogueLinesWithAudio: number;
  overallProgress: number;
  totalDuration: number;
  totalMinutes: number;
  totalSeconds: number;
}

export interface CreditsSpent {
  images: number;
  videos: number;
  voiceovers: number;
  scenes: number;
  total: number;
}

export interface PreviewPlayerState {
  isPlaying: boolean;
  currentIndex: number;
  progress: number;
  volume: number;
  isMuted: boolean;
  musicVolume: number;
  musicVolumeDb: number;
  currentCaption: Caption | null;
}

export interface PreviewPlayerControls {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  jumpToFirst: () => void;
  jumpToLast: () => void;
  jumpToScene: (index: number) => void;
  seek: (value: number[]) => void;
  setVolume: (value: number[]) => void;
  toggleMute: () => void;
  setMusicVolumeDb: (value: number[]) => void;
}

export interface DownloadState {
  downloadingImages: boolean;
  downloadingVideos: boolean;
  downloadingAudio: boolean;
  downloadingAll: boolean;
}

export interface ExportHandlers {
  handleExportJSON: () => void;
  handleExportMarkdown: () => void;
  handleExportText: () => void;
  handleExportCapCut: () => void;
  getFullMarkdown: () => string;
}

export interface DownloadHandlers {
  handleDownloadImages: () => Promise<void>;
  handleDownloadVideos: () => Promise<void>;
  handleDownloadAudio: () => Promise<void>;
  handleDownloadAll: () => Promise<void>;
  handleDownloadDialogues: () => void;
}
