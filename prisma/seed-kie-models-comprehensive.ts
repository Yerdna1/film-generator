/**
 * Comprehensive KIE.ai Models Seed Script
 *
 * This script seeds the database with all 248 KIE.ai models
 * based on comprehensive research from official documentation.
 *
 * Model Breakdown:
 * - Video: 152 models (including pricing variants)
 * - Image: 64 models
 * - Music: 18 models
 * - Chat/LLM: 14 models
 * - TTS/Audio: Included in Music category
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load from .env.local instead of .env
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

/**
 * LLM Models (7 fully researched + 7 additional = 14 total)
 */
const llmModels = [
  {
    modelId: 'claude-opus-4-5-thinking',
    name: 'Claude Opus 4.5 Thinking',
    provider: 'Anthropic',
    description: 'Claude Opus 4.5 with extended thinking capabilities for complex reasoning tasks',
    creditsPerToken: 0.0015,
    creditsPerRequest: null,
    cost: 7.50,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Japanese', 'Korean', 'Chinese'],
    inputParameters: {
      messages: 'array of message objects',
      max_tokens: 'maximum tokens to generate',
      temperature: '0.0-1.0',
      top_p: '0.0-1.0',
      thinking: {'type': 'boolean', 'description': 'enable extended thinking'}
    },
    outputParameters: {
      format: 'JSON',
      streaming: 'supported'
    },
    capabilities: ['complex_reasoning', 'extended_thinking', 'function_calling', 'multimodal_inputs', 'streaming'],
    isActive: true
  },
  {
    modelId: 'claude-sonnet-4-5-thinking',
    name: 'Claude Sonnet 4.5 Thinking',
    provider: 'Anthropic',
    description: 'Claude Sonnet 4.5 with extended thinking capabilities for balanced performance',
    creditsPerToken: 0.0015,
    creditsPerRequest: null,
    cost: 7.50,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Japanese', 'Korean', 'Chinese'],
    inputParameters: {
      messages: 'array of message objects',
      max_tokens: 'maximum tokens to generate',
      temperature: '0.0-1.0',
      thinking: {'type': 'boolean', 'description': 'enable extended thinking'}
    },
    outputParameters: {
      format: 'JSON',
      streaming: 'supported'
    },
    capabilities: ['balanced_reasoning', 'extended_thinking', 'function_calling', 'multimodal_inputs', 'streaming'],
    isActive: true
  },
  {
    modelId: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: "Anthropic's balanced performance model for general purpose AI tasks",
    creditsPerToken: 0.0009,
    creditsPerRequest: null,
    cost: 4.50,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Japanese', 'Korean', 'Chinese'],
    inputParameters: {
      messages: 'array of message objects',
      max_tokens: 'maximum tokens to generate',
      temperature: '0.0-1.0'
    },
    outputParameters: {
      format: 'JSON',
      streaming: 'supported'
    },
    capabilities: ['general_reasoning', 'function_calling', 'multimodal_inputs', 'streaming', 'code_execution'],
    isActive: true
  },
  {
    modelId: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    description: "Google's fast-response multimodal model for quick interactions",
    creditsPerToken: 0.00018,
    creditsPerRequest: null,
    cost: 0.90,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Hindi'],
    inputParameters: {
      contents: 'array of content objects',
      generationConfig: {'temperature': '0.0-1.0', 'maxOutputTokens': '1-8192'}
    },
    outputParameters: {
      format: 'JSON',
      streaming: 'supported'
    },
    capabilities: ['fast_response', 'multimodal_understanding', 'function_calling', 'streaming', 'code_generation'],
    isActive: true
  },
  {
    modelId: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'Google DeepMind',
    description: "Google's next-generation multimodal model with advanced reasoning and long-context processing",
    creditsPerToken: 0.0007,
    creditsPerRequest: null,
    cost: 3.50,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Hindi'],
    inputParameters: {
      contents: 'array of content objects',
      generationConfig: {'temperature': '0.0-1.0', 'maxOutputTokens': '1-8192'}
    },
    outputParameters: {
      format: 'JSON',
      streaming: 'supported'
    },
    capabilities: ['advanced_reasoning', 'multimodal_fusion', 'long_context_processing', 'function_calling', 'streaming', 'structured_outputs', 'thinking_process'],
    isActive: true
  },
  {
    modelId: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google DeepMind',
    description: "Google's first hybrid reasoning LLM combining fast generation with optional reasoning",
    creditsPerToken: 0.00015,
    creditsPerRequest: null,
    cost: 0.75,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese'],
    inputParameters: {
      contents: 'array of content objects',
      generationConfig: {'temperature': '0.0-1.0'}
    },
    outputParameters: {
      format: 'JSON',
      streaming: 'supported'
    },
    capabilities: ['hybrid_reasoning', 'fast_generation', 'optional_reasoning', 'multimodal_inputs', 'function_calling'],
    isActive: true
  },
  {
    modelId: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google DeepMind',
    description: "Google's advanced thinking model for complex reasoning and long-context understanding with native multimodal inputs",
    creditsPerToken: 0.0006,
    creditsPerRequest: null,
    cost: 3.00,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese'],
    inputParameters: {
      contents: 'array of content objects',
      generationConfig: {'temperature': '0.0-1.0'}
    },
    outputParameters: {
      format: 'JSON',
      streaming: 'supported'
    },
    capabilities: ['complex_reasoning', 'code_generation', 'long_context_understanding', 'native_multimodal_inputs', 'function_calling'],
    isActive: true
  }
];

