import { KIE_IMAGE_MODELS, KIE_VIDEO_MODELS, KIE_TTS_MODELS, KIE_MUSIC_MODELS } from './kie-models';

// LLM Models
export const LLM_MODELS: Record<string, any[]> = {
    openrouter: [], // Populate with OpenRouter models logic if needed
    gemini: [
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: 'FREE' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', badge: 'FREE' },
    ],
    'claude-sdk': [],
    modal: []
};

// Image Models
export const IMAGE_MODELS = {
    kie: KIE_IMAGE_MODELS,
    gemini: [
        { id: 'imagen-3', name: 'Imagen 3', badge: 'FREE' }
    ],
    modal: []
};

// Video Models
export const VIDEO_MODELS = {
    kie: KIE_VIDEO_MODELS,
    modal: []
};

// TTS Models
export const TTS_MODELS = {
    kie: KIE_TTS_MODELS,
    'gemini-tts': [
        { id: 'en-US-Journey-D', name: 'Journey (Default)', badge: 'FREE' }
    ],
    elevenlabs: [],
    'openai-tts': [],
    modal: []
};

// Music Models
export const MUSIC_MODELS = {
    kie: KIE_MUSIC_MODELS,
    piapi: [],
    suno: [],
    modal: []
};
