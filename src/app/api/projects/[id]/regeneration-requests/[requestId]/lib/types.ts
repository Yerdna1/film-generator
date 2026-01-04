import type { Prisma } from '@prisma/client';

// Log entry type for regeneration request tracking
export interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'cost';
  message: string;
  details?: Record<string, unknown>;
}

// Regeneration result from image/video generation
export interface RegenerationResult {
  success: boolean;
  url?: string;
  error?: string;
  provider?: string;
  cost?: number;
}

// Extended regeneration request with includes
export type RegenerationRequestWithProject = Prisma.RegenerationRequestGetPayload<{
  include: {
    requester: {
      select: { id: true; name: true; email: true };
    };
    project: {
      select: {
        name: true;
        settings: true;
        userId: true;
        characters: {
          select: { name: true; imageUrl: true };
        };
      };
    };
  };
}>;

// Scene data for regeneration
export interface SceneData {
  id: string;
  title: string;
  number: number | null;
  textToImagePrompt: string | null;
  imageToVideoPrompt: string | null;
  imageUrl: string | null;
  dialogue: unknown[] | null;
}

// Handler context passed to action handlers
export interface ActionContext {
  session: { user: { id: string } };
  projectId: string;
  requestId: string;
  regenerationRequest: RegenerationRequestWithProject;
  scene: SceneData;
  cookieHeader: string | null;
  baseUrl: string;
}
