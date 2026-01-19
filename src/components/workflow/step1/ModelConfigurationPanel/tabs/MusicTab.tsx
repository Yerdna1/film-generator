import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import type { TabProps } from '../types';
import type { MusicProvider, UnifiedModelConfig } from '@/types/project';
import {
  MUSIC_MODELS,
  ApiKeyInput,
  CompactSelect
} from '../../model-config';
import { useMusicModels, type KieMusicModel } from '@/hooks/use-kie-models';

interface MusicTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function MusicTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: MusicTabProps) {
  const t = useTranslations();
  const { models: musicModels, loading: modelsLoading } = useMusicModels();

  const updateMusic = (updates: Partial<UnifiedModelConfig['music']>) => {
    onUpdateConfig({ music: { ...config.music, ...updates } });
  };

  // Get the selected model configuration
  const selectedModelId = config.music.model || MUSIC_MODELS.kie[0]?.id;
  const modelConfig = musicModels.find(m => m.modelId === selectedModelId);

  // Provider options
  const providerOptions = [
    { value: 'piapi', label: 'PiAPI', badge: undefined },
    { value: 'suno', label: 'Suno', badge: undefined },
    { value: 'kie', label: 'KIE AI', badge: undefined },
    { value: 'modal', label: 'Modal', badge: 'Self-hosted' },
  ];

  // Model options - only use database models to avoid duplicates
  const modelOptions = musicModels.map(model => ({
    value: model.modelId,
    label: model.name,
    badge: `${model.credits} credits`,
  }));

  return (
    <TabsContent value="music" className="space-y-4 pt-4">
      <div className="grid gap-4">
        {/* Provider & Model Selection - Side by side with labels on top */}
        <div className="flex gap-2 items-start">
          <div className="space-y-1 shrink-0">
            <CompactSelect
              label={t('step1.modelConfiguration.music.provider')}
              value={config.music.provider}
              onChange={(value) => updateMusic({ provider: value as MusicProvider })}
              options={providerOptions}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <CompactSelect
              label={t('step1.modelConfiguration.music.model')}
              value={selectedModelId}
              onChange={(value: string) => updateMusic({ model: value })}
              options={modelOptions}
              disabled={disabled}
            />
          </div>
        </div>

        {/* API Key Inputs */}
        {config.music.provider === 'piapi' && isFreeUser && (
          <ApiKeyInput
            provider="PiAPI"
            apiKeyName="piApiKey"
            hasKey={!!apiKeysData?.hasPiApiKey}
            maskedKey={apiKeysData?.piapiApiKey}
            onSave={onSaveApiKey}
          />
        )}
        {config.music.provider === 'suno' && isFreeUser && (
          <ApiKeyInput
            provider="Suno"
            apiKeyName="sunoApiKey"
            hasKey={!!apiKeysData?.hasSunoKey}
            maskedKey={apiKeysData?.sunoApiKey}
            onSave={onSaveApiKey}
          />
        )}
        {config.music.provider === 'kie' && isFreeUser && (
          <ApiKeyInput
            provider="KIE.ai"
            apiKeyName="kieApiKey"
            hasKey={!!apiKeysData?.hasKieKey}
            maskedKey={apiKeysData?.kieApiKey}
            onSave={onSaveApiKey}
          />
        )}

        {/* Model info for KIE provider */}
        {config.music.provider === 'kie' && modelConfig && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 glass rounded-lg">
            <p><strong>Model:</strong> {modelConfig.name}</p>
            <p><strong>Cost:</strong> {modelConfig.credits} credits (${modelConfig.cost.toFixed(2)}) per song</p>
            {modelConfig.description && (
              <p><strong>Description:</strong> {modelConfig.description}</p>
            )}
            {modelConfig.modality && (
              <p><strong>Modality:</strong> {modelConfig.modality.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </TabsContent>
  );
}