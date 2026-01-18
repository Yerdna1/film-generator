import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { TabProps } from '../types';
import type { TTSProvider, UnifiedModelConfig } from '@/types/project';
import {
  TTS_MODELS,
  ApiKeyInput,
  ProviderSelect
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

  const getProviderBadge = (provider: string, hasKey: boolean) => {
    if (!hasKey && provider !== 'gemini' && provider !== 'gemini-tts') {
      return <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-200 bg-amber-50">Key Needed</Badge>;
    }
    return null;
  };

  return (
    <TabsContent value="voice" className="space-y-4 pt-4">
      <div className="grid gap-4">
        <ProviderSelect
          label={t('step1.modelConfiguration.voice.provider')}
          value={config.tts.provider}
          onChange={(value) => updateTTS({ provider: value as TTSProvider })}
          disabled={disabled}
          isFreeUser={isFreeUser}
        >
          <SelectItem value="gemini-tts">Gemini TTS (Free)</SelectItem>
          <SelectItem value="elevenlabs">
            ElevenLabs
            {getProviderBadge('elevenlabs', !!apiKeysData?.hasElevenLabsKey)}
          </SelectItem>
          <SelectItem value="openai-tts">OpenAI TTS</SelectItem>
          <SelectItem value="kie">
            KIE AI
            {getProviderBadge('kie', !!apiKeysData?.hasKieKey)}
          </SelectItem>
          <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
        </ProviderSelect>

        {config.tts.provider === 'elevenlabs' && (
          <ApiKeyInput
            provider="ElevenLabs"
            apiKeyName="elevenLabsApiKey"
            hasKey={!!apiKeysData?.hasElevenLabsKey}
            onSave={onSaveApiKey}
          />
        )}
        {config.tts.provider === 'openai-tts' && (
          <ApiKeyInput
            provider="OpenAI"
            apiKeyName="openaiApiKey"
            hasKey={!!apiKeysData?.hasOpenAIKey}
            onSave={onSaveApiKey}
          />
        )}
        {config.tts.provider === 'kie' && !isFreeUser && (
          <ApiKeyInput
            provider="KIE.ai"
            apiKeyName="kieApiKey"
            hasKey={!!apiKeysData?.hasKieKey}
            onSave={onSaveApiKey}
          />
        )}

        <div>
          <Label>{t('step1.modelConfiguration.voice.model')}</Label>
          <Select
            value={selectedModelId}
            onValueChange={(value: string) => updateTTS({ model: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TTS_MODELS[config.tts.provider as keyof typeof TTS_MODELS]?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
              {/* Show KIE TTS models from database */}
              {config.tts.provider === 'kie' && ttsModels.map((model) => (
                <SelectItem key={model.modelId} value={model.modelId}>
                  {model.name} ({model.credits} credits)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        <div>
          <Label>{t('step1.modelConfiguration.voice.defaultLanguage')} {isKieModelSelected && <span className="text-xs text-muted-foreground">(set by model)</span>}</Label>
          <Select
            value={config.tts.defaultLanguage}
            onValueChange={(value) => updateTTS({ defaultLanguage: value as any })}
            disabled={disabled || isKieModelSelected}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="sk">Slovak</SelectItem>
              <SelectItem value="cs">Czech</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="ko">Korean</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="ru">Russian</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </TabsContent>
  );
}