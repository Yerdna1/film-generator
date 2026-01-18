import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import type { TabProps } from '../types';
import type { ImageProvider, UnifiedModelConfig, AspectRatio } from '@/types/project';
import {
  IMAGE_MODELS,
  ASPECT_RATIOS,
  ApiKeyInput,
  ProviderSelect
} from '../../model-config';
import { useImageModels, type KieImageModel } from '@/hooks/use-kie-models';

interface ImageTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function ImageTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: ImageTabProps) {
  const t = useTranslations();
  const { models: imageModels, loading: modelsLoading } = useImageModels();

  const updateImage = (updates: Partial<UnifiedModelConfig['image']>) => {
    onUpdateConfig({ image: { ...config.image, ...updates } });
  };

  // Get the selected model configuration
  const selectedModelId = config.image.model || IMAGE_MODELS[config.image.provider as keyof typeof IMAGE_MODELS]?.[0]?.id;
  const modelConfig = imageModels.find(m => m.modelId === selectedModelId);

  // When a KIE model is selected, aspect ratio combo boxes should be disabled
  // since the model has specific supported aspect ratios
  const isKieModelSelected = config.image.provider === 'kie' && !!modelConfig;

  return (
    <TabsContent value="image" className="space-y-4 pt-4">
      <div className="grid gap-4">
        <ProviderSelect
          label={t('step1.modelConfiguration.image.provider')}
          value={config.image.provider}
          onChange={(value) => updateImage({ provider: value as ImageProvider })}
          disabled={disabled}
          isFreeUser={isFreeUser}
        >
          <SelectItem value="gemini">Gemini (Free)</SelectItem>
          <SelectItem value="kie">KIE AI</SelectItem>
          <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
          <SelectItem value="modal-edit">Modal Edit</SelectItem>
        </ProviderSelect>

        {config.image.provider === 'kie' && !isFreeUser && (
          <ApiKeyInput
            provider="KIE.ai"
            apiKeyName="kieApiKey"
            hasKey={!!apiKeysData?.hasKieKey}
            onSave={onSaveApiKey}
          />
        )}

        <div>
          <Label>{t('step1.modelConfiguration.image.model')}</Label>
          <Select
            value={selectedModelId}
            onValueChange={(value: string) => updateImage({ model: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_MODELS[config.image.provider as keyof typeof IMAGE_MODELS]?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
              {/* Show KIE image models from database */}
              {config.image.provider === 'kie' && imageModels.map((model) => (
                <SelectItem key={model.modelId} value={model.modelId}>
                  {model.name} ({model.credits} credits)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model info for KIE provider */}
        {config.image.provider === 'kie' && modelConfig && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 glass rounded-lg">
            <p><strong>Model:</strong> {modelConfig.name}</p>
            <p><strong>Cost:</strong> {modelConfig.credits} credits (${modelConfig.cost.toFixed(2)}) per image</p>
            {modelConfig.description && (
              <p><strong>Description:</strong> {modelConfig.description}</p>
            )}
            {modelConfig.keyFeatures && modelConfig.keyFeatures.length > 0 && (
              <p><strong>Features:</strong> {modelConfig.keyFeatures.join(', ')}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('step1.modelConfiguration.image.characterAspectRatio')} {isKieModelSelected && <span className="text-xs text-muted-foreground">(set by model)</span>}</Label>
            <Select
              value={config.image.characterAspectRatio}
              onValueChange={(value) => updateImage({ characterAspectRatio: value as AspectRatio })}
              disabled={disabled || isKieModelSelected}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t('step1.modelConfiguration.image.sceneAspectRatio')} {isKieModelSelected && <span className="text-xs text-muted-foreground">(set by model)</span>}</Label>
            <Select
              value={config.image.sceneAspectRatio}
              onValueChange={(value) => updateImage({ sceneAspectRatio: value as AspectRatio })}
              disabled={disabled || isKieModelSelected}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}