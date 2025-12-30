import type { CameraShot } from '@/types/project';

// Camera shot options for scene generation
export const cameraShots: { value: CameraShot; label: string }[] = [
  { value: 'wide', label: 'Wide Shot' },
  { value: 'medium', label: 'Medium Shot' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'extreme-close-up', label: 'Extreme Close-up' },
  { value: 'over-shoulder', label: 'Over Shoulder' },
  { value: 'pov', label: 'POV' },
  { value: 'aerial', label: 'Aerial' },
  { value: 'low-angle', label: 'Low Angle' },
  { value: 'high-angle', label: 'High Angle' },
];

// Default scene values
export const DEFAULT_SCENE_DURATION = 6; // seconds

// Empty scene template
export const emptySceneTemplate = {
  title: '',
  description: '',
  textToImagePrompt: '',
  imageToVideoPrompt: '',
  dialogue: [],
  cameraShot: 'medium' as CameraShot,
  duration: DEFAULT_SCENE_DURATION,
};
