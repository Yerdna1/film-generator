import { ImageProvider, VideoProvider, TTSProvider, MusicProvider, LLMProvider } from '@/types/project';

// Base generation types
export type GenerationType = 'image' | 'video' | 'tts' | 'music' | 'llm';

export type ProviderType = ImageProvider | VideoProvider | TTSProvider | MusicProvider | LLMProvider;

// Generation status types
export type GenerationStatus = 'pending' | 'processing' | 'complete' | 'error' | 'cancelled';

export interface TaskStatus {
  status: GenerationStatus;
  progress?: number;
  message?: string;
  error?: string;
}

// Provider configuration
export interface ProviderConfig {
  provider: ProviderType;
  apiKey: string;
  endpoint?: string;
  model?: string;
  userHasOwnApiKey?: boolean;
}

// Base request/response interfaces
export interface BaseGenerationRequest {
  prompt?: string;
  projectId?: string;
  sceneId?: string;
  characterId?: string;
  isRegeneration?: boolean;
  skipCreditCheck?: boolean;
  settingsUserId?: string;
  ownerId?: string;
}

export interface BaseGenerationResponse {
  url?: string;
  externalUrl?: string;
  base64?: string;
  taskId?: string;
  status: GenerationStatus;
  message?: string;
  error?: string;
  cost?: number;
  realCost?: number;
  metadata?: Record<string, any>;
}

// Provider interfaces
export interface Provider<TRequest extends BaseGenerationRequest, TResponse extends BaseGenerationResponse> {
  name: string;
  type: GenerationType;

  validateConfig(): Promise<void>;
  generate(request: TRequest): Promise<TResponse>;
  estimateCost?(request: TRequest): number;
}

export interface AsyncProvider<TRequest extends BaseGenerationRequest, TResponse extends BaseGenerationResponse> extends Provider<TRequest, TResponse> {
  createTask(request: TRequest): Promise<{ taskId: string }>;
  checkStatus(taskId: string): Promise<TaskStatus>;
  getResult(taskId: string): Promise<TResponse>;
}

// Image-specific types
export interface ImageGenerationRequest extends BaseGenerationRequest {
  resolution?: string;
  aspectRatio?: string;
  referenceImages?: Array<{ name: string; imageUrl: string }>;
  seed?: string | number;
  modelEndpoint?: string;
}

export interface ImageGenerationResponse extends BaseGenerationResponse {
  imageUrl?: string;
  width?: number;
  height?: number;
}

// Video-specific types
export interface VideoGenerationRequest extends BaseGenerationRequest {
  imageUrl: string;
  mode?: string;
  seed?: string | number;
}

export interface VideoGenerationResponse extends BaseGenerationResponse {
  videoUrl?: string;
  duration?: number;
  fps?: number;
}

// TTS-specific types
export interface TTSGenerationRequest extends BaseGenerationRequest {
  text: string;
  voice?: string;
  voiceSettings?: {
    speed?: number;
    pitch?: number;
    volume?: number;
    stability?: number;
    similarityBoost?: number;
  };
  format?: 'mp3' | 'wav' | 'opus' | 'aac';
  languageCode?: string;
}

export interface TTSGenerationResponse extends BaseGenerationResponse {
  audioUrl?: string;
  duration?: number;
  format?: string;
}

// Music-specific types
export interface MusicGenerationRequest extends BaseGenerationRequest {
  description?: string;
  duration?: number;
  style?: string;
  instruments?: string[];
}

export interface MusicGenerationResponse extends BaseGenerationResponse {
  musicUrl?: string;
  duration?: number;
  tags?: string[];
}

// Unified generation request/response for v2 API
export interface UnifiedGenerationRequest {
  type: GenerationType;
  provider?: ProviderType;
  config: ImageGenerationRequest | VideoGenerationRequest | TTSGenerationRequest | MusicGenerationRequest;
  metadata?: {
    projectId?: string;
    sceneId?: string;
    characterId?: string;
    isRegeneration?: boolean;
    webhookUrl?: string;
  };
}

export interface UnifiedGenerationResponse {
  id: string;
  type: GenerationType;
  provider: ProviderType;
  status: GenerationStatus;
  result?: BaseGenerationResponse;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  error?: string;
}

// Batch generation types
export interface BatchGenerationRequest {
  items: Array<{
    type: GenerationType;
    provider?: ProviderType;
    config: ImageGenerationRequest | VideoGenerationRequest | TTSGenerationRequest | MusicGenerationRequest;
    metadata?: Record<string, any>;
  }>;
  webhookUrl?: string;
  parallel?: boolean;
  continueOnError?: boolean;
}

export interface BatchGenerationResponse {
  id: string;
  status: 'complete' | 'partial' | 'error';
  total: number;
  completed: number;
  failed: number;
  results: Array<{
    index: number;
    type: GenerationType;
    provider: ProviderType;
    status: GenerationStatus;
    result?: BaseGenerationResponse;
    error?: string;
  }>;
}

// Provider metadata for discovery
export interface ProviderMetadata {
  name: string;
  type: GenerationType;
  provider: ProviderType;
  description: string;
  features: string[];
  limitations?: string[];
  costPerUnit?: number;
  isAsync: boolean;
  supportsBatch?: boolean;
  maxBatchSize?: number;
}

// Cost estimation
export interface CostEstimate {
  creditCost: number;
  realCost: number;
  currency: string;
  breakdown?: {
    base: number;
    multipliers: Record<string, number>;
  };
}

// Error types
export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderValidationError extends ProviderError {
  constructor(message: string, provider: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', provider, details);
    this.name = 'ProviderValidationError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(message: string, provider: string, details?: Record<string, any>) {
    super(message, 'AUTH_ERROR', provider, details);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(message: string, provider: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT', provider, { retryAfter });
    this.name = 'ProviderRateLimitError';
  }
}