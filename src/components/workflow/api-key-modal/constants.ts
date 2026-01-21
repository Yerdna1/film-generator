import type { ProviderConfig, ApiKeyField, OperationType } from './types';

// Default provider and model settings for new users
export const DEFAULT_PROVIDERS: Record<OperationType, string> = {
  llm: 'kie',
  image: 'kie',
  video: 'kie',
  tts: 'kie',
  music: 'kie',
};

export const DEFAULT_MODELS: Record<string, string> = {
  kieLlmModel: 'gemini-2.5-flash',
  kieImageModel: 'grok-imagine/text-to-image',
  kieVideoModel: 'bytedance/seedance-image-to-video',
  kieTtsModel: 'elevenlabs/text-to-speech-turbo-2-5',
  kieMusicModel: 'suno/v3-music',
};

export const PROVIDER_CONFIGS: Record<OperationType, ProviderConfig[]> = {
  llm: [
    {
      id: 'kie',
      name: 'Kie.ai',
      icon: '🤖',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieLlmModel',
      defaultModel: 'gemini-2.5-flash',
      description: 'Multiple LLM models: Claude, GPT-4, Gemini, DeepSeek, etc.',
      isDefault: true,
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      icon: '🌐',
      color: 'emerald',
      apiKeyField: 'openRouterApiKey',
      modelField: 'openRouterModel',
      modelOptions: [
        { value: 'anthropic/claude-4.5-sonnet', label: 'Claude Sonnet 4.5' },
        { value: 'anthropic/claude-3.5-sonnet', label: 'Claude Sonnet 3.5' },
        { value: 'anthropic/claude-3.7-sonnet', label: 'Claude Sonnet 3.7' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
        { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
        { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
      ],
      description: 'Multi-provider API for Claude, GPT-4, Gemini, and more',
    },
    {
      id: 'claude-sdk',
      name: 'Claude SDK',
      icon: '🧠',
      color: 'amber',
      apiKeyField: 'claudeApiKey',
      description: 'Local Claude CLI (does not work on Vercel)',
    },
    {
      id: 'modal',
      name: 'Modal (Self-Hosted)',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalLlmEndpoint',
      description: 'Self-hosted LLM on Modal.com GPU infrastructure',
    },
  ],
  image: [
    {
      id: 'kie',
      name: 'Kie.ai',
      icon: '🎨',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieImageModel',
      defaultModel: 'grok-imagine/text-to-image',
      description: 'Multiple models: Seedream, Flux-2, Imagen4, Ideogram, etc.',
      isDefault: true,
    },
    {
      id: 'gemini',
      name: 'Gemini',
      icon: '✨',
      color: 'blue',
      apiKeyField: 'geminiApiKey',
      description: 'Google Gemini for image generation',
    },
    {
      id: 'modal',
      name: 'Modal Qwen-Image',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalImageEndpoint',
      description: 'Self-hosted Qwen-Image (20B) for fast generation',
    },
    {
      id: 'modal-edit',
      name: 'Modal Qwen-Image-Edit',
      icon: '🖼️',
      color: 'cyan',
      apiKeyField: 'modalImageEditEndpoint',
      description: 'Best character consistency with reference images',
    },
  ],
  video: [
    {
      id: 'kie',
      name: 'Kie.ai',
      icon: '🎬',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieVideoModel',
      defaultModel: 'bytedance/seedance-image-to-video',
      description: 'Multiple models: Grok Imagine, Kling, Sora2, Veo 3.1, etc.',
      isDefault: true,
    },
    {
      id: 'modal',
      name: 'Modal (Self-Hosted)',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalVideoEndpoint',
      description: 'Self-hosted video model on Modal.com',
    },
  ],
  tts: [
    {
      id: 'kie',
      name: 'Kie.ai (ElevenLabs)',
      icon: '🎙️',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieTtsModel',
      defaultModel: 'elevenlabs/text-to-speech-turbo-2-5',
      description: 'ElevenLabs voices via Kie.ai API',
      isDefault: true,
    },
    {
      id: 'gemini-tts',
      name: 'Gemini TTS',
      icon: '🔊',
      color: 'blue',
      apiKeyField: 'geminiApiKey',
      description: 'Google Gemini TTS with excellent Slovak support',
    },
    {
      id: 'openai-tts',
      name: 'OpenAI TTS',
      icon: '🗣️',
      color: 'green',
      apiKeyField: 'openaiApiKey',
      description: 'OpenAI gpt-4o-mini-tts with voice instructions',
    },
    {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      icon: '🎙️',
      color: 'violet',
      apiKeyField: 'elevenLabsApiKey',
      description: 'High-quality voices, best for English',
    },
    {
      id: 'modal',
      name: 'Modal (Self-Hosted)',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalTtsEndpoint',
      description: 'Self-hosted TTS model (Bark, XTTS, Coqui)',
    },
  ],
  music: [
    {
      id: 'kie',
      name: 'Kie.ai',
      icon: '🎵',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieMusicModel',
      defaultModel: 'suno/v3-music',
      description: 'AI music generation via Kie.ai',
      isDefault: true,
    },
    {
      id: 'piapi',
      name: 'PiAPI',
      icon: '🎵',
      color: 'pink',
      apiKeyField: 'piapiApiKey',
      description: 'Access Suno, Udio, and more via unified API',
    },
    {
      id: 'suno',
      name: 'Suno AI',
      icon: '🎶',
      color: 'purple',
      apiKeyField: 'sunoApiKey',
      description: 'Direct Suno API via sunoapi.org',
    },
    {
      id: 'modal',
      name: 'Modal ACE-Step',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalMusicEndpoint',
      description: 'Self-hosted ACE-Step music generation',
    },
  ],
};

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
    options: PROVIDER_CONFIGS.llm.find((p) => p.id === 'openrouter')?.modelOptions,
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
