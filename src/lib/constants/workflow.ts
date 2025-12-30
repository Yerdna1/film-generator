// Common status type for generation workflows
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

// Generic state interface for tracking generation per item
export interface ItemGenerationState {
  status: GenerationStatus;
  progress: number;
  error?: string;
}

// Pagination configuration
export const SCENES_PER_PAGE = 12; // 12 scenes ≈ 1 minute of video (12 × 6s = 72s)

// Common duration constants
export const DEFAULT_VIDEO_DURATION = 6; // seconds per video clip
