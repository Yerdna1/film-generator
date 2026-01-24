/**
 * URL Building utilities for API providers
 */

import { getEndpointUrl } from '@/lib/constants/api-endpoints';
import type { GenerationType } from '../types';

/**
 * Build the API URL based on provider and type
 */
export function buildProviderUrl(provider: string, type: GenerationType, model?: string): string {
  switch (type) {
    case 'llm':
      switch (provider) {
        case 'openrouter':
          return getEndpointUrl('openrouter', 'chat');
        case 'kie':
          if (!model) {
            throw new Error('Model is required for KIE LLM provider');
          }
          // KIE expects model without provider prefix (e.g., 'gemini-3-pro' not 'google/gemini-3-pro')
          const kieModel = model.includes('/') ? model.split('/')[1] : model;
          return getEndpointUrl('kie', 'llm', kieModel);
        case 'gemini':
          return getEndpointUrl('gemini', 'generateContent', model || 'gemini-2.0-flash-exp');
        case 'openai':
          return getEndpointUrl('openai', 'chat');
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }

    case 'image':
      switch (provider) {
        case 'kie':
          return getEndpointUrl('kie', 'generateImage');
        case 'gemini':
          return getEndpointUrl('gemini', 'generateContent', model || 'gemini-3-pro-image-preview');
        case 'grok':
          return getEndpointUrl('grok', 'images');
        default:
          throw new Error(`Unsupported image provider: ${provider}`);
      }

    case 'video':
      switch (provider) {
        case 'kie':
          return getEndpointUrl('kie', 'createTask');
        default:
          throw new Error(`Unsupported video provider: ${provider}`);
      }

    case 'tts':
      switch (provider) {
        case 'openai':
          return getEndpointUrl('openai', 'tts');
        case 'elevenlabs':
          if (!model) throw new Error('Voice ID required for ElevenLabs');
          return getEndpointUrl('elevenlabs', 'tts', model);
        case 'kie':
          return getEndpointUrl('kie', 'createTask');
        case 'gemini':
          return getEndpointUrl('gemini', 'generateContent', model || 'gemini-2.0-flash-exp');
        default:
          throw new Error(`Unsupported TTS provider: ${provider}`);
      }

    case 'music':
      switch (provider) {
        case 'kie':
          return getEndpointUrl('kie', 'generateMusic');
        default:
          throw new Error(`Unsupported music provider: ${provider}`);
      }

    default:
      throw new Error(`Unsupported generation type: ${type}`);
  }
}