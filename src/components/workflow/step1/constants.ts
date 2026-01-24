import { Film, Camera, Sparkles, Wand2 } from 'lucide-react';
import type { StylePreset } from '@/types/project';

export const genres = ['adventure', 'comedy', 'drama', 'fantasy', 'horror', 'mystery', 'romance', 'scifi', 'family'] as const;
export const tones = ['inspiring', 'suspenseful', 'heartfelt', 'dark', 'lighthearted', 'dramatic'] as const;
export const sceneOptions = [12, 36, 60, 120, 240, 360] as const;
export const storyModels = [
  'gpt-4',
  'claude-sonnet-4.5',
  'gemini-3-pro'

] as const;

export const imageProviders: Array<{ id: 'gemini' | 'modal' | 'modal-edit' | 'kie'; label: string }> = [
  { id: 'gemini', label: 'Gemini' },
  { id: 'modal', label: 'Modal (Qwen)' },
  { id: 'modal-edit', label: 'Modal Edit (Character)' },
  { id: 'kie', label: 'KIE AI' },
];

export const voiceProviders: Array<{ id: 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts'; label: string }> = [
  { id: 'gemini-tts', label: 'Gemini TTS' },
  { id: 'elevenlabs', label: 'ElevenLabs' },
  { id: 'modal', label: 'Modal (Self-hosted)' },
  { id: 'openai-tts', label: 'OpenAI TTS' },
];

export const styleOptions = [
  {
    id: 'disney-pixar' as StylePreset,
    labelKey: 'styles.disneyPixar',
    gradient: 'from-blue-400 to-purple-600',
    icon: Sparkles,
  },
  {
    id: 'realistic' as StylePreset,
    labelKey: 'styles.realistic',
    gradient: 'from-amber-400 to-orange-600',
    icon: Camera,
  },
  {
    id: 'anime' as StylePreset,
    labelKey: 'styles.anime',
    gradient: 'from-pink-400 to-rose-600',
    icon: Sparkles,
  },
  {
    id: 'custom' as StylePreset,
    labelKey: 'styles.custom',
    gradient: 'from-cyan-400 to-blue-600',
    icon: Film,
  },
];
