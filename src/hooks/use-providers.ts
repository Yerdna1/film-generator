import useSWR from 'swr';
import type { OperationType, ProviderConfig } from '@/components/workflow/api-key-modal/types';

// Provider interface that includes all fields from the API response
export interface Provider {
  id: string;
  providerId: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description?: string;
  apiKeyField?: string;
  modelField?: string;
  supportedModalities: string[];
  isDefault?: boolean;
  requiresEndpoint: boolean;
  helpLink?: string;
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

  // Group providers by their supported modalities and map to ProviderConfig
  const providersByOperation = providers.reduce((acc, provider) => {
    const providerConfig: ProviderConfig = {
      id: provider.id,
      name: provider.name,
      icon: provider.icon,
      color: provider.color,
      apiKeyField: provider.apiKeyField,
      modelField: provider.modelField,
      description: provider.description,
      isDefault: provider.isDefault,
    };

    provider.supportedModalities.forEach(modality => {
      if (!acc[modality as OperationType]) {
        acc[modality as OperationType] = [];
      }
      acc[modality as OperationType].push(providerConfig);
    });
    return acc;
  }, {} as Record<OperationType, ProviderConfig[]>);

  return {
    providersByOperation,
    isLoading,
    error,
    mutate,
  };
}