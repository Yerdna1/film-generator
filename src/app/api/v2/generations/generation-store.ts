// Temporary in-memory store for active generations
// In production, this should be replaced with Redis or a database

import type { GenerationType, ProviderType } from '@/lib/providers';

export interface ActiveGeneration {
  type: GenerationType;
  provider: ProviderType;
  status: 'pending' | 'processing' | 'complete' | 'error' | 'cancelled';
  createdAt: Date;
  result?: any;
  error?: string;
}

export const activeGenerations = new Map<string, ActiveGeneration>();