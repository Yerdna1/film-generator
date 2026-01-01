// Common status type for generation workflows
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

// Generic state interface for tracking generation per item
export interface ItemGenerationState {
  status: GenerationStatus;
  progress: number;
  error?: string;
}

// Pagination configuration
export const SCENES_PER_PAGE = 20; // 20 scenes per page for compact grid view

// Common duration constants
export const DEFAULT_VIDEO_DURATION = 6; // seconds per video clip
