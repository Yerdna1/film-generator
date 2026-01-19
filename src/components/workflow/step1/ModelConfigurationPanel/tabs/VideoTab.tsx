import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

  // Filter states
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');

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

  // Modality color mapping
  const modalityColors: Record<string, { bg: string; text: string; border: string }> = {
    'text-to-video': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'image-to-video': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'video-to-video': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  };

  // Extract unique filter values from models
  const availableModalities = ['all', ...Array.from(new Set(videoModels.flatMap(m => m.modality || [])))];
  const availableQualities = ['all', ...Array.from(new Set(videoModels.map(m => m.quality).filter(Boolean)))];
  const availableDurations = ['all', ...Array.from(new Set(videoModels.flatMap(m => m.supportedDurations || [])))];
  const availableProviders = ['all', ...Array.from(new Set(videoModels.map(m => m.provider).filter(Boolean)))];
  const priceOptions = [
    { value: 'all', label: 'All' },
    { value: 'cheap', label: '<= 20 credits' },
    { value: 'moderate', label: '21-40 credits' },
    { value: 'premium', label: '41-100 credits' },
    { value: 'expensive', label: '> 100 credits' },
  ];

  // Apply filters
  const filteredModels = config.video.provider === 'kie'
    ? videoModels.filter(model => {
      const modalityMatch = modalityFilter === 'all' || model.modality?.includes(modalityFilter);
      const qualityMatch = qualityFilter === 'all' || model.quality === qualityFilter;
      const durationMatch = durationFilter === 'all' || model.supportedDurations?.includes(durationFilter);
      const providerMatch = providerFilter === 'all' || model.provider === providerFilter;

      let priceMatch = true;
      if (priceFilter === 'cheap') priceMatch = model.credits <= 20;
      else if (priceFilter === 'moderate') priceMatch = model.credits > 20 && model.credits <= 40;
      else if (priceFilter === 'premium') priceMatch = model.credits > 40 && model.credits <= 100;
      else if (priceFilter === 'expensive') priceMatch = model.credits > 100;

      return modalityMatch && qualityMatch && durationMatch && providerMatch && priceMatch;
    })
    : videoModels;

  // Group filtered models by modality
  const groupedModels = config.video.provider === 'kie'
    ? filteredModels.reduce((acc, model) => {
      const modality = model.modality?.[0] || 'other';
      if (!acc[modality]) {
        acc[modality] = [];
      }
      acc[modality].push({
        value: model.modelId,
        label: model.name,
        badge: `${model.credits} credits`,
        modality,
      });
      return acc;
    }, {} as Record<string, Array<{ value: string; label: string; badge: string; modality: string }>>)
    : {};

  // Flat model options for non-KIE providers
  const flatModelOptions = config.video.provider !== 'kie'
    ? (VIDEO_MODELS[config.video.provider as keyof typeof VIDEO_MODELS] || []).map(model => ({
      value: model.id,
      label: model.name,
      badge: undefined as string | undefined,
      modality: undefined,
    }))
    : [];

  // Export resolution options
  const exportResolutionOptions = [
    { value: 'hd', label: 'HD (720p)' },
    { value: '4k', label: '4K (2160p)' },
  ];

  // Helper to get modality display name
  const getModalityLabel = (modality: string) => {
    const labels: Record<string, string> = {
      'text-to-video': 'Text to Video',
      'image-to-video': 'Image to Video',
      'video-to-video': 'Video to Video',
    };
    return labels[modality] || modality;
  };

  return (
    <TabsContent value="video" className="space-y-4 pt-4 overflow-hidden">
      <div className="grid gap-4">
        {/* Filters - Only for KIE provider */}
        {config.video.provider === 'kie' && (
          <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border/50">
            {/* Modality Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Modality</Label>
              <div className="flex flex-wrap gap-2">
                {availableModalities.map((modality) => (
                  <button
                    key={modality}
                    onClick={() => setModalityFilter(modality)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] rounded-full border transition-all duration-200",
                      modalityFilter === modality
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/50"
                    )}
                  >
                    {modality === 'all' ? 'All' : getModalityLabel(modality)}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider and Price Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Provider</Label>
                <div className="flex flex-wrap gap-2">
                  {availableProviders.map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setProviderFilter(provider)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] rounded-full border transition-all duration-200",
                        providerFilter === provider
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/50"
                      )}
                    >
                      {provider === 'all' ? 'All' : provider}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Price</Label>
                <div className="flex flex-wrap gap-2">
                  {priceOptions.map((price) => (
                    <button
                      key={price.value}
                      onClick={() => setPriceFilter(price.value)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] rounded-full border transition-all duration-200",
                        priceFilter === price.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/50"
                      )}
                    >
                      {price.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quality Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Quality</Label>
                <div className="flex flex-wrap gap-2">
                  {availableQualities.map((quality) => (
                    <button
                      key={quality as string}
                      onClick={() => setQualityFilter(quality as string)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] rounded-full border transition-all duration-200",
                        qualityFilter === quality
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/50"
                      )}
                    >
                      {quality === 'all' ? 'All' : quality}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {availableDurations.map((duration) => (
                    <button
                      key={duration}
                      onClick={() => setDurationFilter(duration)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] rounded-full border transition-all duration-200",
                        durationFilter === duration
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/50"
                      )}
                    >
                      {duration === 'all' ? 'All' : duration}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
              <SelectContent className="max-h-[400px] max-w-[450px]">
                {config.video.provider === 'kie' ? (
                  // Grouped by modality for KIE
                  Object.entries(groupedModels).map(([modality, models]) => {
                    const colors = modalityColors[modality] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
                    return (
                      <div key={modality} className="mb-2 last:mb-0">
                        <div className={`px-2 py-1.5 text-xs font-semibold ${colors.bg} ${colors.text} border-b ${colors.border} sticky top-0 z-10`}>
                          {getModalityLabel(modality)}
                        </div>
                        {models.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="max-w-full pl-4">
                            <div className="flex items-center gap-2 max-w-full overflow-hidden">
                              <span className="truncate flex-1">{option.label}</span>
                              {option.badge && <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 shrink-0">{option.badge}</Badge>}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })
                ) : (
                  // Flat list for other providers
                  flatModelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="max-w-full">
                      <div className="flex items-center gap-2 max-w-full overflow-hidden">
                        <span className="truncate flex-1">{option.label}</span>
                        {option.badge && <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 shrink-0">{option.badge}</Badge>}
                      </div>
                    </SelectItem>
                  ))
                )}
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
            maskedKey={apiKeysData?.kieApiKey}
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
