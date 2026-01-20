import { ProviderCard } from './ProviderCard';
import type { OperationType } from './types';
import { PROVIDER_CONFIGS } from './constants';

interface ProviderGridProps {
  opType: OperationType;
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
  currentProvider,
  hasApiKey,
  values,
  errors,
  kieModels,
  loadingKieModels,
  onSelectProvider,
  onInputChange,
}: ProviderGridProps) {
  const providers = PROVIDER_CONFIGS[opType];

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
