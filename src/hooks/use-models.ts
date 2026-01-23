import useSWR from 'swr';
import type { OperationType } from '@/components/workflow/api-key-modal/types';

export interface Model {
  id: string;
  modelId: string;
  name: string;
  displayName: string;
  providerId: string;
  providerName?: string;
  description?: string;
  apiModelId: string;
  cost: number;
  credits: number;
  // Type-specific fields
  qualityOptions?: string[];
  supportedAspectRatios?: string[];
  supportedResolutions?: string[];
  maxPromptLength?: number;
  maxImages?: number;
  defaultResolution?: string;
  defaultDuration?: string;
  defaultAspectRatio?: string;
  supportedLanguages?: string[];
  voiceOptions?: any;
  maxTextLength?: number;
  durationOptions?: string[];
  genreSupport?: string[];
  maxDuration?: number;
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: string[];
}

interface UseModelsOptions {
  type: OperationType;
  providerId?: string;
  revalidateOnFocus?: boolean;
  revalidateOnMount?: boolean;
}

interface UseModelsReturn {
  models: Model[];
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

async function fetcher(url: string): Promise<{ models: Model[] }> {
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch models');
  }

  return response.json();
}

export function useModels(options: UseModelsOptions): UseModelsReturn {
  const {
    type,
    providerId,
    revalidateOnFocus = false,
    revalidateOnMount = true,
  } = options;

  // Build URL with optional provider filter
  const url = providerId
    ? `/api/models/${type}?providerId=${providerId}`
    : `/api/models/${type}`;

  const { data, error, mutate } = useSWR(
    url,
    fetcher,
    {
      revalidateOnFocus,
      revalidateOnMount,
      dedupingInterval: 5000, // 5 seconds
      refreshInterval: 0, // No auto-refresh for models
    }
  );

  return {
    models: data?.models || [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}

// Hook to get models for select options
export function useModelOptions(type: OperationType, providerId?: string) {
  const { models, isLoading, error } = useModels({ type, providerId });

  const options = models.map(model => ({
    value: model.modelId,
    label: model.displayName,
    description: model.description,
    cost: model.cost,
    credits: model.credits,
  }));

  return {
    options,
    isLoading,
    error,
  };
}