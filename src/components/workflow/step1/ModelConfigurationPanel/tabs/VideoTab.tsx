import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TabProps } from '../types';
import type { VideoProvider, UnifiedModelConfig, Resolution } from '@/types/project';
import { VIDEO_MODELS, VIDEO_RESOLUTIONS, KIE_VIDEO_RESOLUTIONS, VIDEO_DURATIONS, VIDEO_ASPECT_RATIOS, ApiKeyInput } from '../../model-config';
import { CompactSelect } from '../../model-config/CompactSelect';
import { ModelInfo } from '../../model-config/ModelInfo';
import { type VideoDuration, type VideoResolution, type VideoAspectRatio } from '@/lib/constants/kie-models';
import { useVideoModels } from '@/hooks/use-kie-models';

interface VideoTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function VideoTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: VideoTabProps) {
  const t = useTranslations();
  const { models: videoModels } = useVideoModels();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateVideo = (updates: Partial<UnifiedModelConfig['video']>) => {
    onUpdateConfig({ video: { ...config.video, ...updates } });
  };

  // Get the selected model configuration
  const selectedModelId = config.video.model || VIDEO_MODELS[config.video.provider as keyof typeof VIDEO_MODELS]?.[0]?.id;
  const modelConfig = videoModels.find(m => m.modelId === selectedModelId);

  // Get current values with defaults
  const currentDuration = (config.video.videoDuration || modelConfig?.length || '5s') as VideoDuration;
  const currentResolution = (config.video.videoResolution || modelConfig?.defaultResolution || '720p') as VideoResolution;
  const currentAspectRatio = (config.video.videoAspectRatio || modelConfig?.defaultAspectRatio || '16:9') as VideoAspectRatio;

  // Calculate dynamic cost
  const pricingKey = `${currentResolution}-${currentDuration}`;
  const dynamicCredits = modelConfig?.pricing?.[pricingKey];
  const dynamicCost = dynamicCredits ? dynamicCredits * 0.005 : modelConfig?.cost;

  // Provider options
  const providerOptions = [
    { value: 'kie', label: 'KIE AI' },
    { value: 'modal', label: 'Modal', badge: 'Self-hosted' },
  ];

  // Model options - use database models for KIE, static models for others
  const modelOptions = config.video.provider === 'kie'
    ? videoModels.map(model => ({
      value: model.modelId,
      label: model.name,
      badge: `${model.credits} credits`,
    }))
    : (VIDEO_MODELS[config.video.provider as keyof typeof VIDEO_MODELS] || []).map(model => ({
      value: model.id,
      label: model.name,
      badge: undefined as string | undefined,
    }));

  // Export resolution options
  const exportResolutionOptions = [
    { value: 'hd', label: 'HD (720p)' },
    { value: '4k', label: '4K (2160p)' },
  ];

  return (
    <TabsContent value="video" className="space-y-4 pt-4 overflow-hidden">
      <div className="grid gap-4">
        {/* Provider & Model Selection - Side by side with labels on top */}
        <div className="flex gap-2 items-start">
          <div className="space-y-1 shrink-0">
            <Label className="text-xs font-medium">{t('step1.modelConfiguration.video.provider')}</Label>
            <Select value={config.video.provider} onValueChange={(value) => updateVideo({ provider: value as VideoProvider })} disabled={disabled}>
              <SelectTrigger className="h-8 text-sm w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      {option.badge && <Badge variant="outline" className="text-[10px] py-0 px-1 h-4">{option.badge}</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <Label className="text-xs font-medium">{t('step1.modelConfiguration.video.model')}</Label>
            <Select
              value={selectedModelId}
              onValueChange={(value) => {
                const newModel = videoModels.find(m => m.modelId === value);
                updateVideo({
                  model: value,
                  videoDuration: newModel?.defaultDuration || '5s',
                  videoResolution: newModel?.defaultResolution || '720p',
                  videoAspectRatio: newModel?.defaultAspectRatio || '16:9',
                });
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <SelectValue className="truncate" placeholder="Select model" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-[400px] max-w-[400px]">
                {modelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="max-w-full">
                    <div className="flex items-center gap-2 max-w-full overflow-hidden">
                      <span className="truncate flex-1">{option.label}</span>
                      {option.badge && <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 shrink-0">{option.badge}</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* API Key Input */}
        {config.video.provider === 'kie' && isFreeUser && (
          <ApiKeyInput
            provider="KIE.ai"
            apiKeyName="kieApiKey"
            hasKey={!!apiKeysData?.hasKieKey}
            onSave={onSaveApiKey}
          />
        )}

        {/* Model Info */}
        {modelConfig && (
          <ModelInfo
            name={modelConfig.name}
            credits={dynamicCredits || modelConfig.credits}
            cost={dynamicCost || modelConfig.cost}
            description={modelConfig.description}
            details={dynamicCredits ? `Based on ${currentResolution}, ${currentDuration}` : undefined}
          />
        )}

      </div>
    </TabsContent>
  );
}
