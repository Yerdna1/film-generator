import { useState } from 'react';
import { Check, Loader2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import type { OperationType } from './types';
import { API_KEY_FIELDS } from './constants';

interface ProviderCardProps {
  opType: OperationType;
  provider: {
    id: string;
    name: string;
    icon: string;
    color: string;
    apiKeyField?: string;
    modelField?: string;
    modelOptions?: { value: string; label: string }[];
    description?: string;
  };
  isSelected: boolean;
  hasKeyConfigured: boolean;
  values: Record<string, string>;
  errors: Record<string, string>;
  kieModels: Record<string, any[]>;
  loadingKieModels: boolean;
  onSelectProvider: (providerId: string) => Promise<void>;
  onInputChange: (key: string, value: string) => void;
}

export function ProviderCard({
  opType,
  provider,
  isSelected,
  hasKeyConfigured,
  values,
  errors,
  kieModels,
  loadingKieModels,
  onSelectProvider,
  onInputChange,
}: ProviderCardProps) {
  const [isSwitching, setIsSwitching] = useState(false);

  // Determine the correct model field based on provider and operation type
  const getModelFieldForProvider = (providerId: string, operationType: OperationType): string | null => {
    if (providerId === 'kie') {
      // Map operation types to their corresponding model fields
      const fieldMap: Record<OperationType, string> = {
        llm: 'kieLlmModel',
        image: 'kieImageModel',
        video: 'kieVideoModel',
        tts: 'kieTtsModel',
        music: 'kieMusicModel',
      };
      return fieldMap[operationType] || null;
    }
    // For other providers, use their static modelField
    return provider.modelField || null;
  };

  // Get the correct model field for this provider and operation type
  const actualModelField = getModelFieldForProvider(provider.id, opType);

  // Get model options based on provider and operation type
  let modelOptions = provider.modelOptions;
  if (provider.id === 'kie' && actualModelField) {
    // For KIE, use the operation type directly to get the correct models
    const modelType = opType as keyof typeof kieModels;
    if (modelType && kieModels[modelType]) {
      modelOptions = kieModels[modelType].map((m: any) => ({
        value: m.modelId,
        label: m.name,
      }));
    }
  }

  const handleSelectProvider = async () => {
    if (isSwitching || isSelected) return;

    setIsSwitching(true);

    try {
      await onSelectProvider(provider.id);
      toast.success(`Switched to ${provider.name}`);
    } catch (error) {
      console.error('Failed to switch provider:', error);
      toast.error('Failed to switch provider');
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div
      onClick={handleSelectProvider}
      className={`p-4 rounded-lg border-2 transition-all ${
        isSwitching ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
      } ${
        isSelected
          ? `border-${provider.color}-500 bg-${provider.color}-500/10 shadow-lg shadow-${provider.color}-500/20`
          : 'border-gray-700 hover:border-gray-600 bg-gray-800/30 hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{provider.icon}</span>
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              {provider.name}
              {isSwitching && <Loader2 className="w-4 h-4 animate-spin" />}
            </h4>
            {isSelected && (
              <Badge className={`bg-${provider.color}-500 text-white mt-1`}>
                <Check className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSwitching ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : isSelected ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <>
              {hasKeyConfigured && <Check className="w-5 h-5 text-green-500" />}
              <div
                className={`w-5 h-5 rounded-full border-2 border-${provider.color}-500 flex items-center justify-center`}
              >
                <div className="w-2 h-2 rounded-full bg-transparent" />
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{provider.description}</p>

      {provider.apiKeyField && (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <Label className="text-xs">{API_KEY_FIELDS[provider.apiKeyField]?.label}</Label>
            {API_KEY_FIELDS[provider.apiKeyField]?.helpLink && (
              <a
                href={API_KEY_FIELDS[provider.apiKeyField].helpLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Get Key <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <Input
            type="password"
            placeholder={API_KEY_FIELDS[provider.apiKeyField]?.placeholder}
            value={values[provider.apiKeyField] || ''}
            onChange={(e) => onInputChange(provider.apiKeyField!, e.target.value)}
            className={`bg-gray-900/50 ${
              errors[provider.apiKeyField]
                ? 'border-red-500'
                : `border-${isSelected ? provider.color : 'gray'}-700`
            }`}
          />
        </div>
      )}

      {actualModelField && API_KEY_FIELDS[actualModelField] && (
        <div className="space-y-2 mt-3" onClick={(e) => e.stopPropagation()}>
          <Label className="text-xs">{API_KEY_FIELDS[actualModelField]?.label}</Label>
          {modelOptions && modelOptions.length > 0 ? (
            <Combobox
              options={modelOptions}
              value={values[actualModelField] || ''}
              onChange={(value) => onInputChange(actualModelField, value)}
              placeholder={API_KEY_FIELDS[actualModelField]?.placeholder}
              loading={loadingKieModels && provider.id === 'kie'}
              className={errors[actualModelField] ? 'border-red-500' : ''}
            />
          ) : (
            <Input
              placeholder={API_KEY_FIELDS[actualModelField]?.placeholder}
              value={values[actualModelField] || ''}
              onChange={(e) => onInputChange(actualModelField, e.target.value)}
              className={`bg-gray-900/50 ${
                errors[actualModelField]
                  ? 'border-red-500'
                  : `border-${isSelected ? provider.color : 'gray'}-700`
              }`}
            />
          )}
        </div>
      )}
    </div>
  );
}
