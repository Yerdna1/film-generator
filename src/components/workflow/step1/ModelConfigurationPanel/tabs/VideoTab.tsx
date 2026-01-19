import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
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
      }));

  // Export resolution options
  const exportResolutionOptions = [
    { value: 'hd', label: 'HD (720p)' },
    { value: '4k', label: '4K (2160p)' },
  ];

  return (
    <TabsContent value="video" className="space-y-4 pt-4 overflow-hidden">
      <div className="grid gap-4">
        {/* Provider & Model Selection */}
        <div className="grid gap-4 grid-cols-[1fr,3fr]">
          <CompactSelect
            label={t('step1.modelConfiguration.video.provider')}
            value={config.video.provider}
            onChange={(value) => updateVideo({ provider: value as VideoProvider })}
            options={providerOptions}
            disabled={disabled}
          />

          <CompactSelect
            label={t('step1.modelConfiguration.video.model')}
            value={selectedModelId}
            onChange={(value) => {
              const newModel = videoModels.find(m => m.modelId === value);
              updateVideo({
                model: value,
                videoDuration: newModel?.defaultDuration || '5s',
                videoResolution: newModel?.defaultResolution || '720p',
                videoAspectRatio: newModel?.defaultAspectRatio || '16:9',
              });
            }}
            options={modelOptions}
            disabled={disabled}
          />
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

        {/* Export Resolution */}
        <CompactSelect
          label="Export Resolution"
          value={config.video.resolution}
          onChange={(value) => updateVideo({ resolution: value as Resolution })}
          options={exportResolutionOptions}
          disabled={disabled}
          hint="Final render quality"
        />

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

        {/* Advanced Settings */}
        {config.video.provider === 'kie' && modelConfig && (
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
              Advanced Settings
            </Button>

            {showAdvanced && (
              <div className="grid gap-3 mt-3 p-3 bg-muted/20 rounded-lg">
                {/* Duration */}
                {modelConfig.supportedDurations?.length > 0 && (
                  <CompactSelect
                    label="Duration"
                    value={currentDuration}
                    onChange={(value) => updateVideo({ videoDuration: value as VideoDuration })}
                    options={VIDEO_DURATIONS
                      .filter(d => modelConfig.supportedDurations?.includes(d.value as VideoDuration))
                      .map(d => ({
                        value: d.value,
                        label: d.label,
                      }))}
                    disabled={disabled || !!modelConfig.length}
                    hint={modelConfig.length ? "Set by model" : undefined}
                  />
                )}

                {/* Resolution Grid */}
                {modelConfig.supportedResolutions?.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CompactSelect
                      label="Video Resolution"
                      value={currentResolution}
                      onChange={(value) => {
                        const allowedDurations = modelConfig.resolutionDurationConstraints?.[value as VideoResolution];
                        const newDuration = allowedDurations?.includes(currentDuration)
                          ? currentDuration
                          : (modelConfig.defaultDuration || '5s');
                        updateVideo({
                          videoResolution: value as VideoResolution,
                          videoDuration: newDuration as VideoDuration,
                        });
                      }}
                      options={KIE_VIDEO_RESOLUTIONS
                        .filter(r => modelConfig.supportedResolutions?.includes(r.value as VideoResolution))
                        .map(r => ({
                          value: r.value,
                          label: r.label,
                        }))}
                      disabled={disabled}
                    />

                    <CompactSelect
                      label="Aspect Ratio"
                      value={currentAspectRatio}
                      onChange={(value) => updateVideo({ videoAspectRatio: value as VideoAspectRatio })}
                      options={VIDEO_ASPECT_RATIOS
                        .filter(ar => modelConfig.supportedAspectRatios?.includes(ar.value as VideoAspectRatio))
                        .map(ar => ({
                          value: ar.value,
                          label: ar.label,
                        }))}
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </TabsContent>
  );
}
