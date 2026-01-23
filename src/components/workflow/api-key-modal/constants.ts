import type { ProviderConfig, ApiKeyField, OperationType } from './types';
import { DEFAULT_MODELS as SHARED_DEFAULT_MODELS } from '@/lib/constants/default-models';

// Default provider and model settings for new users
export const DEFAULT_PROVIDERS: Record<OperationType, string> = {
  llm: 'kie',
  image: 'kie',
  video: 'kie',
  tts: 'kie',
  music: 'kie',
};

// Re-export from shared location for backward compatibility
export const DEFAULT_MODELS = SHARED_DEFAULT_MODELS;

export const API_KEY_FIELDS: Record<string, ApiKeyField> = {
  openRouterApiKey: {
    key: 'openRouterApiKey',
    label: 'OpenRouter API Key',
    placeholder: 'sk-or-v1-...',
    helpText: 'Get your API key from OpenRouter',
    helpLink: 'https://openrouter.ai/keys',
    validate: (value) => {
      if (!value || value.startsWith('sk-or-')) {
        return { valid: true };
      }
      return { valid: false, error: 'OpenRouter keys must start with sk-or-' };
    },
  },
  openRouterModel: {
    key: 'openRouterModel',
    label: 'OpenRouter Model',
    placeholder: 'Select a model',
    helpText: 'Select the model to use for LLM operations',
    type: 'select',
    options: [], // Will be populated from API
  },
  claudeApiKey: {
    key: 'claudeApiKey',
    label: 'Claude API Key',
    placeholder: 'sk-ant-...',
    helpText: 'Get your API key from Anthropic',
    helpLink: 'https://console.anthropic.com/account/keys',
  },
  geminiApiKey: {
    key: 'geminiApiKey',
    label: 'Gemini API Key',
    placeholder: 'AIza...',
    helpText: 'Get your API key from Google AI Studio',
    helpLink: 'https://makersuite.google.com/app/apikey',
  },
  kieApiKey: {
    key: 'kieApiKey',
    label: 'Kie.ai API Key',
    placeholder: 'Your Kie.ai API key',
    helpText: 'Get your API key from Kie.ai',
    helpLink: 'https://kie.ai/api-keys',
    validate: (value) => {
      if (value && value.length < 20) {
        return { valid: false, error: 'Kie.ai API key should be at least 20 characters' };
      }
      return { valid: true };
    },
  },
  elevenLabsApiKey: {
    key: 'elevenLabsApiKey',
    label: 'ElevenLabs API Key',
    placeholder: 'Your ElevenLabs API key',
    helpText: 'Get your API key from ElevenLabs',
    helpLink: 'https://elevenlabs.io/api',
  },
  openaiApiKey: {
    key: 'openaiApiKey',
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    helpText: 'Get your API key from OpenAI',
    helpLink: 'https://platform.openai.com/api-keys',
  },
  piapiApiKey: {
    key: 'piapiApiKey',
    label: 'PiAPI Key',
    placeholder: 'Your PiAPI key',
    helpText: 'Get your API key from PiAPI',
    helpLink: 'https://piapi.ai',
  },
  sunoApiKey: {
    key: 'sunoApiKey',
    label: 'Suno API Key',
    placeholder: 'Your Suno API key',
    helpText: 'Get your API key from Suno',
    helpLink: 'https://suno.ai/api',
  },
  modalLlmEndpoint: {
    key: 'modalLlmEndpoint',
    label: 'Modal LLM Endpoint',
    placeholder: 'https://your-app--llm.modal.run',
    helpText: 'Your Modal LLM endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  modalTtsEndpoint: {
    key: 'modalTtsEndpoint',
    label: 'Modal TTS Endpoint',
    placeholder: 'https://your-app--tts.modal.run',
    helpText: 'Your Modal TTS endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  modalImageEndpoint: {
    key: 'modalImageEndpoint',
    label: 'Modal Image Endpoint',
    placeholder: 'https://your-app--image.modal.run',
    helpText: 'Your Modal Image generation endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  modalImageEditEndpoint: {
    key: 'modalImageEditEndpoint',
    label: 'Modal Image Edit Endpoint',
    placeholder: 'https://your-app--image-edit.modal.run',
    helpText: 'Your Modal Image Edit endpoint URL (Qwen-Image-Edit)',
    helpLink: 'https://huggingface.co/Qwen/Qwen-Image-Edit-2511',
  },
  modalVideoEndpoint: {
    key: 'modalVideoEndpoint',
    label: 'Modal Video Endpoint',
    placeholder: 'https://your-app--video.modal.run',
    helpText: 'Your Modal Video generation endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  modalMusicEndpoint: {
    key: 'modalMusicEndpoint',
    label: 'Modal Music Endpoint',
    placeholder: 'https://your-app--ace-step.modal.run',
    helpText: 'Your Modal ACE-Step music endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  kieImageModel: {
    key: 'kieImageModel',
    label: 'Kie.ai Image Model',
    placeholder: DEFAULT_MODELS.kieImageModel,
    helpText: 'Default Kie.ai image generation model',
    type: 'select',
    options: [], // Will be populated from API
  },
  kieVideoModel: {
    key: 'kieVideoModel',
    label: 'Kie.ai Video Model',
    placeholder: DEFAULT_MODELS.kieVideoModel,
    helpText: 'Default Kie.ai video generation model',
    type: 'select',
    options: [], // Will be populated from API
  },
  kieTtsModel: {
    key: 'kieTtsModel',
    label: 'Kie.ai TTS Model',
    placeholder: DEFAULT_MODELS.kieTtsModel,
    helpText: 'Default Kie.ai text-to-speech model',
    type: 'select',
    options: [], // Will be populated from API
  },
  kieMusicModel: {
    key: 'kieMusicModel',
    label: 'Kie.ai Music Model',
    placeholder: DEFAULT_MODELS.kieMusicModel,
    helpText: 'Default Kie.ai music generation model',
    type: 'select',
    options: [], // Will be populated from API
  },
  kieLlmModel: {
    key: 'kieLlmModel',
    label: 'Kie.ai LLM Model',
    placeholder: DEFAULT_MODELS.kieLlmModel,
    helpText: 'Default Kie.ai LLM model for scene generation',
    type: 'select',
    options: [], // Will be populated from API
  },
};

export const OPERATION_INFO: Record<OperationType, { label: string; icon: string; description: string }> = {
  llm: { label: 'LLM / Scene Generation', icon: '🧠', description: 'For story and scene generation' },
  image: { label: 'Image Generation', icon: '🖼️', description: 'For character and scene images' },
  video: { label: 'Video Generation', icon: '🎬', description: 'For scene animation' },
  tts: { label: 'Voice Generation', icon: '🎙️', description: 'For voiceovers' },
  music: { label: 'Music Generation', icon: '🎵', description: 'For background music' },
};
