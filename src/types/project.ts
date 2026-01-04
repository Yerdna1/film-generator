// Style presets for film generation
export type StylePreset = 'disney-pixar' | 'realistic' | 'anime' | 'custom';

export type CameraShot = 'medium' | 'close-up' | 'wide' | 'extreme-close-up' | 'over-shoulder' | 'pov' | 'aerial' | 'low-angle' | 'high-angle';

export type AspectRatio = '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4';

export type Resolution = 'hd' | '4k';

// Scene transition types
export type TransitionType =
  | 'none'
  | 'fade'
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'zoomIn'
  | 'zoomOut'
  | 'swoosh';

export interface SceneTransition {
  type: TransitionType;
  duration: number; // milliseconds (default: 500)
}

// Caption styling
export interface CaptionStyle {
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'default' | 'serif' | 'mono';
  color: string; // hex color
  backgroundColor: string; // hex with alpha
  position: 'top' | 'center' | 'bottom';
  textShadow: boolean;
}

// Caption with timing and animation
export interface Caption {
  id: string;
  text: string;
  startTime: number; // seconds from scene start
  endTime: number;
  style: CaptionStyle;
  animation: 'none' | 'fadeIn' | 'slideUp' | 'typewriter' | 'popIn';
}

// Background music
export interface BackgroundMusic {
  id: string;
  title: string;
  audioUrl: string; // Base64 data URL or blob URL
  duration: number; // seconds
  volume: number; // 0-1
  source: 'upload' | 'suno' | 'url';
  sunoPrompt?: string; // If generated via Suno
  startOffset?: number; // seconds from start to trim (for timeline positioning)
  endOffset?: number; // seconds from end to trim
}

// Image resolution for Gemini 3 Pro Image pricing
export type ImageResolution = '1k' | '2k' | '4k';

export type VoiceLanguage = 'sk' | 'en';

export type VoiceProvider = 'gemini-tts' | 'elevenlabs' | 'modal';

// Project settings
export interface ProjectSettings {
  sceneCount: 12 | 24 | 36 | 48 | 60 | 120 | 240 | 360;
  characterCount: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  imageResolution: ImageResolution; // For Gemini 3 Pro Image pricing (1K/2K=$0.134, 4K=$0.24)
  voiceLanguage: VoiceLanguage;
  voiceProvider: VoiceProvider;
}

// Story configuration
export interface StoryConfig {
  title: string;
  concept: string;
  genre: string;
  tone: string;
  setting: string;
}

// Audio version for a specific provider + language combination
export interface AudioVersion {
  audioUrl: string;
  provider: 'gemini-tts' | 'elevenlabs' | 'modal';
  language: VoiceLanguage;
  voiceId?: string;
  voiceName?: string;
  duration?: number;
  createdAt: string;
}

// Dialogue line with optional audio (supports multiple versions)
export interface DialogueLine {
  id: string;
  characterId: string;
  characterName: string;
  text: string;
  // Primary audio (for backwards compatibility and current selection)
  audioUrl?: string;
  audioDuration?: number;
  ttsProvider?: 'elevenlabs' | 'gemini-tts' | 'modal';
  // All generated audio versions (provider + language combinations)
  audioVersions?: AudioVersion[];
}

// Character definition
export interface Character {
  id: string;
  name: string;
  description: string;
  visualDescription: string;
  personality: string;
  masterPrompt: string;
  imageUrl?: string;
  voiceId?: string;
  voiceName?: string;
}

// Scene definition
export interface Scene {
  id: string;
  number: number;
  title: string;
  description: string;
  textToImagePrompt: string;
  imageToVideoPrompt: string;
  dialogue: DialogueLine[];
  cameraShot: CameraShot;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  duration: number; // in seconds
  transition?: SceneTransition; // Transition effect to next scene
  captions?: Caption[]; // Subtitles/captions for this scene
  // Scene locking and image-video sync tracking
  locked?: boolean;
  imageUpdatedAt?: string; // ISO string
  videoGeneratedFromImageAt?: string; // ISO string
  // TTS audio preference - when true, use generated TTS voices in video composition
  useTtsInVideo?: boolean;
}

