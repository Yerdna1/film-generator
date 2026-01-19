import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import type { TabProps } from '../types';
import type { LLMProvider, UnifiedModelConfig } from '@/types/project';
import { LLM_MODELS, ApiKeyInput, CompactSelect } from '../../model-config';
import { useLlmModels } from '@/hooks/use-kie-models';

interface LLMTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function LLMTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser = true }: LLMTabProps) {
  const t = useTranslations();
  const { models: llmModels } = useLlmModels();

  const updateLLM = (updates: Partial<UnifiedModelConfig['llm']>) => {
    onUpdateConfig({ llm: { ...config.llm, ...updates } });
  };

  // Provider options
  const providerOptions = [
    { value: 'kie', label: 'KIE AI', badge: undefined },
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

  // Model options - combine static models with KIE database models
  const modelOptions = [
    ...(LLM_MODELS[config.llm.provider as keyof typeof LLM_MODELS] || []).map(model => ({
      value: model.id,
      label: model.name,
      badge: model.badge as string | undefined,
    })),
    ...(config.llm.provider === 'kie' ? llmModels.map(model => ({
      value: model.modelId,
      label: model.name,
      badge: model.credits ? `${model.credits} credits` : undefined,
    })) : []),
  ];

  // Get current provider's API key status
  const needsApiKey = (provider: string) => {
    return isFreeUser && provider !== 'gemini' && provider !== 'modal';
  };

  return (
    <TabsContent value="llm" className="space-y-4 pt-4 overflow-hidden">
      <div className="grid gap-4">
        {/* Provider & Model Selection - Side by side with labels on top */}
        <div className="flex gap-2 items-start">
          <div className="space-y-1 shrink-0">
            <CompactSelect
              label={t('step1.modelConfiguration.llm.provider')}
              value={config.llm.provider}
              onChange={(value) => updateLLM({ provider: value as LLMProvider })}
              options={providerOptions}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <CompactSelect
              label={t('step1.modelConfiguration.llm.model')}
              value={config.llm.model}
              onChange={(value) => updateLLM({ model: value })}
              options={modelOptions}
              disabled={disabled}
            />
          </div>
        </div>

        {/* API Key Input */}
        {isFreeUser && needsApiKey(config.llm.provider) && (
          <>
            {config.llm.provider === 'kie' && (
              <ApiKeyInput
                provider="KIE.ai"
                apiKeyName="kieApiKey"
                hasKey={!!apiKeysData?.hasKieKey}
                maskedKey={apiKeysData?.kieApiKey}
                onSave={onSaveApiKey}
              />
            )}
            {config.llm.provider === 'openrouter' && (
              <ApiKeyInput
                provider="OpenRouter"
                apiKeyName="openRouterApiKey"
                hasKey={!!apiKeysData?.hasOpenRouterKey}
                maskedKey={apiKeysData?.openRouterApiKey}
                onSave={onSaveApiKey}
              />
            )}
            {config.llm.provider === 'claude-sdk' && (
              <ApiKeyInput
                provider="Anthropic"
                apiKeyName="claudeApiKey"
                hasKey={!!apiKeysData?.hasClaudeKey}
                maskedKey={apiKeysData?.claudeApiKey}
                onSave={onSaveApiKey}
              />
            )}
          </>
        )}
      </div>
    </TabsContent>
  );
}