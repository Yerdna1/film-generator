import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import type { TabProps } from '../types';
import type { VideoProvider, UnifiedModelConfig, Resolution } from '@/types/project';
import {
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
  ApiKeyInput,
  ProviderSelect
} from '../../model-config';

interface VideoTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function VideoTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: VideoTabProps) {
  const t = useTranslations();

  const updateVideo = (updates: Partial<UnifiedModelConfig['video']>) => {
    onUpdateConfig({ video: { ...config.video, ...updates } });
  };

  return (
    <TabsContent value="video" className="space-y-4 pt-4">
      <div className="grid gap-4">
        <ProviderSelect
          label={t('step1.modelConfiguration.video.provider')}
          value={config.video.provider}
          onChange={(value) => updateVideo({ provider: value as VideoProvider })}
          disabled={disabled}
          isFreeUser={isFreeUser}
        >
          <SelectItem value="kie">KIE AI</SelectItem>
          <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
        </ProviderSelect>

        {config.video.provider === 'kie' && !isFreeUser && (
          <ApiKeyInput
            provider="KIE.ai"
            apiKeyName="kieApiKey"
            hasKey={!!apiKeysData?.hasKieKey}
            onSave={onSaveApiKey}
          />
        )}

        <div>
          <Label>{t('step1.modelConfiguration.video.model')}</Label>
          <Select
            value={config.video.model || VIDEO_MODELS[config.video.provider as keyof typeof VIDEO_MODELS]?.[0]?.id}
            onValueChange={(value: string) => updateVideo({ model: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_MODELS[config.video.provider as keyof typeof VIDEO_MODELS]?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t('step1.modelConfiguration.video.resolution')}</Label>
          <Select
            value={config.video.resolution}
            onValueChange={(value) => updateVideo({ resolution: value as Resolution })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_RESOLUTIONS.map((res) => (
                <SelectItem key={res.value} value={res.value}>
                  {res.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </TabsContent>
  );
}