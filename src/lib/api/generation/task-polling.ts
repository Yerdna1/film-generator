import { GenerationStatus, TaskStatus } from '@/lib/providers/types';

export interface PollingOptions {
  taskId: string;
  checkStatus: (taskId: string) => Promise<TaskStatus>;
  onProgress?: (status: TaskStatus) => void;
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
}

export interface PollingResult<T = any> {
  success: boolean;
  status: GenerationStatus;
  result?: T;
  error?: string;
  attempts: number;
  duration: number;
}

/**
 * Generic task polling with exponential backoff
 */
export async function pollTask<T = any>(
  options: PollingOptions
): Promise<PollingResult<T>> {
  const {
    taskId,
    checkStatus,
    onProgress,
    maxAttempts = 60,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 1.5,
    timeout = 300000, // 5 minutes default
  } = options;

  const startTime = Date.now();
  let attempts = 0;
  let delay = initialDelay;

  while (attempts < maxAttempts) {
    attempts++;

    // Check if we've exceeded timeout
    if (Date.now() - startTime > timeout) {
      return {
        success: false,
        status: 'error',
        error: 'Polling timeout exceeded',
        attempts,
        duration: Date.now() - startTime,
      };
    }

    try {
      const status = await checkStatus(taskId);

      // Call progress callback if provided
      if (onProgress) {
        onProgress(status);
      }

      // Check if task is complete
      if (status.status === 'complete') {
        return {
          success: true,
          status: 'complete',
          result: status as any,
          attempts,
          duration: Date.now() - startTime,
        };
      }

      // Check if task has failed
      if (status.status === 'error' || status.status === 'cancelled') {
        return {
          success: false,
          status: status.status,
          error: status.error || `Task ${status.status}`,
          attempts,
          duration: Date.now() - startTime,
        };
      }

      // Wait before next attempt
      await sleep(delay);

      // Exponential backoff with max delay
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    } catch (error) {
      // Log error but continue polling
      console.error(`Polling error on attempt ${attempts}:`, error);

      // If this is the last attempt, throw the error
      if (attempts >= maxAttempts) {
        return {
          success: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown polling error',
          attempts,
          duration: Date.now() - startTime,
        };
      }

      // Wait before retry
      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  return {
    success: false,
    status: 'error',
    error: 'Maximum polling attempts exceeded',
    attempts,
    duration: Date.now() - startTime,
  };
}

/**
 * State mapping utilities for different providers
 */
export interface StateMapping {
  [key: string]: GenerationStatus;
}

export const DEFAULT_STATE_MAPPINGS: Record<string, StateMapping> = {
  kie: {
    'waiting': 'processing',
    'queuing': 'processing',
    'generating': 'processing',
    'success': 'complete',
    'fail': 'error',
  },
  suno: {
    'submitted': 'processing',
    'queued': 'processing',
    'streaming': 'processing',
    'complete': 'complete',
    'failed': 'error',
  },
  piapi: {
    'pending': 'pending',
    'processing': 'processing',
    'succeeded': 'complete',
    'failed': 'error',
  },
};

export function mapProviderState(
  providerState: string,
  provider: string
): GenerationStatus {
  const mapping = DEFAULT_STATE_MAPPINGS[provider];
  if (!mapping) {
    // Default mapping for unknown providers
    if (providerState.toLowerCase().includes('success') || providerState.toLowerCase().includes('complete')) {
      return 'complete';
    }
    if (providerState.toLowerCase().includes('fail') || providerState.toLowerCase().includes('error')) {
      return 'error';
    }
    return 'processing';
  }

  return mapping[providerState] || 'processing';
}

/**
 * Extract result URL from provider-specific response
 */
export interface ResultExtractor<T = any> {
  (response: any): T | null;
}

export const DEFAULT_RESULT_EXTRACTORS: Record<string, ResultExtractor<string>> = {
  kie_video: (data) => {
    // KIE video result extraction
    if (data.resultJson) {
      try {
        const result = JSON.parse(data.resultJson);
        return result.resultUrls?.[0] || null;
      } catch {
        return null;
      }
    }
    return data.resultUrl || null;
  },
  kie_music: (data) => {
    // KIE music result extraction
    if (data.resultJson) {
      try {
        const result = JSON.parse(data.resultJson);
        return result.resultUrls?.[0] || null;
      } catch {
        return null;
      }
    }
    return data.audioUrl || null;
  },
  suno: (data) => {
    // Suno result extraction
    return data.audio_url || data.audioUrl || null;
  },
  piapi: (data) => {
    // PiAPI result extraction
    return data.result?.audio_url || data.result?.audioUrl || null;
  },
};

export function extractResult<T = any>(
  response: any,
  provider: string,
  type: string
): T | null {
  const extractorKey = `${provider}_${type}`;
  const extractor = DEFAULT_RESULT_EXTRACTORS[extractorKey] || DEFAULT_RESULT_EXTRACTORS[provider];

  if (extractor) {
    return extractor(response) as T;
  }

  // Generic extraction attempts
  const possibleKeys = ['url', 'resultUrl', 'result_url', 'output', 'output_url'];
  for (const key of possibleKeys) {
    if (response[key]) {
      return response[key] as T;
    }
  }

  return null;
}

/**
 * Polling with progress tracking
 */
export class ProgressTracker {
  private startTime: number;
  private lastProgress: number = 0;
  private progressHistory: Array<{ time: number; progress: number }> = [];

  constructor() {
    this.startTime = Date.now();
  }

  update(progress: number) {
    this.lastProgress = progress;
    this.progressHistory.push({
      time: Date.now() - this.startTime,
      progress,
    });
  }

  getEstimatedTimeRemaining(): number | null {
    if (this.progressHistory.length < 2 || this.lastProgress === 0) {
      return null;
    }

    // Calculate average progress rate
    const recentHistory = this.progressHistory.slice(-5);
    const firstPoint = recentHistory[0];
    const lastPoint = recentHistory[recentHistory.length - 1];

    const progressDelta = lastPoint.progress - firstPoint.progress;
    const timeDelta = lastPoint.time - firstPoint.time;

    if (progressDelta <= 0) {
      return null;
    }

    const rate = progressDelta / timeDelta;
    const remainingProgress = 100 - this.lastProgress;

    return remainingProgress / rate;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  getProgress(): number {
    return this.lastProgress;
  }
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}