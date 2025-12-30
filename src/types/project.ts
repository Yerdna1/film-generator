// Style presets for film generation
export type StylePreset = 'disney-pixar' | 'realistic' | 'anime' | 'custom';

export type CameraShot = 'medium' | 'close-up' | 'wide' | 'extreme-close-up' | 'over-shoulder' | 'pov' | 'aerial' | 'low-angle' | 'high-angle';

export type AspectRatio = '16:9' | '21:9' | '4:3';

export type Resolution = 'hd' | '4k';

export type VoiceLanguage = 'sk' | 'en';

export type VoiceProvider = 'gemini-tts' | 'elevenlabs';

// Project settings
export interface ProjectSettings {
  sceneCount: 12 | 24 | 36 | 48 | 60;
  characterCount: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
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
}

// API configuration
export interface ApiConfig {
  geminiApiKey?: string;
  grokApiKey?: string;
  kieApiKey?: string;  // Kie.ai API key for Grok Imagine
  elevenLabsApiKey?: string;
  nanoBananaApiKey?: string;
  claudeApiKey?: string;
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
