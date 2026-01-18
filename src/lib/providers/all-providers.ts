// Import all providers to ensure registration
// This file should be imported once at app startup

// Image providers
import './image/gemini-provider';
import './image/modal-provider';
import './image/kie-provider';

// Video providers
import './video/kie-provider';
import './video/modal-provider';

// TTS providers
import './tts/gemini-provider';
import './tts/elevenlabs-provider';
import './tts/openai-provider';
import './tts/modal-provider';
import './tts/kie-provider';

// Music providers
import './music/modal-provider';
import './music/kie-provider';
import './music/piapi-provider';
import './music/suno-provider';

// Re-export all provider classes for convenience
export * from './image';
export * from './video';
export * from './tts';
export * from './music';