import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { TabProps } from '../types';
import type { LLMProvider, UnifiedModelConfig } from '@/types/project';
import { LLM_MODELS, ApiKeyInput } from '../../model-config';

export function LLMTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey }: TabProps) {
  const t = useTranslations();

  const updateLLM = (updates: Partial<UnifiedModelConfig['llm']>) => {
    onUpdateConfig({ llm: { ...config.llm, ...updates } });
  };

  const getProviderBadge = (provider: string, hasKey: boolean) => {
    if (!hasKey && provider !== 'gemini' && provider !== 'gemini-tts') {
      return <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-200 bg-amber-50">Key Needed</Badge>;
    }
    return null;
  };

  return (
    <TabsContent value="llm" className="space-y-4 pt-4">
      <div className="grid gap-4">
        <div>
          <Label>{t('step1.modelConfiguration.llm.provider')}</Label>
          <Select
            value={config.llm.provider}
            onValueChange={(value: LLMProvider) => updateLLM({ provider: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openrouter">
                OpenRouter
                {getProviderBadge('openrouter', !!apiKeysData?.hasOpenRouterKey)}
              </SelectItem>
              <SelectItem value="gemini">Gemini (Free)</SelectItem>
              <SelectItem value="claude-sdk">
                Claude SDK
                {getProviderBadge('claude-sdk', !!apiKeysData?.hasClaudeKey)}
              </SelectItem>
              <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
            </SelectContent>
          </Select>

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
        </div>

        <div>
          <Label>{t('step1.modelConfiguration.llm.model')}</Label>
          <Select
            value={config.llm.model}
            onValueChange={(value: string) => updateLLM({ model: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LLM_MODELS[config.llm.provider as keyof typeof LLM_MODELS]?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{model.name}</span>
                    <Badge variant={model.badge === 'FREE' ? 'secondary' : 'default'} className="ml-2">
                      {model.badge}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </TabsContent>
  );
}