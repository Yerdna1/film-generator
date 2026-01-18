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

interface ImageTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function ImageTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: ImageTabProps) {
  const t = useTranslations();

  const updateImage = (updates: Partial<UnifiedModelConfig['image']>) => {
    onUpdateConfig({ image: { ...config.image, ...updates } });
  };

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
            value={config.image.model || IMAGE_MODELS[config.image.provider as keyof typeof IMAGE_MODELS]?.[0]?.id}
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
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('step1.modelConfiguration.image.characterAspectRatio')}</Label>
            <Select
              value={config.image.characterAspectRatio}
              onValueChange={(value) => updateImage({ characterAspectRatio: value as AspectRatio })}
              disabled={disabled}
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
            <Label>{t('step1.modelConfiguration.image.sceneAspectRatio')}</Label>
            <Select
              value={config.image.sceneAspectRatio}
              onValueChange={(value) => updateImage({ sceneAspectRatio: value as AspectRatio })}
              disabled={disabled}
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