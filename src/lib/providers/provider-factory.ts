import {
  Provider,
  AsyncProvider,
  BaseGenerationRequest,
  BaseGenerationResponse,
  GenerationType,
  ProviderType,
  ProviderConfig,
  ProviderMetadata,
  ProviderError,
} from './types';

// Provider registry
type ProviderConstructor<T extends Provider<any, any>> = new (config: ProviderConfig) => T;

class ProviderRegistry {
  private providers = new Map<string, {
    constructor: ProviderConstructor<any>;
    metadata: ProviderMetadata;
  }>();

  register<T extends Provider<any, any>>(
    type: GenerationType,
    provider: ProviderType,
    constructor: ProviderConstructor<T>,
    metadata: Omit<ProviderMetadata, 'type' | 'provider'>
  ) {
    const key = `${type}:${provider}`;
    this.providers.set(key, {
      constructor,
      metadata: {
        ...metadata,
        type,
        provider,
      },
    });
  }

  get(type: GenerationType, provider: ProviderType) {
    const key = `${type}:${provider}`;
    const entry = this.providers.get(key);
    if (!entry) {
      throw new ProviderError(
        `Provider not found: ${type}:${provider}`,
        'PROVIDER_NOT_FOUND',
        provider
      );
    }
    return entry;
  }

  getAll(type?: GenerationType): ProviderMetadata[] {
    const entries = Array.from(this.providers.values());
    if (type) {
      return entries
        .filter(e => e.metadata.type === type)
        .map(e => e.metadata);
    }
    return entries.map(e => e.metadata);
  }

  has(type: GenerationType, provider: ProviderType): boolean {
    const key = `${type}:${provider}`;
    return this.providers.has(key);
  }
}

// Global registry instance
export const providerRegistry = new ProviderRegistry();

// Provider factory
export function createProvider<
  TRequest extends BaseGenerationRequest,
  TResponse extends BaseGenerationResponse
>(
  type: GenerationType,
  config: ProviderConfig
): Provider<TRequest, TResponse> {
  const { constructor } = providerRegistry.get(type, config.provider);
  return new constructor(config);
}

// Check if provider is async
export function isAsyncProvider(
  provider: Provider<any, any>
): provider is AsyncProvider<any, any> {
  return 'createTask' in provider && 'checkStatus' in provider && 'getResult' in provider;
}

// Get provider metadata
export function getProviderMetadata(
  type: GenerationType,
  provider: ProviderType
): ProviderMetadata {
  const { metadata } = providerRegistry.get(type, provider);
  return metadata;
}

// List available providers
export function listProviders(type?: GenerationType): ProviderMetadata[] {
  return providerRegistry.getAll(type);
}

// Provider availability check
export async function checkProviderAvailability(
  type: GenerationType,
  provider: ProviderType,
  config: ProviderConfig
): Promise<boolean> {
  try {
    const instance = createProvider(type, config);
    await instance.validateConfig();
    return true;
  } catch (error) {
    console.error(`Provider ${type}:${provider} validation failed:`, error);
    return false;
  }
}

// Find optimal provider based on criteria
export interface ProviderSelectionCriteria {
  type: GenerationType;
  priority?: 'cost' | 'speed' | 'quality';
  maxCost?: number;
  requiresAsync?: boolean;
  preferredProviders?: ProviderType[];
  excludeProviders?: ProviderType[];
}

export async function selectOptimalProvider(
  criteria: ProviderSelectionCriteria,
  userConfig: Partial<ProviderConfig>
): Promise<{ provider: ProviderType; metadata: ProviderMetadata }> {
  const availableProviders = listProviders(criteria.type);

  // Filter by criteria
  let candidates = availableProviders.filter(meta => {
    // Check if excluded
    if (criteria.excludeProviders?.includes(meta.provider)) {
      return false;
    }

    // Check async requirement
    if (criteria.requiresAsync && !meta.isAsync) {
      return false;
    }

    // Check cost limit
    if (criteria.maxCost && meta.costPerUnit && meta.costPerUnit > criteria.maxCost) {
      return false;
    }

    return true;
  });

  // Prefer specific providers
  if (criteria.preferredProviders && criteria.preferredProviders.length > 0) {
    const preferred = candidates.filter(meta =>
      criteria.preferredProviders!.includes(meta.provider)
    );
    if (preferred.length > 0) {
      candidates = preferred;
    }
  }

  // Sort by priority
  if (criteria.priority) {
    candidates.sort((a, b) => {
      switch (criteria.priority) {
        case 'cost':
          return (a.costPerUnit || Infinity) - (b.costPerUnit || Infinity);
        case 'speed':
          // Sync providers are generally faster than async
          return (a.isAsync ? 1 : 0) - (b.isAsync ? 1 : 0);
        case 'quality':
          // This could be enhanced with a quality score
          // For now, prefer providers with more features
          return (b.features.length || 0) - (a.features.length || 0);
        default:
          return 0;
      }
    });
  }

  // Check availability
  for (const candidate of candidates) {
    const config: ProviderConfig = {
      ...userConfig,
      provider: candidate.provider,
    } as ProviderConfig;

    if (await checkProviderAvailability(criteria.type, candidate.provider, config)) {
      return { provider: candidate.provider, metadata: candidate };
    }
  }

  throw new ProviderError(
    `No available provider found for ${criteria.type}`,
    'NO_PROVIDER_AVAILABLE',
    'system'
  );
}

// Batch provider check
export async function checkAllProviders(
  type: GenerationType,
  config: Partial<ProviderConfig>
): Promise<Record<ProviderType, boolean>> {
  const providers = listProviders(type);
  const results: Record<ProviderType, boolean> = {} as any;

  await Promise.all(
    providers.map(async (meta) => {
      const fullConfig: ProviderConfig = {
        ...config,
        provider: meta.provider,
      } as ProviderConfig;

      results[meta.provider] = await checkProviderAvailability(
        type,
        meta.provider,
        fullConfig
      );
    })
  );

  return results;
}

// Provider decorator for auto-registration
export function RegisterProvider(
  type: GenerationType,
  provider: ProviderType,
  metadata: Omit<ProviderMetadata, 'type' | 'provider' | 'name'>
) {
  return function <T extends ProviderConstructor<any>>(constructor: T): T {
    providerRegistry.register(type, provider, constructor, {
      ...metadata,
      name: constructor.name,
    });
    return constructor;
  };
}