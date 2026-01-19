import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TabProps } from '../types';
import type { ImageProvider, UnifiedModelConfig, AspectRatio } from '@/types/project';
import { IMAGE_MODELS, ASPECT_RATIOS, ApiKeyInput, CompactSelect, ModelInfo } from '../../model-config';
import { useImageModels } from '@/hooks/use-kie-models';

interface ImageTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function ImageTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: ImageTabProps) {
  const t = useTranslations();
  const { models: imageModels } = useImageModels();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateImage = (updates: Partial<UnifiedModelConfig['image']>) => {
    onUpdateConfig({ image: { ...config.image, ...updates } });
  };

  // Get the selected model configuration
  const selectedModelId = config.image.model || IMAGE_MODELS[config.image.provider as keyof typeof IMAGE_MODELS]?.[0]?.id;
  const modelConfig = imageModels.find(m => m.modelId === selectedModelId);
  const isKieModelSelected = config.image.provider === 'kie' && !!modelConfig;

  // Provider options
  const providerOptions = [
    { value: 'gemini', label: 'Gemini', badge: 'Free' },
    { value: 'kie', label: 'KIE AI' },
    { value: 'modal', label: 'Modal', badge: 'Self-hosted' },
    { value: 'modal-edit', label: 'Modal Edit' },
  ];

  // Model options
  const modelOptions = [
    ...(IMAGE_MODELS[config.image.provider as keyof typeof IMAGE_MODELS] || []).map(model => ({
      value: model.id,
      label: model.name,
    })),
    ...(config.image.provider === 'kie' ? imageModels.map(model => ({
      value: model.modelId,
      label: model.name,
      badge: `${model.credits} credits`,
    })) : []),
  ];

  // Aspect ratio options
  const aspectRatioOptions = ASPECT_RATIOS.map(ar => ({
    value: ar.value,
    label: ar.label,
  }));

  return (
    <TabsContent value="image" className="space-y-4 pt-4 overflow-hidden">
      <div className="grid gap-4">
        {/* Provider & Model Selection - Side by side with labels on top */}
        <div className="flex gap-2 items-start">
          <div className="space-y-1 shrink-0">
            <CompactSelect
              label={t('step1.modelConfiguration.image.provider')}
              value={config.image.provider}
              onChange={(value) => updateImage({ provider: value as ImageProvider })}
              options={providerOptions}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <CompactSelect
              label={t('step1.modelConfiguration.image.model')}
              value={selectedModelId}
              onChange={(value) => updateImage({ model: value })}
              options={modelOptions}
              disabled={disabled}
            />
          </div>
        </div>

        {/* API Key Input */}
        {config.image.provider === 'kie' && isFreeUser && (
          <ApiKeyInput
            provider="KIE.ai"
            apiKeyName="kieApiKey"
            hasKey={!!apiKeysData?.hasKieKey}
            maskedKey={apiKeysData?.kieApiKey}
            onSave={onSaveApiKey}
          />
        )}

        {/* Model Info */}
        {modelConfig && (
          <ModelInfo
            name={modelConfig.name}
            credits={modelConfig.credits}
            cost={modelConfig.cost}
            description={modelConfig.description}
            details={modelConfig.keyFeatures?.length ? `Features: ${modelConfig.keyFeatures.join(', ')}` : undefined}
          />
        )}

        {/* Advanced Settings */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn(
              "h-3 w-3 mr-1 transition-transform",
              showAdvanced && "rotate-180"
            )} />
            Aspect Ratios
          </Button>

          {showAdvanced && (
            <div className="grid gap-3 mt-3 p-3 bg-muted/20 rounded-lg">
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactSelect
                  label={t('step1.modelConfiguration.image.characterAspectRatio')}
                  value={config.image.characterAspectRatio}
                  onChange={(value) => updateImage({ characterAspectRatio: value as AspectRatio })}
                  options={aspectRatioOptions}
                  disabled={disabled || isKieModelSelected}
                  hint={isKieModelSelected ? "Set by model" : undefined}
                />

                <CompactSelect
                  label={t('step1.modelConfiguration.image.sceneAspectRatio')}
                  value={config.image.sceneAspectRatio}
                  onChange={(value) => updateImage({ sceneAspectRatio: value as AspectRatio })}
                  options={aspectRatioOptions}
                  disabled={disabled || isKieModelSelected}
                  hint={isKieModelSelected ? "Set by model" : undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}