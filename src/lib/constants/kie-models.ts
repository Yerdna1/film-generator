// KIE.ai Model Configurations
// Credit System: 1 credit = $0.005 USD
//
// NOTE: Models are now fetched from the database. The constants below
// are kept for backward compatibility and type definitions.
// Use the functions from @/lib/db/kie-models instead.

export type VideoDuration = '5s' | '10s' | '15s' | '30s';
export type VideoResolution = '720p' | '1080p' | '4K' | '768P';
export type VideoAspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

export interface VideoModelParameters {
  supportedDurations?: VideoDuration[];
  supportedResolutions?: VideoResolution[];
  supportedAspectRatios?: VideoAspectRatio[];
  resolutionDurationConstraints?: Record<VideoResolution, VideoDuration[]>; // e.g., 1080p: ['5s']
  defaultDuration?: VideoDuration;
  defaultResolution?: VideoResolution;
  defaultAspectRatio?: VideoAspectRatio;
  // Pricing per resolution-duration combination (credits)
  pricing?: Record<string, number>; // e.g., '720p-5s': 40, '720p-10s': 80
}

export interface KieModelConfig {
  id: string;
  name: string;
  description?: string;
  credits: number;  // KIE credits required
  cost: number;     // USD cost ($0.005 × credits)
  modality?: string; // e.g., 'text-to-image', 'image-to-image', 'image-to-video'
  quality?: string;  // e.g., '1k', '2k', '4k', 'standard', 'hd', 'fast', 'quality'
  length?: string;   // e.g., '5s', '10s', '30s' (for video models)
  recommended?: boolean;
  features?: string[];
  limitations?: string[];
  // Video-specific parameters
  videoParameters?: VideoModelParameters;
}

// DEPRECATED: Use getImageModels() from @/lib/db/kie-models instead
// Image Generation Models - migrated to database
export const KIE_IMAGE_MODELS: KieModelConfig[] = [];

// DEPRECATED: Use getVideoModels() from @/lib/db/kie-models instead
// Video Generation Models - migrated to database
export const KIE_VIDEO_MODELS: KieModelConfig[] = [];

// DEPRECATED: Use getTtsModels() from @/lib/db/kie-models instead
// TTS/Audio Models - migrated to database
export const KIE_TTS_MODELS: KieModelConfig[] = [];

// DEPRECATED: Use getMusicModels() from @/lib/db/kie-models instead
// Music Generation Models - migrated to database
export const KIE_MUSIC_MODELS: KieModelConfig[] = [];

// Helper functions
export function getKieModelById(modelId: string, type: 'image' | 'video' | 'tts' | 'music'): KieModelConfig | undefined {
  const models = type === 'image' ? KIE_IMAGE_MODELS :
                 type === 'video' ? KIE_VIDEO_MODELS :
                 type === 'tts' ? KIE_TTS_MODELS :
                 KIE_MUSIC_MODELS;

  return models.find(m => m.id === modelId);
}

export function formatKiePrice(credits: number): string {
  const usd = credits * 0.005;
  return `${credits} credits ($${usd.toFixed(2)})`;
}

export function getKieModelCost(modelId: string, type: 'image' | 'video' | 'tts' | 'music'): number {
  const model = getKieModelById(modelId, type);
  return model?.cost || 0;
}

// Get models by quality or modality
export function getKieModelsByQuality(type: 'image' | 'video', quality: string): KieModelConfig[] {
  const models = type === 'image' ? KIE_IMAGE_MODELS : KIE_VIDEO_MODELS;
  return models.filter(m => m.quality === quality);
}

export function getKieModelsByModality(type: 'image' | 'video', modality: string): KieModelConfig[] {
  const models = type === 'image' ? KIE_IMAGE_MODELS : KIE_VIDEO_MODELS;
  return models.filter(m => m.modality === modality);
}
