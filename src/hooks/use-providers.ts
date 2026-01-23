import useSWR from 'swr';
import type { OperationType } from '@/components/workflow/api-key-modal/types';

export interface Provider {
  id: string;
  providerId: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description?: string | null;
  apiKeyField: string;
  modelField?: string | null;
  supportedModalities: string[];
  isDefault: boolean;
  requiresEndpoint: boolean;
  helpLink?: string | null;
  setupGuide?: any;
}

interface UseProvidersOptions {
  modality?: OperationType;
  revalidateOnFocus?: boolean;
  revalidateOnMount?: boolean;
}

interface UseProvidersReturn {
  providers: Provider[];
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

async function fetcher(url: string): Promise<{ providers: Provider[] }> {
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch providers');
  }

  return response.json();
}

export function useProviders(options: UseProvidersOptions = {}): UseProvidersReturn {
  const {
    modality,
    revalidateOnFocus = false,
    revalidateOnMount = true,
  } = options;

  // Build URL with optional modality filter
  const url = modality
    ? `/api/providers?modality=${modality}`
    : '/api/providers';

  const { data, error, mutate } = useSWR(
    url,
    fetcher,
    {
      revalidateOnFocus,
      revalidateOnMount,
      dedupingInterval: 5000, // 5 seconds
      refreshInterval: 0, // No auto-refresh for providers
    }
  );

  return {
    providers: data?.providers || [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}

// Hook to get providers for a specific operation type
export function useProvidersForOperation(operationType: OperationType): UseProvidersReturn {
  return useProviders({ modality: operationType });
}

// Hook to get all providers grouped by operation type
export function useProvidersByOperation() {
  const { providers, isLoading, error, mutate } = useProviders();

  // Group providers by their supported modalities
  const providersByOperation = providers.reduce((acc, provider) => {
    provider.supportedModalities.forEach(modality => {
      if (!acc[modality as OperationType]) {
        acc[modality as OperationType] = [];
      }
      acc[modality as OperationType].push(provider);
    });
    return acc;
  }, {} as Record<OperationType, Provider[]>);

  return {
    providersByOperation,
    isLoading,
    error,
    mutate,
  };
}