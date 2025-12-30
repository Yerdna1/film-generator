import type { Scene } from '@/types/project';
import type { ItemGenerationState } from '@/lib/constants/workflow';

export type VideoStatus = 'idle' | 'generating' | 'complete' | 'error';

export type VideoMode = 'fun' | 'normal';

export type SceneVideoState = Record<string, ItemGenerationState>;

export interface VideoGeneratorState {
  videoStates: SceneVideoState;
  playingVideo: string | null;
  isGeneratingAll: boolean;
  videoMode: VideoMode;
  currentPage: number;
}

export interface SceneVideoCardProps {
  scene: Scene;
  index: number;
  status: VideoStatus;
  progress: number;
  isPlaying: boolean;
  cachedVideoUrl?: string;
  onPlay: () => void;
  onPause: () => void;
  onGenerateVideo: () => void;
  buildFullI2VPrompt: (scene: Scene) => string;
}
