// Export base class
export { BaseTTSProvider } from './base-tts-provider';

// Export all TTS providers
export { GeminiTTSProvider } from './gemini-provider';
export { ElevenLabsTTSProvider } from './elevenlabs-provider';
export { OpenAITTSProvider } from './openai-provider';
export { ModalTTSProvider } from './modal-provider';
export { KieTTSProvider } from './kie-provider';

// Import to ensure they are registered
import './gemini-provider';
import './elevenlabs-provider';
import './openai-provider';
import './modal-provider';
import './kie-provider';