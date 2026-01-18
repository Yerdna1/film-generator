// Import types for use in this file
import type {
  GenerationType,
  GenerationStatus,
  ProviderType,
  BaseGenerationRequest,
  BaseGenerationResponse,
} from '@/lib/providers/types';

// Re-export commonly used types from providers
export type {
  GenerationType,
  GenerationStatus,
  ProviderType,
  BaseGenerationRequest,
  BaseGenerationResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
  TTSGenerationRequest,
  TTSGenerationResponse,
  MusicGenerationRequest,
  MusicGenerationResponse,
  UnifiedGenerationRequest,
  UnifiedGenerationResponse,
  TaskStatus,
  ProviderConfig,
  CostEstimate,
} from '@/lib/providers/types';

// Generation queue types
export interface QueuedGeneration {
  id: string;
  type: GenerationType;
  provider: ProviderType;
  request: BaseGenerationRequest;
  status: GenerationStatus;
  priority: number;
  retries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: BaseGenerationResponse;
  error?: string;
  webhookUrl?: string;
}

// Webhook payload
export interface GenerationWebhookPayload {
  id: string;
  type: GenerationType;
  provider: ProviderType;
  status: GenerationStatus;
  result?: BaseGenerationResponse;
  error?: string;
  completedAt: Date;
  metadata?: Record<string, any>;
}

// Batch generation types
export interface BatchGenerationRequest {
  items: Array<{
    type: GenerationType;
    provider?: ProviderType;
    config: BaseGenerationRequest;
    metadata?: Record<string, any>;
  }>;
  webhookUrl?: string;
  parallel?: boolean;
  continueOnError?: boolean;
}

export interface BatchGenerationResponse {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'partial' | 'error';
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

// Provider health types
export interface ProviderHealth {
  provider: ProviderType;
  type: GenerationType;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  successRate: number;
  lastChecked: Date;
  recentErrors: Array<{
    timestamp: Date;
    error: string;
    code?: string;
  }>;
}

// Generation metrics
export interface GenerationMetrics {
  provider: ProviderType;
  type: GenerationType;
  period: 'hour' | 'day' | 'week' | 'month';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalCost: number;
  byStatus: Record<GenerationStatus, number>;
}