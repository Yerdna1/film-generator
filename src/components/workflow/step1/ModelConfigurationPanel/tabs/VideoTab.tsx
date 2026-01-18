import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import type { TabProps } from '../types';
import type { VideoProvider, UnifiedModelConfig, Resolution } from '@/types/project';
import {
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
  KIE_VIDEO_RESOLUTIONS,
  VIDEO_DURATIONS,
  VIDEO_ASPECT_RATIOS,
  ApiKeyInput,
  ProviderSelect
} from '../../model-config';
import { type VideoDuration, type VideoResolution, type VideoAspectRatio } from '@/lib/constants/kie-models';
import { useVideoModels, type KieVideoModel } from '@/hooks/use-kie-models';

interface VideoTabProps extends TabProps {
  isFreeUser?: boolean;
}

export function VideoTab({ config, apiKeysData, disabled, onUpdateConfig, onSaveApiKey, isFreeUser }: VideoTabProps) {
  const t = useTranslations();
  const { models: videoModels, loading: modelsLoading } = useVideoModels();

  const updateVideo = (updates: Partial<UnifiedModelConfig['video']>) => {
    onUpdateConfig({ video: { ...config.video, ...updates } });
  };

  // Get the selected model configuration
  const selectedModelId = config.video.model || VIDEO_MODELS[config.video.provider as keyof typeof VIDEO_MODELS]?.[0]?.id;
  const modelConfig = videoModels.find(m => m.modelId === selectedModelId);

  // Convert database model to legacy format
  const legacyModelConfig = modelConfig ? {
    id: modelConfig.modelId,
    name: modelConfig.name,
    description: modelConfig.description,
    credits: modelConfig.credits,
    cost: modelConfig.cost,
    videoParameters: {
      supportedResolutions: modelConfig.supportedResolutions,
      supportedDurations: modelConfig.supportedDurations,
      supportedAspectRatios: modelConfig.supportedAspectRatios,
      defaultResolution: modelConfig.defaultResolution,
      defaultDuration: modelConfig.defaultDuration,
      defaultAspectRatio: modelConfig.defaultAspectRatio,
      pricing: modelConfig.pricing,
      resolutionDurationConstraints: modelConfig.resolutionDurationConstraints,
    },
  } : undefined;

  const videoParams = legacyModelConfig?.videoParameters;

  // Get current values with defaults from model config
  // When a model is selected, use its specific parameters (disabled state)
  const currentDuration = (config.video.videoDuration || modelConfig?.length || videoParams?.defaultDuration || '5s') as VideoDuration;
  const currentResolution = (config.video.videoResolution || videoParams?.defaultResolution || '720p') as VideoResolution;
  const currentAspectRatio = (config.video.videoAspectRatio || videoParams?.defaultAspectRatio || '16:9') as VideoAspectRatio;

  // When a model is selected, disable parameter combo boxes since they're baked into the model
  const isModelSpecificParams = !!modelConfig;

  // Calculate dynamic cost based on selected resolution and duration
  const pricingKey = `${currentResolution}-${currentDuration}`;
  const dynamicCredits = videoParams?.pricing?.[pricingKey];
  const dynamicCost = dynamicCredits ? dynamicCredits * 0.005 : modelConfig?.cost;

  // Filter available options based on model constraints
  const availableDurations = videoParams?.supportedDurations || [];
  const availableResolutions = videoParams?.supportedResolutions || [];
  const availableAspectRatios = videoParams?.supportedAspectRatios || [];

  // Get allowed durations for selected resolution (or all durations if no constraints)
  const allowedDurationsForResolution = videoParams?.resolutionDurationConstraints?.[currentResolution] || availableDurations;

  // Check if current duration is valid for selected resolution
  const isCurrentDurationValid = allowedDurationsForResolution.includes(currentDuration);

  // If duration is not valid for resolution, reset to first valid option
  if (!isCurrentDurationValid && allowedDurationsForResolution.length > 0) {
    updateVideo({ videoDuration: allowedDurationsForResolution[0] });
  }

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
            value={selectedModelId}
            onValueChange={(value: string) => {
              // Reset video parameters when model changes
              const newModelConfig = videoModels.find(m => m.modelId === value);
              const newParams = newModelConfig ? {
                supportedResolutions: newModelConfig.supportedResolutions,
                supportedDurations: newModelConfig.supportedDurations,
                supportedAspectRatios: newModelConfig.supportedAspectRatios,
                defaultResolution: newModelConfig.defaultResolution,
                defaultDuration: newModelConfig.defaultDuration,
                defaultAspectRatio: newModelConfig.defaultAspectRatio,
                pricing: newModelConfig.pricing,
              } : undefined;
              updateVideo({
                model: value,
                videoDuration: newParams?.defaultDuration || '5s',
                videoResolution: newParams?.defaultResolution || '720p',
                videoAspectRatio: newParams?.defaultAspectRatio || '16:9',
              });
            }}
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
              {/* Show KIE video models from database */}
              {config.video.provider === 'kie' && videoModels.map((model) => (
                <SelectItem key={model.modelId} value={model.modelId}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Legacy resolution setting (for backward compatibility) */}
        <div>
          <Label>Project Resolution (Export)</Label>
          <Select
            value={config.video.resolution}
            onValueChange={(value) => updateVideo({ resolution: value as Resolution })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hd">HD (720p)</SelectItem>
              <SelectItem value="4k">4K (2160p)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced KIE video parameters - only show for KIE provider with model that has videoParameters */}
        {config.video.provider === 'kie' && videoParams && (
          <div className="space-y-4 pt-2 border-t">
            <div className="text-sm font-medium text-muted-foreground">
              Advanced Video Settings
            </div>

            {/* Duration */}
            {availableDurations.length > 0 && (
              <div>
                <Label>Video Duration {isModelSpecificParams && <span className="text-xs text-muted-foreground">(set by model)</span>}</Label>
                <Select
                  value={currentDuration}
                  onValueChange={(value: VideoDuration) => updateVideo({ videoDuration: value })}
                  disabled={disabled || isModelSpecificParams}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_DURATIONS
                      .filter(d => availableDurations.includes(d.value as VideoDuration))
                      .map((duration) => {
                        const isDisabled = !allowedDurationsForResolution.includes(duration.value as VideoDuration);
                        return (
                          <SelectItem
                            key={duration.value}
                            value={duration.value}
                            disabled={isDisabled}
                          >
                            {duration.label}
                            {isDisabled && ' (unavailable with current resolution)'}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Video Resolution */}
            {availableResolutions.length > 0 && (
              <div>
                <Label>Video Resolution (API) {isModelSpecificParams && <span className="text-xs text-muted-foreground">(set by model)</span>}</Label>
                <Select
                  value={currentResolution}
                  onValueChange={(value: VideoResolution) => {
                    // When resolution changes, check if current duration is still valid
                    const allowedDurations = videoParams.resolutionDurationConstraints?.[value] || availableDurations;
                    const newDuration = allowedDurations.includes(currentDuration)
                      ? currentDuration
                      : (videoParams.defaultDuration || availableDurations[0]);
                    updateVideo({
                      videoResolution: value,
                      videoDuration: newDuration,
                    });
                  }}
                  disabled={disabled || isModelSpecificParams}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIE_VIDEO_RESOLUTIONS
                      .filter(r => availableResolutions.includes(r.value as VideoResolution))
                      .map((resolution) => (
                        <SelectItem key={resolution.value} value={resolution.value}>
                          {resolution.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Aspect Ratio */}
            {availableAspectRatios.length > 0 && (
              <div>
                <Label>Video Aspect Ratio {isModelSpecificParams && <span className="text-xs text-muted-foreground">(set by model)</span>}</Label>
                <Select
                  value={currentAspectRatio}
                  onValueChange={(value: VideoAspectRatio) => updateVideo({ videoAspectRatio: value })}
                  disabled={disabled || isModelSpecificParams}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_ASPECT_RATIOS
                      .filter(ar => availableAspectRatios.includes(ar.value as VideoAspectRatio))
                      .map((aspectRatio) => (
                        <SelectItem key={aspectRatio.value} value={aspectRatio.value}>
                          {aspectRatio.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Model info */}
            {modelConfig && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Model:</strong> {modelConfig.name}</p>
                {dynamicCredits ? (
                  <p><strong>Cost:</strong> {dynamicCredits} credits (${dynamicCost?.toFixed(2) || modelConfig.cost.toFixed(2)}) per video</p>
                ) : (
                  <p><strong>Cost:</strong> {modelConfig.credits} credits (${modelConfig.cost.toFixed(2)}) per video</p>
                )}
                {modelConfig.description && (
                  <p><strong>Description:</strong> {modelConfig.description}</p>
                )}
                {dynamicCredits && (
                  <p className="text-muted-foreground">
                    Based on {currentResolution} resolution, {currentDuration} duration
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </TabsContent>
  );
}
