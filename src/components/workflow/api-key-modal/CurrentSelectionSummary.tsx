import { Badge } from '@/components/ui/badge';
import type { OperationType } from './types';
import { OPERATION_INFO, PROVIDER_CONFIGS } from './constants';

interface CurrentSelectionSummaryProps {
  opType: OperationType;
  currentProvider: string | null;
  currentModel: string | null;
}

export function CurrentSelectionSummary({
  opType,
  currentProvider,
  currentModel,
}: CurrentSelectionSummaryProps) {
  const info = OPERATION_INFO[opType];
  const providerConfig = currentProvider
    ? PROVIDER_CONFIGS[opType].find((p) => p.id === currentProvider)
    : null;

  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        currentProvider
          ? `border-${providerConfig?.color || 'gray'}-500 bg-${providerConfig?.color || 'gray'}-500/10`
          : 'border-gray-700 bg-gray-800/50'
      } transition-all`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{info.icon}</span>
          <div>
            <h4 className="font-semibold">{info.label}</h4>
            <p className="text-xs text-muted-foreground">{info.description}</p>
          </div>
        </div>
        {currentProvider ? (
          <Badge className={`bg-${providerConfig?.color || 'gray'}-500 text-white`}>
            {providerConfig?.icon} {providerConfig?.name}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-500">
            Not configured
          </Badge>
        )}
      </div>

      {currentProvider && providerConfig?.modelField && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Model:</span>
            <span className="font-mono text-xs bg-black/30 px-2 py-1 rounded">
              {currentModel || 'Default'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
