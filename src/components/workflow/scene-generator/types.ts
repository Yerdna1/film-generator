import type { Project, ImageProvider, Scene } from '@/types/project';
import type { RegenerationRequest, ProjectPermissions, ProjectRole } from '@/types/collaboration';

export interface Step3Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export interface PendingSceneGeneration {
  type: 'single' | 'all' | 'batch' | 'regenerate';
  scene?: Scene;
  scenes?: Scene[];
  batchSize?: number;
}

export interface UserApiKeys {
  hasKieKey: boolean;
  kieImageModel: string;
}

export interface CollaborationHandlers {
  handleUseRegenerationAttempt: (requestId: string) => Promise<void>;
  handleSelectRegeneration: (requestId: string, selectedUrl: string) => Promise<void>;
  handleToggleLock: (sceneId: string) => Promise<void>;
  fetchRegenerationRequests: () => void;
  fetchDeletionRequests: () => void;
}

export interface CreditCheckHandlers {
  handleGenerateSceneImageWithCreditCheck: (scene: Scene) => Promise<void>;
  handleGenerateAllWithCreditCheck: () => Promise<void>;
  handleGenerateAllScenesWithCreditCheck: () => Promise<void>;
  handleSaveKieApiKey: (apiKey: string, model: string) => Promise<void>;
  handleSaveOpenRouterKey: (apiKey: string, model: string) => Promise<void>;
  handleUseAppCredits: () => Promise<void>;
  handleUseAppCreditsForScenes: () => Promise<void>;
  hasSufficientCreditsForScenes: boolean;
}
