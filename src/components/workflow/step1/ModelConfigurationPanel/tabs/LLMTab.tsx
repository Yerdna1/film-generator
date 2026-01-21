import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import type { TabProps } from '../types';
import type { LLMProvider, UnifiedModelConfig } from '@/types/project';
import { LLM_MODELS, ApiKeyInput, CompactSelect } from '../../model-config';
import { useLlmModels } from '@/hooks/use-kie-models';
import { useEffect } from 'react';

interface LLMTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function LLMTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser = true }: LLMTabProps) {
  const t = useTranslations();
  const { models: llmModels } = useLlmModels();

  const updateLLM = (updates: Partial<UnifiedModelConfig['llm']>) => {
    onUpdateConfig({ llm: { ...config.llm, ...updates } });
  };

  // Handle provider change - auto-select valid model for KIE
  const handleProviderChange = (value: string) => {
    const updates: Partial<UnifiedModelConfig['llm']> = { provider: value as LLMProvider };

    // If switching to KIE, auto-select the first available KIE model
    if (value === 'kie' && llmModels.length > 0) {
      // Select the cheapest model (sorted by cost ascending)
      const cheapestModel = llmModels.sort((a, b) => (a.cost || 0) - (b.cost || 0))[0];
      updates.model = cheapestModel.modelId;
    } else if (value === 'openrouter') {
      // Select default OpenRouter model
      updates.model = LLM_MODELS.openrouter[0]?.id || '';
    } else if (value === 'claude-sdk') {
      updates.model = LLM_MODELS['claude-sdk'][0]?.id || '';
    } else if (value === 'modal') {
      updates.model = LLM_MODELS.modal[0]?.id || '';
    } else if (value === 'gemini') {
      updates.model = LLM_MODELS.gemini[0]?.id || '';
    }

    updateLLM(updates);
  };

  // Auto-select KIE model if provider is KIE but no valid model is selected
  useEffect(() => {
    if (config.llm.provider === 'kie' && llmModels.length > 0) {
      const validKieModel = llmModels.find(m => m.modelId === config.llm.model);
      if (!validKieModel) {
        // Current model is not a valid KIE model, select the cheapest one
        const cheapestModel = llmModels.sort((a, b) => (a.cost || 0) - (b.cost || 0))[0];
        updateLLM({ model: cheapestModel.modelId });
      }
    }
  }, [config.llm.provider, llmModels]);

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
              onChange={handleProviderChange}
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