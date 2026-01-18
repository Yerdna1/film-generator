// Types for background job processing

export interface ImageGenerationJob {
  id: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'completed_with_errors';
  totalScenes: number;
  completedScenes: number;
  failedScenes: number;
  progress: number; // 0-100
  errorDetails?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface VideoGenerationJob {
  id: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  progress: number; // 0-100
  errorDetails?: string | null;
  videoProvider?: string | null;
  videoModel?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface SceneGenerationJob {
  id: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalScenes: number;
  completedScenes: number;
  progress: number; // 0-100
  errorDetails?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}