import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import type { TabProps } from '../types';
import type { TTSProvider, UnifiedModelConfig } from '@/types/project';
import {
  TTS_MODELS,
  ApiKeyInput,
  CompactSelect
} from '../../model-config';
import { useTtsModels, type KieTtsModel } from '@/hooks/use-kie-models';

interface VoiceTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function VoiceTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: VoiceTabProps) {
  const t = useTranslations();
  const { models: ttsModels, loading: modelsLoading } = useTtsModels();

  const updateTTS = (updates: Partial<UnifiedModelConfig['tts']>) => {
    onUpdateConfig({ tts: { ...config.tts, ...updates } });
  };

  // Get the selected model configuration
  const selectedModelId = config.tts.model || TTS_MODELS[config.tts.provider as keyof typeof TTS_MODELS]?.[0]?.id;
  const modelConfig = ttsModels.find(m => m.modelId === selectedModelId);

  // When a KIE TTS model is selected, language combo box should be disabled
  // since the model has specific supported languages
  const isKieModelSelected = config.tts.provider === 'kie' && !!modelConfig;

  // Provider options
  const providerOptions = [
    { value: 'gemini-tts', label: 'Gemini TTS', badge: 'Free' },
    { value: 'elevenlabs', label: 'ElevenLabs', badge: undefined },
    { value: 'openai-tts', label: 'OpenAI TTS', badge: undefined },
    { value: 'kie', label: 'KIE AI', badge: undefined },
    { value: 'modal', label: 'Modal', badge: 'Self-hosted' },
  ];

  // Model options
  const modelOptions = [
    ...(TTS_MODELS[config.tts.provider as keyof typeof TTS_MODELS] || []).map(model => ({
      value: model.id,
      label: model.name,
      badge: undefined as string | undefined,
    })),
    ...(config.tts.provider === 'kie' ? ttsModels.map(model => ({
      value: model.modelId,
      label: model.name,
      badge: `${model.credits} credits`,
    })) : []),
  ];

  return (
    <TabsContent value="voice" className="space-y-4 pt-4">
      <div className="grid gap-4">
        {/* Provider & Model Selection - Side by side with labels on top */}
        <div className="flex gap-2 items-start">
          <div className="space-y-1 shrink-0">
            <CompactSelect
              label={t('step1.modelConfiguration.voice.provider')}
              value={config.tts.provider}
              onChange={(value) => updateTTS({ provider: value as TTSProvider })}
              options={providerOptions}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <CompactSelect
              label={t('step1.modelConfiguration.voice.model')}
              value={selectedModelId}
              onChange={(value: string) => updateTTS({ model: value })}
              options={modelOptions}
              disabled={disabled}
            />
          </div>
        </div>

        {/* API Key Inputs */}
        {config.tts.provider === 'elevenlabs' && isFreeUser && (
          <ApiKeyInput
            provider="ElevenLabs"
            apiKeyName="elevenLabsApiKey"
            hasKey={!!apiKeysData?.hasElevenLabsKey}
            maskedKey={apiKeysData?.elevenLabsApiKey}
            onSave={onSaveApiKey}
          />
        )}
        {config.tts.provider === 'openai-tts' && isFreeUser && (
          <ApiKeyInput
            provider="OpenAI"
            apiKeyName="openaiApiKey"
            hasKey={!!apiKeysData?.hasOpenAIKey}
            maskedKey={apiKeysData?.openaiApiKey}
            onSave={onSaveApiKey}
          />
        )}
        {config.tts.provider === 'kie' && isFreeUser && (
          <ApiKeyInput
            provider="KIE.ai"
            apiKeyName="kieApiKey"
            hasKey={!!apiKeysData?.hasKieKey}
            maskedKey={apiKeysData?.kieApiKey}
            onSave={onSaveApiKey}
          />
        )}

        {/* Model info for KIE provider */}
        {config.tts.provider === 'kie' && modelConfig && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 glass rounded-lg">
            <p><strong>Model:</strong> {modelConfig.name}</p>
            <p><strong>Cost:</strong> {modelConfig.credits} credits (${modelConfig.cost.toFixed(2)}) per request</p>
            {modelConfig.description && (
              <p><strong>Description:</strong> {modelConfig.description}</p>
            )}
            {modelConfig.supportedLanguages && (
              <p><strong>Languages:</strong> {modelConfig.supportedLanguages} supported</p>
            )}
          </div>
        )}


        <CompactSelect
          label={`${t('step1.modelConfiguration.voice.defaultLanguage')}${isKieModelSelected ? ' (set by model)' : ''}`}
          value={config.tts.defaultLanguage || 'en'}
          onChange={(value) => updateTTS({ defaultLanguage: value as any })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'sk', label: 'Slovak' },
            { value: 'cs', label: 'Czech' },
            { value: 'de', label: 'German' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'it', label: 'Italian' },
            { value: 'ja', label: 'Japanese' },
            { value: 'ko', label: 'Korean' },
            { value: 'pt', label: 'Portuguese' },
            { value: 'ru', label: 'Russian' },
            { value: 'zh', label: 'Chinese' },
          ]}
          disabled={disabled || isKieModelSelected}
          hint={isKieModelSelected ? "Set by model" : undefined}
        />
      </div>
    </TabsContent>
  );
}