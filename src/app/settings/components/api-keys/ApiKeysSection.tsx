import { Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ApiProviderCard } from '../ApiProviderCard';
import type { ApiConfig } from '@/types/project';
import type { ApiProvider } from '../../constants';

interface ApiKeysSectionProps {
  showKeys: Record<string, boolean>;
  savedKeys: Record<string, boolean>;
  localConfig: Record<string, string | undefined>;
  apiConfig: ApiConfig;
  apiProviders: ApiProvider[];
  llmProvider?: string;
  onToggleVisibility: (key: string) => void;
  onSaveKey: (key: string) => void;
  onUpdateConfig: (key: string, value: string) => void;
  title?: string;
  description?: string;
}

export function ApiKeysSection({
  showKeys,
  savedKeys,
  localConfig,
  apiConfig,
  apiProviders,
  llmProvider,
  onToggleVisibility,
  onSaveKey,
  onUpdateConfig,
  title,
  description,
}: ApiKeysSectionProps) {
  return (
    <Card className="glass border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5 text-purple-400" />
          {title || 'API Keys'}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {apiProviders.map((provider, index) => (
            <ApiProviderCard
              key={provider.key}
              provider={provider}
              index={index}
              showKey={showKeys[provider.key] || false}
              isSaved={savedKeys[provider.key] || false}
              value={localConfig[provider.key] || ''}
              isConfigured={!!(apiConfig as Record<string, string | undefined>)[provider.key]}
              onToggleVisibility={() => onToggleVisibility(provider.key)}
              onSave={() => onSaveKey(provider.key)}
              onChange={(value) => onUpdateConfig(provider.key, value)}
              isHighlighted={
                provider.isLLMProvider && llmProvider === 'openrouter' && !(apiConfig as Record<string, string | undefined>)[provider.key]
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
