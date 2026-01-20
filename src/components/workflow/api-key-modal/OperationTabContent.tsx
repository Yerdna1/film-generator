import { CurrentSelectionSummary } from './CurrentSelectionSummary';
import { ProviderGrid } from './ProviderGrid';
import type { OperationType } from './types';
import { OPERATION_INFO } from './constants';

interface OperationTabContentProps {
  opType: OperationType;
  currentProvider: string | null;
  currentModel: string | null;
  hasApiKey: (key: string) => boolean;
  values: Record<string, string>;
  errors: Record<string, string>;
  kieModels: Record<string, any[]>;
  loadingKieModels: boolean;
  onSelectProvider: (providerId: string) => Promise<void>;
  onInputChange: (key: string, value: string) => void;
}

export function OperationTabContent({
  opType,
  currentProvider,
  currentModel,
  hasApiKey,
  values,
  errors,
  kieModels,
  loadingKieModels,
  onSelectProvider,
  onInputChange,
}: OperationTabContentProps) {
  const info = OPERATION_INFO[opType];

  return (
    <div className="space-y-4">
      {/* Current Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <span>{info.icon}</span>
          Current Selection: {info.label}
        </h3>
        <CurrentSelectionSummary
          opType={opType}
          currentProvider={currentProvider}
          currentModel={currentModel}
        />
      </div>

      {/* Provider Selection */}
      <ProviderGrid
        opType={opType}
        currentProvider={currentProvider}
        hasApiKey={hasApiKey}
        values={values}
        errors={errors}
        kieModels={kieModels}
        loadingKieModels={loadingKieModels}
        onSelectProvider={onSelectProvider}
        onInputChange={onInputChange}
      />
    </div>
  );
}
