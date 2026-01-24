import type { Caption, CaptionStyle } from '@/types/project';

export const SCENE_DURATION = 6;

export const animationOptions = [
  { value: 'none', label: 'None' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'popIn', label: 'Pop In' },
] as const;

export const fontSizeOptions = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const;

export const positionOptions = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
] as const;

export const fontFamilyOptions = [
  { value: 'default', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Monospace' },
] as const;

export type AnimationOption = (typeof animationOptions)[number]['value'];
export type FontSizeOption = (typeof fontSizeOptions)[number]['value'];
export type PositionOption = (typeof positionOptions)[number]['value'];
export type FontFamilyOption = (typeof fontFamilyOptions)[number]['value'];
