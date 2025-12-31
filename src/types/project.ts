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
}

// Image resolution for Gemini 3 Pro Image pricing
export type ImageResolution = '1k' | '2k' | '4k';

export type VoiceLanguage = 'sk' | 'en';

export type VoiceProvider = 'gemini-tts' | 'elevenlabs';

// Project settings
export interface ProjectSettings {
  sceneCount: 12 | 24 | 36 | 48 | 60;
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

// Dialogue line with optional audio
export interface DialogueLine {
  id: string;
  characterId: string;
  characterName: string;
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  ttsProvider?: 'elevenlabs' | 'gemini-tts';  // Track which TTS was used
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
}

// LLM Provider selection - OpenRouter is default (works everywhere including Vercel)
export type LLMProvider = 'openrouter' | 'claude-sdk';

// Music Provider selection - PiAPI is default (unified API for Suno/Udio)
export type MusicProvider = 'piapi' | 'suno';

// API configuration
export interface ApiConfig {
  geminiApiKey?: string;
  grokApiKey?: string;
  kieApiKey?: string;  // Kie.ai API key for Grok Imagine
  elevenLabsApiKey?: string;
  nanoBananaApiKey?: string;
  claudeApiKey?: string;
  openRouterApiKey?: string;  // OpenRouter API key for LLM access
  openRouterModel?: string;  // OpenRouter model ID (e.g., 'anthropic/claude-sonnet-4')
  piapiApiKey?: string;  // PiAPI key for music generation
  sunoApiKey?: string;  // Suno API key (alternative)
  llmProvider?: LLMProvider;  // Default: 'openrouter'
  musicProvider?: MusicProvider;  // Default: 'piapi'
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