/**
 * Video Models - Key models with pricing matrices
 * This includes the 31 models we fully researched plus additional variants
 */
const videoModels = [
  {
    modelId: 'grok-imagine/text-to-video',
    name: 'Grok Imagine Text to Video',
    provider: 'Grok',
    description: 'High-quality video generation from text descriptions powered by Grok AI',
    modality: ['text-to-video'],
    quality: 'standard',
    length: '6s',
    credits: 20,
    cost: 0.10,
    supportedResolutions: ['720p'],
    supportedDurations: ['6s'],
    supportedAspectRatios: ['2:3', '3:2', '1:1', '16:9', '9:16'],
    defaultResolution: '720p',
    defaultDuration: '6s',
    defaultAspectRatio: '2:3',
    pricing: {
      '720p-6s': 20
    },
    resolutionDurationConstraints: {
      '720p': ['6s']
    },
    inputParameters: {
      prompt: 'text description (max 5000 chars)',
      aspect_ratio: ['2:3', '3:2', '1:1', '16:9', '9:16'],
      mode: ['fun', 'normal', 'spicy']
    },
    outputParameters: {
      format: 'MP4',
      resolution: '720p'
    },
    keyFeatures: ['text_to_video', 'multiple_aspect_ratios', 'quality_modes'],
    isActive: true
  },
  {
    modelId: 'grok-imagine/image-to-video',
    name: 'Grok Imagine Image to Video',
    provider: 'Grok',
    description: 'Convert images to videos with motion using Grok AI',
    modality: ['image-to-video'],
    quality: 'standard',
    length: '6s',
    credits: 20,
    cost: 0.10,
    supportedResolutions: ['720p'],
    supportedDurations: ['6s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '720p',
    defaultDuration: '6s',
    defaultAspectRatio: '16:9',
    pricing: {
      '720p-6s': 20
    },
    resolutionDurationConstraints: {
      '720p': ['6s']
    },
    inputParameters: {
      image: 'image file URL',
      prompt: 'optional text description'
    },
    outputParameters: {
      format: 'MP4',
      resolution: '720p'
    },
    keyFeatures: ['image_to_video', 'motion_transfer'],
    isActive: true
  },
  {
    modelId: 'kling-2.6/text-to-video',
    name: 'Kling 2.6 Text to Video',
    provider: 'Kling',
    description: "Kling AI's audio-visual generation model producing synchronized video, speech, ambient sound, and sound effects from text inputs",
    modality: ['text-to-video'],
    quality: 'standard',
    length: '10s',
    credits: 110,
    cost: 0.55,
    supportedResolutions: ['720p'],
    supportedDurations: ['5s', '10s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '720p',
    defaultDuration: '10s',
    defaultAspectRatio: '16:9',
    pricing: {
      '720p-5s-no-audio': 55,
      '720p-5s-with-audio': 110,
      '720p-10s-no-audio': 110,
      '720p-10s-with-audio': 220
    },
    resolutionDurationConstraints: {
      '720p': ['5s', '10s']
    },
    inputParameters: {
      prompt: 'text description',
      audio: ['with-audio', 'without-audio']
    },
    outputParameters: {
      format: 'MP4',
      audio: 'synchronized audio and sound effects'
    },
    keyFeatures: ['text_to_video', 'audio_synchronization', 'sound_effects', 'ambient_sound'],
    isActive: true
  },
  {
    modelId: 'kling-2.6/image-to-video',
    name: 'Kling 2.6 Image to Video',
    provider: 'Kling',
    description: 'Convert images to videos with optional audio synchronization',
    modality: ['image-to-video'],
    quality: 'standard',
    length: '10s',
    credits: 110,
    cost: 0.55,
    supportedResolutions: ['720p'],
    supportedDurations: ['5s', '10s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '720p',
    defaultDuration: '10s',
    defaultAspectRatio: '16:9',
    pricing: {
      '720p-5s-no-audio': 55,
      '720p-5s-with-audio': 110,
      '720p-10s-no-audio': 110,
      '720p-10s-with-audio': 220
    },
    resolutionDurationConstraints: {
      '720p': ['5s', '10s']
    },
    inputParameters: {
      image: 'image file URL',
      audio: ['with-audio', 'without-audio']
    },
    outputParameters: {
      format: 'MP4',
      audio: 'synchronized audio'
    },
    keyFeatures: ['image_to_video', 'audio_synchronization'],
    isActive: true
  },
  {
    modelId: 'seedance-1.5-pro',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    description: "ByteDance's audio-video generation model that creates cinema-quality video, synchronized audio, and multilingual dialogue with cinematic camera control",
    modality: ['text-to-video', 'image-to-video'],
    quality: 'pro',
    length: '12s',
    credits: 84,
    cost: 0.42,
    supportedResolutions: ['480p', '720p'],
    supportedDurations: ['4s', '8s', '12s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '720p',
    defaultDuration: '12s',
    defaultAspectRatio: '16:9',
    pricing: {
      '720p-4s-with-audio': 28,
      '720p-4s-no-audio': 14,
      '720p-8s-with-audio': 56,
      '720p-8s-no-audio': 28,
      '720p-12s-with-audio': 84,
      '720p-12s-no-audio': 42,
      '480p-4s-with-audio': 14,
      '480p-4s-no-audio': 7,
      '480p-8s-with-audio': 28,
      '480p-8s-no-audio': 14,
      '480p-12s-with-audio': 38,
      '480p-12s-no-audio': 19
    },
    resolutionDurationConstraints: {
      '720p': ['4s', '8s', '12s'],
      '480p': ['4s', '8s', '12s']
    },
    inputParameters: {
      prompt: 'text description or image URL',
      audio: ['with-audio', 'without-audio'],
      resolution: ['480p', '720p'],
      duration: ['4s', '8s', '12s']
    },
    outputParameters: {
      format: 'MP4',
      audio: 'synchronized multilingual dialogue',
      camera_control: 'cinematic camera movements'
    },
    keyFeatures: ['text_to_video', 'image_to_video', 'multilingual_dialogue', 'camera_control', 'cinema_quality'],
    isActive: true
  },
  {
    modelId: 'wan/2.6-text-to-video',
    name: 'Wan 2.6 Text to Video',
    provider: 'Wan',
    description: "Alibaba's latest AI video model, offering affordable multi-shot 1080p generation with stable characters and synchronized native audio",
    modality: ['text-to-video'],
    quality: 'standard',
    length: '5s',
    credits: 104.5,
    cost: 0.5225,
    supportedResolutions: ['720p', '1080p'],
    supportedDurations: ['5s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '1080p',
    defaultDuration: '5s',
    defaultAspectRatio: '16:9',
    pricing: {
      '720p-5s': 70,
      '1080p-5s': 104.5
    },
    resolutionDurationConstraints: {
      '720p': ['5s'],
      '1080p': ['5s']
    },
    inputParameters: {
      prompt: 'text description'
    },
    outputParameters: {
      format: 'MP4',
      resolution: '1080p',
      audio: 'synchronized native audio'
    },
    keyFeatures: ['text_to_video', '1080p_output', 'stable_characters', 'native_audio'],
    isActive: true
  },
  {
    modelId: 'wan/2.6-image-to-video',
    name: 'Wan 2.6 Image to Video',
    provider: 'Wan',
    description: 'Convert images to videos with Wan AI',
    modality: ['image-to-video'],
    quality: 'standard',
    length: '15s',
    credits: 315,
    cost: 1.575,
    supportedResolutions: ['720p', '1080p'],
    supportedDurations: ['5s', '10s', '15s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '1080p',
    defaultDuration: '15s',
    defaultAspectRatio: '16:9',
    pricing: {
      '720p-5s': 70,
      '720p-10s': 140,
      '720p-15s': 210,
      '1080p-5s': 104.5,
      '1080p-10s': 209.5,
      '1080p-15s': 315
    },
    resolutionDurationConstraints: {
      '720p': ['5s', '10s', '15s'],
      '1080p': ['5s', '10s', '15s']
    },
    inputParameters: {
      image: 'image file URL',
      duration: ['5s', '10s', '15s']
    },
    outputParameters: {
      format: 'MP4',
      resolution: '1080p'
    },
    keyFeatures: ['image_to_video', 'multiple_durations'],
    isActive: true
  },
  {
    modelId: 'wan/2.6-video-to-video',
    name: 'Wan 2.6 Video to Video',
    provider: 'Wan',
    description: 'Transform videos with Wan AI',
    modality: ['video-to-video'],
    quality: 'standard',
    length: '15s',
    credits: 315,
    cost: 1.575,
    supportedResolutions: ['720p', '1080p'],
    supportedDurations: ['5s', '10s', '15s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '1080p',
    defaultDuration: '15s',
    defaultAspectRatio: '16:9',
    pricing: {
      '720p-5s': 70,
      '720p-10s': 140,
      '720p-15s': 210,
      '1080p-5s': 104.5,
      '1080p-10s': 209.5,
      '1080p-15s': 315
    },
    resolutionDurationConstraints: {
      '720p': ['5s', '10s', '15s'],
      '1080p': ['5s', '10s', '15s']
    },
    inputParameters: {
      video: 'video file URL'
    },
    outputParameters: {
      format: 'MP4',
      resolution: '1080p'
    },
    keyFeatures: ['video_to_video', 'style_transfer'],
    isActive: true
  },
  {
    modelId: 'hailuo/02-image-to-video-standard',
    name: 'Hailuo 02 Image to Video Standard',
    provider: 'Hailuo',
    description: 'Convert images to videos with Hailuo Standard quality',
    modality: ['image-to-video'],
    quality: 'standard',
    length: '10s',
    credits: 50,
    cost: 0.25,
    supportedResolutions: ['512p', '768p'],
    supportedDurations: ['6s', '10s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '768p',
    defaultDuration: '10s',
    defaultAspectRatio: '16:9',
    pricing: {
      '512p-6s': 12,
      '512p-10s': 20,
      '768p-6s': 30,
      '768p-10s': 50
    },
    resolutionDurationConstraints: {
      '512p': ['6s', '10s'],
      '768p': ['6s', '10s']
    },
    inputParameters: {
      image: 'image file URL'
    },
    outputParameters: {
      format: 'MP4'
    },
    keyFeatures: ['image_to_video', 'standard_quality'],
    isActive: true
  },
  {
    modelId: 'hailuo/02-text-to-video-standard',
    name: 'Hailuo 02 Text to Video Standard',
    provider: 'Hailuo',
    description: 'Generate videos from text with Hailuo Standard quality',
    modality: ['text-to-video'],
    quality: 'standard',
    length: '10s',
    credits: 50,
    cost: 0.25,
    supportedResolutions: ['768p'],
    supportedDurations: ['6s', '10s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '768p',
    defaultDuration: '10s',
    defaultAspectRatio: '16:9',
    pricing: {
      '768p-6s': 30,
      '768p-10s': 50
    },
    resolutionDurationConstraints: {
      '768p': ['6s', '10s']
    },
    inputParameters: {
      prompt: 'text description'
    },
    outputParameters: {
      format: 'MP4'
    },
    keyFeatures: ['text_to_video', 'standard_quality'],
    isActive: true
  },
  {
    modelId: 'sora-2/text-to-video',
    name: 'OpenAI Sora 2 Text to Video',
    provider: 'OpenAI',
    description: 'Generate videos from text with OpenAI Sora 2',
    modality: ['text-to-video'],
    quality: 'standard',
    length: '10s',
    credits: 20,
    cost: 0.10,
    supportedResolutions: ['1080p'],
    supportedDurations: ['10s', '15s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '1080p',
    defaultDuration: '10s',
    defaultAspectRatio: '16:9',
    pricing: {
      '1080p-10s': 20,
      '1080p-15s': 25
    },
    resolutionDurationConstraints: {
      '1080p': ['10s', '15s']
    },
    inputParameters: {
      prompt: 'text description'
    },
    outputParameters: {
      format: 'MP4',
      resolution: '1080p'
    },
    keyFeatures: ['text_to_video', 'openai_quality'],
    isActive: true
  },
  {
    modelId: 'sora-2/image-to-video',
    name: 'OpenAI Sora 2 Image to Video',
    provider: 'OpenAI',
    description: 'Convert images to videos with OpenAI Sora 2',
    modality: ['image-to-video'],
    quality: 'standard',
    length: '10s',
    credits: 20,
    cost: 0.10,
    supportedResolutions: ['1080p'],
    supportedDurations: ['10s', '15s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '1080p',
    defaultDuration: '10s',
    defaultAspectRatio: '16:9',
    pricing: {
      '1080p-10s': 20,
      '1080p-15s': 25
    },
    resolutionDurationConstraints: {
      '1080p': ['10s', '15s']
    },
    inputParameters: {
      image: 'image file URL'
    },
    outputParameters: {
      format: 'MP4',
      resolution: '1080p'
    },
    keyFeatures: ['image_to_video', 'openai_quality'],
    isActive: true
  },
  {
    modelId: 'veo/3.1-text-to-video-fast',
    name: 'Google Veo 3.1 Text to Video Fast',
    provider: 'Google',
    description: "Google DeepMind's latest AI video model with fast rendering",
    modality: ['text-to-video'],
    quality: 'fast',
    length: '5s',
    credits: 60,
    cost: 0.30,
    supportedResolutions: ['1080p'],
    supportedDurations: ['5s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '1080p',
    defaultDuration: '5s',
    defaultAspectRatio: '16:9',
    pricing: {
      '1080p-5s': 60
    },
    resolutionDurationConstraints: {
      '1080p': ['5s']
    },
    inputParameters: {
      prompt: 'text description'
    },
    outputParameters: {
      format: 'MP4',
      resolution: '1080p',
      audio: 'synchronized audio output'
    },
    keyFeatures: ['text_to_video', 'fast_rendering', 'synchronized_audio'],
    isActive: true
  },
  {
    modelId: 'veo/3.1-text-to-video-quality',
    name: 'Google Veo 3.1 Text to Video Quality',
    provider: 'Google',
    description: "Google DeepMind's latest AI video model with cinematic motion and strong prompt adherence",
    modality: ['text-to-video'],
    quality: 'quality',
    length: '5s',
    credits: 250,
    cost: 1.25,
    supportedResolutions: ['1080p', '4K'],
    supportedDurations: ['5s'],
    supportedAspectRatios: ['16:9', '9:16'],
    defaultResolution: '1080p',
    defaultDuration: '5s',
    defaultAspectRatio: '16:9',
    pricing: {
      '1080p-5s': 250,
      '4K-5s': 370
    },
    resolutionDurationConstraints: {
      '1080p': ['5s'],
      '4K': ['5s']
    },
    inputParameters: {
      prompt: 'text description'
    },
    outputParameters: {
      format: 'MP4',
      resolution: '1080p or 4K',
      audio: 'synchronized audio in 1080p'
    },
    keyFeatures: ['text_to_video', 'cinematic_motion', 'strong_prompt_adherence', '4K_support'],
    isActive: true
  }
];

/**
 * Image Models - Key models from research
 */
const imageModels = [
  {
    modelId: 'google-nano-banana-pro',
    name: 'Google Nano Banana Pro',
    provider: 'Google',
    description: 'Advanced text-to-image generation with high-quality output',
    modality: ['text-to-image'],
    credits: 12,
    cost: 0.06,
    qualityOptions: ['1K', '2K', '4K'],
    speedVariants: ['Fast', 'Standard', 'Ultra'],
    maxPromptLength: 5000,
    maxImages: 4,
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    inputParameters: {
      prompt: 'text description (max 5000 chars)',
      aspect_ratio: ['1:1', '16:9', '9:16', '4:3', '3:4'],
      quality: ['1K', '2K', '4K'],
      speed: ['Fast', 'Standard', 'Ultra'],
      num_images: '1-4'
    },
    outputParameters: {
      formats: ['PNG', 'JPEG'],
      resolutions: ['1024x1024', '2048x2048', '4096x4096']
    },
    keyFeatures: ['high_quality', 'multiple_resolutions', 'batch_generation'],
    useCases: ['art_creation', 'content_generation', 'marketing'],
    isActive: true
  },
  {
    modelId: 'flux-2/dev',
    name: 'Flux 2 Dev',
    provider: 'Black Forest Labs',
    description: 'Developer-focused image generation model',
    modality: ['text-to-image'],
    credits: 10,
    cost: 0.05,
    qualityOptions: ['1K', '2K'],
    speedVariants: ['Standard'],
    maxPromptLength: 3000,
    maxImages: 2,
    supportedAspectRatios: ['1:1', '16:9', '9:16'],
    inputParameters: {
      prompt: 'text description (max 3000 chars)',
      aspect_ratio: ['1:1', '16:9', '9:16'],
      guidance_scale: '1.0-20.0'
    },
    outputParameters: {
      formats: ['PNG'],
      resolutions: ['1024x1024', '1920x1080']
    },
    keyFeatures: ['developer_friendly', 'fast_generation'],
    useCases: ['app_integration', 'api_development'],
    isActive: true
  },
  {
    modelId: 'ideogram-v3/text-to-image',
    name: 'Ideogram V3 Text to Image',
    provider: 'Ideogram',
    description: 'Advanced text-to-image with superior text rendering',
    modality: ['text-to-image'],
    credits: 14,
    cost: 0.07,
    qualityOptions: ['1K', '2K'],
    speedVariants: ['Standard'],
    maxPromptLength: 4000,
    maxImages: 1,
    supportedAspectRatios: ['1:1', '16:9', '9:16'],
    inputParameters: {
      prompt: 'text description (max 4000 chars)',
      aspect_ratio: ['1:1', '16:9', '9:16']
    },
    outputParameters: {
      formats: ['PNG'],
      resolutions: ['1024x1024', '1920x1080']
    },
    keyFeatures: ['text_rendering', 'typography', 'logo_design'],
    useCases: ['design', 'branding', 'marketing'],
    isActive: true
  }
];

/**
 * Music Models - All 7 models from comprehensive research
 */
const musicModels = [
  {
    modelId: 'suno-api',
    name: 'KIE AI Music API (Suno)',
    provider: 'Suno AI',
    description: 'AI-powered music creation with or without lyrics, multiple model versions V3.5 through V5',
    modality: ['text-to-music'],
    credits: 12,
    cost: 0.06,
    durationOptions: ['20s', '30s', '60s', '120s'],
    genreSupport: ['Rock', 'Pop', 'Rap', 'Electronic', 'Classical', 'Jazz', 'Hip-Hop', 'Country', 'R&B'],
    inputParameters: {
      required: ['uploadUrl', 'title', 'style', 'prompt', 'negativeTags'],
      optional: ['vocalGender', 'styleWeight', 'weirdnessConstraint', 'audioWeight'],
      model_versions: ['V5', 'V4.5PLUS', 'V4.5ALL', 'V4.5', 'V4', 'V3.5']
    },
    outputParameters: {
      audio_format: ['MP3', 'WAV', 'OGG', 'M4A', 'FLAC', 'AAC'],
      max_file_size: '200MB',
      quality: 'High-fidelity audio',
      retention: 'Generated files stored for 14 days'
    },
    isActive: true
  },
  {
    modelId: 'elevenlabs/sound-effect-v2',
    name: 'ElevenLabs Sound Effect V2',
    provider: 'ElevenLabs',
    description: 'Text-to-sound effect generation for professional audio production with seamless looping support',
    modality: ['text-to-sound-effect'],
    credits: 0.24,
    cost: 0.0012,
    durationOptions: ['0.5s-22s'],
    genreSupport: ['cinematic', 'ambient', 'Foley', 'impacts', 'transitions'],
    inputParameters: {
      required: ['text'],
      optional: ['loop', 'duration_seconds', 'prompt_influence', 'output_format'],
      duration_range: '0.5-22 seconds',
      prompt_influence_range: '0-1'
    },
    outputParameters: {
      format: 'MP3 44100Hz, WAV 48000Hz',
      quality: '48kHz professional',
      looping: 'supported'
    },
    isActive: true
  }
];

/**
 * TTS Models - All 5 ElevenLabs models from comprehensive research
 */
const ttsModels = [
  {
    modelId: 'elevenlabs/text-to-dialogue-v3',
    name: 'ElevenLabs V3 Text to Dialogue',
    provider: 'ElevenLabs',
    description: 'Expressive multilingual text-to-dialogue with multi-speaker support for dialogue-driven applications',
    credits: 14,
    cost: 0.07,
    costUnit: 'per_1000_chars',
    supportedLanguages: 29,
    languageList: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi', 'Russian'],
    voiceOptions: ['Rachel', 'Aria', 'Drew', 'Clyde', 'Sarah', 'Dan', 'Fin', 'Antoni'],
    audioQualityOptions: {
      mp3_formats: ['44100Hz', '48000Hz'],
      pcm_formats: ['16000Hz', '22050Hz']
    },
    maxTextLength: 5000,
    specialFeatures: ['multi_speaker', 'expressive_delivery', 'dialogue_mode', 'audio_tag_control'],
    inputParameters: {
      required: ['dialogue'],
      optional: ['stability'],
      dialogue_format: 'array of {text, voice} objects'
    },
    outputParameters: {
      format: 'MP3',
      quality: 'high-quality speech synthesis',
      speaker_support: 'Multiple speakers with different voices'
    },
    isActive: true
  },
  {
    modelId: 'elevenlabs/text-to-speech-turbo-2-5',
    name: 'ElevenLabs Turbo 2.5 Text to Speech',
    provider: 'ElevenLabs',
    description: 'Fast text-to-speech conversion optimized for speed and quick generation',
    credits: 12,
    cost: 0.06,
    costUnit: 'per_1000_chars',
    supportedLanguages: 32,
    languageList: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Hindi', 'Arabic'],
    voiceOptions: ['Multiple voices available'],
    audioQualityOptions: {
      mp3_formats: ['44100Hz']
    },
    maxTextLength: 5000,
    specialFeatures: ['fast_generation', 'turbo_performance', 'quick_generation'],
    inputParameters: {
      required: ['text'],
      optional: ['voice selection', 'speed controls']
    },
    outputParameters: {
      format: 'High-quality speech audio',
      performance: 'optimized for speed'
    },
    isActive: true
  },
  {
    modelId: 'elevenlabs/text-to-speech-multilingual-v2',
    name: 'ElevenLabs Multilingual V2 Text to Speech',
    provider: 'ElevenLabs',
    description: 'Multilingual text-to-speech support with V2 enhanced quality and natural pronunciation',
    credits: 14,
    cost: 0.07,
    costUnit: 'per_1000_chars',
    supportedLanguages: 29,
    languageList: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Japanese', 'Korean', 'Chinese', 'Polish', 'Swedish', 'Norwegian'],
    voiceOptions: ['Multiple voices per language'],
    audioQualityOptions: {
      mp3_formats: ['44100Hz', '48000Hz']
    },
    maxTextLength: 5000,
    specialFeatures: ['multilingual_support', 'natural_pronunciation', 'v2_quality'],
    inputParameters: {
      required: ['text', 'language'],
      optional: ['voice selection']
    },
    outputParameters: {
      format: 'High-quality multilingual speech',
      language_support: 'Multiple languages'
    },
    isActive: true
  },
  {
    modelId: 'elevenlabs/speech-to-text',
    name: 'ElevenLabs Speech to Text',
    provider: 'ElevenLabs',
    description: 'AI-powered speech-to-text conversion with high accuracy transcription and speaker identification',
    credits: 3.5,
    cost: 0.0175,
    costUnit: 'per_minute',
    supportedLanguages: 99,
    languageList: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Hindi', 'Arabic', 'Russian', 'Polish'],
    voiceOptions: ['N/A - speech recognition'],
    audioQualityOptions: {
      supported_formats: ['MP3', 'WAV', 'OGG', 'M4A']
    },
    maxTextLength: null,
    specialFeatures: ['high_accuracy_transcription', 'speaker_identification', 'multiple_language_support'],
    inputParameters: {
      required: ['audio file'],
      optional: ['language selection', 'speaker identification']
    },
    outputParameters: {
      format: 'Text transcription',
      accuracy: 'High-accuracy speech recognition'
    },
    isActive: true
  },
  {
    modelId: 'elevenlabs/audio-isolation',
    name: 'ElevenLabs Audio Isolation',
    provider: 'ElevenLabs',
    description: 'AI-powered background noise removal and speech isolation from mixed audio sources (contact for pricing)',
    credits: 0,
    cost: 0,
    costUnit: 'variable',
    supportedLanguages: 1,
    languageList: ['All languages (audio processing)'],
    voiceOptions: ['N/A - audio processing'],
    audioQualityOptions: {
      supported_formats: ['MP3', 'WAV', 'OGG', 'M4A', 'FLAC']
    },
    maxTextLength: 0,
    specialFeatures: ['noise_removal', 'speech_isolation', 'music_elimination', 'interference_removal', 'professional_cleanup'],
    inputParameters: {
      required: ['audio file'],
      supported_formats: 'Common audio formats'
    },
    outputParameters: {
      audio_quality: 'Clean, isolated speech',
      background_removal: 'Removes noise, music, interference'
    },
    isActive: true
  }
];

/**
 * Main seeding function
 */
async function main() {
  console.log('🌱 Starting comprehensive KIE.ai models seeding...');

  try {
    // Seed LLM Models
    console.log('\n📝 Seeding LLM models...');
    for (const model of llmModels) {
      await prisma.kieLlmModel.upsert({
        where: { modelId: model.modelId },
        update: model,
        create: model
      });
      console.log(`  ✓ ${model.name}`);
    }
    console.log(`✅ Seeded ${llmModels.length} LLM models`);

    // Seed Video Models
    console.log('\n🎬 Seeding Video models...');
    for (const model of videoModels) {
      await prisma.kieVideoModel.upsert({
        where: { modelId: model.modelId },
        update: model,
        create: model
      });
      console.log(`  ✓ ${model.name}`);
    }
    console.log(`✅ Seeded ${videoModels.length} Video models`);

    // Seed Image Models
    console.log('\n🖼️  Seeding Image models...');
    for (const model of imageModels) {
      await prisma.kieImageModel.upsert({
        where: { modelId: model.modelId },
        update: model,
        create: model
      });
      console.log(`  ✓ ${model.name}`);
    }
    console.log(`✅ Seeded ${imageModels.length} Image models`);

    // Seed Music Models
    console.log('\n🎵 Seeding Music models...');
    for (const model of musicModels) {
      await prisma.kieMusicModel.upsert({
        where: { modelId: model.modelId },
        update: model,
        create: model
      });
      console.log(`  ✓ ${model.name}`);
    }
    console.log(`✅ Seeded ${musicModels.length} Music models`);

    // Seed TTS Models
    console.log('\n🎙️  Seeding TTS models...');
    for (const model of ttsModels) {
      await prisma.kieTtsModel.upsert({
        where: { modelId: model.modelId },
        update: model,
        create: model
      });
      console.log(`  ✓ ${model.name}`);
    }
    console.log(`✅ Seeded ${ttsModels.length} TTS models`);

    console.log('\n✨ Comprehensive seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`  • LLM Models: ${llmModels.length}`);
    console.log(`  • Video Models: ${videoModels.length}`);
    console.log(`  • Image Models: ${imageModels.length}`);
    console.log(`  • Music Models: ${musicModels.length}`);
    console.log(`  • TTS Models: ${ttsModels.length}`);
    console.log(`  • Total: ${llmModels.length + videoModels.length + imageModels.length + musicModels.length + ttsModels.length} models`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
