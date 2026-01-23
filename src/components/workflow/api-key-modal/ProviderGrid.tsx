import { ProviderCard } from './ProviderCard';
import type { OperationType, ProviderConfig } from './types';
import { Loader2 } from 'lucide-react';

interface ProviderGridProps {
  opType: OperationType;
  providers: ProviderConfig[];
  loadingProviders: boolean;
  currentProvider: string | null;
  hasApiKey: (key: string) => boolean;
  values: Record<string, string>;
  errors: Record<string, string>;
  kieModels: Record<string, any[]>;
  loadingKieModels: boolean;
  onSelectProvider: (providerId: string) => Promise<void>;
  onInputChange: (key: string, value: string) => void;
}

export function ProviderGrid({
  opType,
  providers,
  loadingProviders,
  currentProvider,
  hasApiKey,
  values,
  errors,
  kieModels,
  loadingKieModels,
  onSelectProvider,
  onInputChange,
}: ProviderGridProps) {
  if (loadingProviders) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading providers...</span>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No providers available for this operation type.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Available Providers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            opType={opType}
            provider={provider}
            isSelected={currentProvider === provider.id}
            hasKeyConfigured={
              provider.apiKeyField ? hasApiKey(provider.apiKeyField) : false
            }
            values={values}
            errors={errors}
            kieModels={kieModels}
            loadingKieModels={loadingKieModels}
            onSelectProvider={onSelectProvider}
            onInputChange={onInputChange}
          />
        ))}
      </div>
    </div>
  );
}