// Voice settings per character
export interface VoiceSettings {
  language: VoiceLanguage;
  provider: VoiceProvider;
  characterVoices: Record<string, {
    voiceId: string;
    voiceName: string;
  }>;
}

// Complete project
export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  style: StylePreset;
  settings: ProjectSettings;
  story: StoryConfig;
  characters: Character[];
  scenes: Scene[];
  voiceSettings: VoiceSettings;
  currentStep: number;
  masterPrompt?: string;
  isComplete: boolean;
  backgroundMusic?: BackgroundMusic; // Background music track
  musicVolume?: number; // 0-1, default 0.3
  // Rendered video export
  renderedVideoUrl?: string;
  renderedDraftUrl?: string;
}

// LLM Provider selection - OpenRouter is default (works everywhere including Vercel)
export type LLMProvider = 'openrouter' | 'claude-sdk' | 'modal';

// Music Provider selection - PiAPI is default (unified API for Suno/Udio)
export type MusicProvider = 'piapi' | 'suno' | 'modal';

// TTS Provider selection for voiceover generation
export type TTSProvider = 'gemini-tts' | 'elevenlabs' | 'modal';

// Image Provider selection for image generation
export type ImageProvider = 'gemini' | 'modal' | 'modal-edit';

// Video Provider selection for video generation
export type VideoProvider = 'kie' | 'modal';

// Modal.com endpoint configuration for self-hosted models
export interface ModalEndpoints {
  llmEndpoint?: string;      // e.g., https://your-app--llm.modal.run
  ttsEndpoint?: string;      // e.g., https://your-app--tts.modal.run
  imageEndpoint?: string;    // e.g., https://your-app--image.modal.run
  imageEditEndpoint?: string; // e.g., https://your-app--image-edit.modal.run (Qwen-Image-Edit)
  videoEndpoint?: string;    // e.g., https://your-app--video.modal.run
  musicEndpoint?: string;    // e.g., https://your-app--ace-step.modal.run (ACE-Step)
  vectcutEndpoint?: string;  // e.g., https://your-app--vectcut.modal.run (Video Composition)
}

// API configuration
export interface ApiConfig {
  geminiApiKey?: string;
  grokApiKey?: string;
  kieApiKey?: string;  // Kie.ai API key for Grok Imagine
  elevenLabsApiKey?: string;
  claudeApiKey?: string;
  openRouterApiKey?: string;  // OpenRouter API key for LLM access
  openRouterModel?: string;  // OpenRouter model ID (e.g., 'anthropic/claude-sonnet-4')
  piapiApiKey?: string;  // PiAPI key for music generation
  sunoApiKey?: string;  // Suno API key (alternative)
  llmProvider?: LLMProvider;  // Default: 'openrouter'
  musicProvider?: MusicProvider;  // Default: 'piapi'
  ttsProvider?: TTSProvider;  // Default: 'gemini-tts'
  imageProvider?: ImageProvider;  // Default: 'gemini'
  videoProvider?: VideoProvider;  // Default: 'kie'
  // Modal.com self-hosted endpoints
  modalEndpoints?: ModalEndpoints;
}

// User type
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  apiConfig?: ApiConfig;
  createdAt: string;
}

// Export formats
export type ExportFormat = 'json' | 'markdown' | 'text' | 'zip';

export interface ExportOptions {
  format: ExportFormat;
  includeImages: boolean;
  includeVideos: boolean;
  includeAudio: boolean;
  includePrompts: boolean;
}

// Step definition for workflow
export interface WorkflowStep {
  id: number;
  key: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  isComplete: boolean;
  isActive: boolean;
}

// Style preset configuration
export interface StylePresetConfig {
  id: StylePreset;
  nameKey: string;
  descriptionKey: string;
  promptPrefix: string;
  promptSuffix: string;
  defaultCharacterStyle: string;
  defaultSceneStyle: string;
}

// Generation status
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

export interface GenerationState {
  status: GenerationStatus;
  progress: number;
  message?: string;
  error?: string;
}
