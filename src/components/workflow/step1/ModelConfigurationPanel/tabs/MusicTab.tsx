import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { TabProps } from '../types';
import type { MusicProvider, UnifiedModelConfig } from '@/types/project';
import {
  MUSIC_MODELS,
  ApiKeyInput,
  ProviderSelect
} from '../../model-config';

interface MusicTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function MusicTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: MusicTabProps) {
  const t = useTranslations();

  const updateMusic = (updates: Partial<UnifiedModelConfig['music']>) => {
    onUpdateConfig({ music: { ...config.music, ...updates } });
  };

  const getProviderBadge = (provider: string, hasKey: boolean) => {
    if (!hasKey && provider !== 'gemini' && provider !== 'gemini-tts') {
      return <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-200 bg-amber-50">Key Needed</Badge>;
    }
    return null;
  };

  return (
    <TabsContent value="music" className="space-y-4 pt-4">
      <div className="grid gap-4">
        <ProviderSelect
          label={t('step1.modelConfiguration.music.provider')}
          value={config.music.provider}
          onChange={(value) => updateMusic({ provider: value as MusicProvider })}
          disabled={disabled}
          isFreeUser={isFreeUser}
        >
          <SelectItem value="piapi">
            PiAPI
            {getProviderBadge('piapi', !!apiKeysData?.hasPiApiKey)}
          </SelectItem>
          <SelectItem value="suno">
            Suno
            {getProviderBadge('suno', !!apiKeysData?.hasSunoKey)}
          </SelectItem>
          <SelectItem value="kie">
            KIE AI
            {getProviderBadge('kie', !!apiKeysData?.hasKieKey)}
          </SelectItem>
          <SelectItem value="modal">Modal (Self-hosted)</SelectItem>
        </ProviderSelect>

        {config.music.provider === 'piapi' && (
          <ApiKeyInput
            provider="PiAPI"
            apiKeyName="piApiKey"
            hasKey={!!apiKeysData?.hasPiApiKey}
            onSave={onSaveApiKey}
          />
        )}
        {config.music.provider === 'suno' && (
          <ApiKeyInput
            provider="Suno"
            apiKeyName="sunoApiKey"
            hasKey={!!apiKeysData?.hasSunoKey}
            onSave={onSaveApiKey}
          />
        )}
        {config.music.provider === 'kie' && !isFreeUser && (
          <ApiKeyInput
            provider="KIE.ai"
            apiKeyName="kieApiKey"
            hasKey={!!apiKeysData?.hasKieKey}
            onSave={onSaveApiKey}
          />
        )}

        {config.music.provider === 'kie' && (
          <div>
            <Label>{t('step1.modelConfiguration.music.model')}</Label>
            <Select
              value={config.music.model || MUSIC_MODELS.kie[0].id}
              onValueChange={(value: string) => updateMusic({ model: value })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MUSIC_MODELS.kie.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </TabsContent>
  );
}