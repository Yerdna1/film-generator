import type { Scene } from '@/types/project';
import type { RegenerationRequest } from '@/types/collaboration';
import type { VideoStatus } from '../../types';

export interface SceneVideoCardProps {
  scene: Scene;
  index: number;
  projectId: string;
  status: VideoStatus;
  progress: number;
  isPlaying: boolean;
  cachedVideoUrl?: string;
  isSelected?: boolean;
  hasPendingRegeneration?: boolean;
  hasPendingDeletion?: boolean;
  approvedRegeneration?: RegenerationRequest | null;
  canDeleteDirectly?: boolean;
  isAdmin?: boolean;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
  isFirstVideo?: boolean;
  onToggleSelect?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onGenerateVideo: () => void;
  buildFullI2VPrompt: (scene: Scene) => string;
  onDeletionRequested?: () => void;
  onUseRegenerationAttempt?: (requestId: string) => Promise<void>;
  onSelectRegeneration?: (requestId: string, selectedUrl: string) => Promise<void>;
  onToggleLock?: () => void;
}

export interface VideoPreviewProps {
  scene: Scene;
  isPlaying: boolean;
  isRestricted: boolean;
  isFirstVideo: boolean;
  cachedVideoUrl?: string;
  status: VideoStatus;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
}

export interface CardHeaderProps {
  scene: Scene;
  index: number;
  isLocked: boolean;
  hasPendingRegeneration: boolean;
  hasPendingDeletion: boolean;
  approvedRegeneration: RegenerationRequest | null;
  isVideoStale: boolean;
  isSelected?: boolean;
  status: VideoStatus;
  onToggleSelect?: () => void;
}

export interface CardContentProps {
  scene: Scene;
  isLocked: boolean;
  isVideoStale: boolean;
  buildFullI2VPrompt: (scene: Scene) => string;
}

export interface CardActionsProps {
  scene: { id: string; title: string; videoUrl?: string; imageUrl?: string; locked?: boolean };
  status: VideoStatus;
  isLocked: boolean;
  isVideoStale: boolean;
  isReadOnly: boolean;
  isRestricted: boolean;
  hasPendingDeletion: boolean;
  canDeleteDirectly: boolean;
  onGenerateVideo: () => void;
  onToggleLock?: () => void;
  onDeleteClick: () => void;
}
