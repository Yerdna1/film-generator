// Types for music generation

export interface MusicGenerationRequest {
  prompt: string;
  instrumental?: boolean;
  title?: string;
}

export interface MusicGenerationResult {
  audioUrl?: string;
  title?: string;
  success: boolean;
  error?: string;
  taskId?: string;
}

export interface MusicGenerationOptions {
  userId: string;
  projectId: string | undefined;
  userHasOwnApiKey?: boolean;
}

export interface ProviderConfig {
  provider: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}
