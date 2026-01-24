// Types for background music hook

import type { Project, BackgroundMusic, MusicProvider } from '@/types/project';

export type SunoModel = 'V4' | 'V4.5' | 'V4.5ALL' | 'V4.5PLUS' | 'V5';

export interface GenerationState {
  isGenerating: boolean;
  taskId: string | null;
  status: 'idle' | 'processing' | 'complete' | 'error';
  progress: number;
  error: string | null;
  provider?: MusicProvider;
}

export interface UseBackgroundMusicProps {
  project: Project;
  apiKeys?: {
    musicProvider?: string;
    [key: string]: any;
  } | null;
}

export interface UseBackgroundMusicReturn {
  // Current music
  currentMusic: BackgroundMusic | null;
  hasMusic: boolean;

  // Generation state
  generationState: GenerationState;

  // Preview state
  previewUrl: string | null;
  isPreviewPlaying: boolean;
  previewRef: React.RefObject<HTMLAudioElement | null>;

  // Form state
  prompt: string;
  setPrompt: (prompt: string) => void;
  model: SunoModel;
  setModel: (model: SunoModel) => void;
  instrumental: boolean;
  setInstrumental: (instrumental: boolean) => void;
  provider: MusicProvider;
  setProvider: (provider: MusicProvider) => void;

  // Actions
  generateMusic: () => Promise<void>;
  cancelGeneration: () => void;
  applyPreviewToProject: () => void;
  removeMusic: () => void;
  uploadMusic: (file: File) => Promise<void>;
  togglePreview: () => void;
  clearPreview: () => void;
}
