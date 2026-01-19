import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import type { TabProps } from '../types';
import type { LLMProvider, UnifiedModelConfig } from '@/types/project';
import { LLM_MODELS, ApiKeyInput, CompactSelect } from '../../model-config';

export function LLMTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser = true }: TabProps) {
  const t = useTranslations();

  const updateLLM = (updates: Partial<UnifiedModelConfig['llm']>) => {
    onUpdateConfig({ llm: { ...config.llm, ...updates } });
  };

  // Provider options
  const providerOptions = [
    {
      value: 'openrouter',
      label: 'OpenRouter',
      badge: isFreeUser && !apiKeysData?.hasOpenRouterKey ? 'Key Needed' : (!isFreeUser ? '✓' : undefined)
    },
    { value: 'gemini', label: 'Gemini', badge: 'Free' },
    {
      value: 'claude-sdk',
      label: 'Claude SDK',
      badge: isFreeUser && !apiKeysData?.hasClaudeKey ? 'Key Needed' : (!isFreeUser ? '✓' : undefined)
    },
    { value: 'modal', label: 'Modal', badge: 'Self-hosted' },
  ];

  // Model options
  const modelOptions = LLM_MODELS[config.llm.provider]?.map(model => ({
    value: model.id,
    label: model.name,
    badge: model.badge,
  })) || [];

  // Get current provider's API key status
  const needsApiKey = (provider: string) => {
    return isFreeUser && provider !== 'gemini' && provider !== 'modal';
  };

  const hasApiKey = (provider: string) => {
    if (!apiKeysData) return false;
    switch (provider) {
      case 'openrouter': return apiKeysData.hasOpenRouterKey;
      case 'claude-sdk': return apiKeysData.hasClaudeKey;
      default: return true;
    }
  };

  return (
    <TabsContent value="llm" className="space-y-4 pt-4 overflow-hidden">
      <div className="grid gap-4">
        {/* Provider & Model Selection */}
        <div className="grid gap-4 grid-cols-[1fr,3fr]">
          <CompactSelect
            label={t('step1.modelConfiguration.llm.provider')}
            value={config.llm.provider}
            onChange={(value) => updateLLM({ provider: value as LLMProvider })}
            options={providerOptions}
            disabled={disabled}
          />

          <CompactSelect
            label={t('step1.modelConfiguration.llm.model')}
            value={config.llm.model}
            onChange={(value) => updateLLM({ model: value })}
            options={modelOptions}
            disabled={disabled}
          />
        </div>

        {/* API Key Input */}
        {isFreeUser && needsApiKey(config.llm.provider) && (
          <>
            {config.llm.provider === 'openrouter' && (
              <ApiKeyInput
                provider="OpenRouter"
                apiKeyName="openRouterApiKey"
                hasKey={!!apiKeysData?.hasOpenRouterKey}
                onSave={onSaveApiKey}
              />
            )}
            {config.llm.provider === 'claude-sdk' && (
              <ApiKeyInput
                provider="Anthropic"
                apiKeyName="claudeApiKey"
                hasKey={!!apiKeysData?.hasClaudeKey}
                onSave={onSaveApiKey}
              />
            )}
          </>
        )}
      </div>
    </TabsContent>
  );
}