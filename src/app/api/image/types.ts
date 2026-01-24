import type { ImageResolution } from '@/lib/services/real-costs';

export interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: string;
  resolution?: ImageResolution;
  projectId?: string;
  referenceImages?: Array<{
    name: string;
    imageUrl: string;
  }>;
  isRegeneration?: boolean; // Track if this is regenerating an existing image
  sceneId?: string; // Optional scene ID for tracking
  skipCreditCheck?: boolean; // Skip credit check (used when admin prepaid for collaborator regeneration)
  ownerId?: string; // Use owner's settings instead of session user (for collaborator regeneration)
  model?: string; // Model ID from project model config (for free users)
}
