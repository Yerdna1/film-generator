import type { ProjectSettings, StoryConfig, VoiceSettings } from '@/types/project';

export const defaultSettings: ProjectSettings = {
  sceneCount: 12,
  characterCount: 2,
  aspectRatio: '21:9',
  resolution: '4k',
  imageResolution: '2k',
  voiceLanguage: 'en',
  voiceProvider: 'elevenlabs',
  storyModel: 'claude-sonnet-4.5',
};

export const defaultStory: StoryConfig = {
  title: '',
  concept: '',
  genre: 'adventure',
  tone: 'heartfelt',
  setting: '',
};

export const defaultVoiceSettings: VoiceSettings = {
  language: 'en',
  provider: 'elevenlabs',
  characterVoices: {},
};
