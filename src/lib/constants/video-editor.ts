import type { TransitionType } from '@/types/project';

// Transition variants for Framer Motion
export const transitionVariants: Record<TransitionType, {
  initial: object;
  animate: object;
  exit: object;
}> = {
  none: { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideLeft: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 }
  },
  slideRight: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 }
  },
  slideUp: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 }
  },
  slideDown: {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 }
  },
  zoomIn: {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.5, opacity: 0 }
  },
  zoomOut: {
    initial: { scale: 1.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 }
  },
  swoosh: {
    initial: { x: '100%', rotate: -10, opacity: 0 },
    animate: { x: 0, rotate: 0, opacity: 1 },
    exit: { x: '-100%', rotate: 10, opacity: 0 }
  },
};

// Caption animation variants
export const captionAnimations: Record<string, {
  initial: object;
  animate: object;
  exit: object;
}> = {
  none: { initial: {}, animate: {}, exit: {} },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
  },
  typewriter: {
    initial: { opacity: 0, width: 0 },
    animate: { opacity: 1, width: 'auto' },
    exit: { opacity: 0 }
  },
  popIn: {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 }
  },
};

// Default caption style
export const defaultCaptionStyle = {
  fontSize: 'medium' as const,
  fontFamily: 'default' as const,
  color: '#ffffff',
  backgroundColor: 'rgba(0,0,0,0.7)',
  position: 'bottom' as const,
  textShadow: true,
};

// Font size mapping for captions
export const captionFontSizes = {
  small: '0.875rem',
  medium: '1.125rem',
  large: '1.5rem',
};

// Transition type labels for UI
export const transitionLabels: Record<TransitionType, string> = {
  none: 'None',
  fade: 'Fade',
  slideLeft: 'Slide Left',
  slideRight: 'Slide Right',
  slideUp: 'Slide Up',
  slideDown: 'Slide Down',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  swoosh: 'Swoosh',
};

// Default transition settings
export const DEFAULT_TRANSITION_TYPE: TransitionType = 'swoosh';
export const DEFAULT_TRANSITION_DURATION = 400; // 0.4 seconds

// Scene duration constant
export const SCENE_DURATION = 6; // seconds
