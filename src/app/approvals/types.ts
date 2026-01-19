import type { DeletionRequest, RegenerationRequest, PromptEditRequest } from '@/types/collaboration';

export interface ProjectInfo {
  id: string;
  name: string;
}

export type RequestType = 'deletion' | 'regeneration' | 'prompt';

// Log entry type for regeneration tracking
export interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'cost';
  message: string;
  details?: Record<string, unknown>;
}

export interface FieldLabels {
  [key: string]: string;
}
