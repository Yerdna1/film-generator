// Video Composition - Cost Calculation Utilities

import { COSTS } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { CompositionCost } from '../types';

/**
 * Calculate the cost of video composition based on various factors
 */
export function calculateCompositionCost(
  sceneCount: number,
  includeMusic: boolean,
  includeCaptions: boolean,
  captionCount: number,
  resolution: 'sd' | 'hd' | '4k'
): CompositionCost {
  // Base cost per scene
  let credits = sceneCount * (COSTS.VIDEO_COMPOSITION_BASE || 5);
  let realCost = sceneCount * (ACTION_COSTS.videoComposition?.modal || 0.03);

  // Music overlay
  if (includeMusic) {
    credits += COSTS.VIDEO_COMPOSITION_MUSIC || 2;
    realCost += 0.02;
  }

  // Caption burn-in (1 credit per 10 captions)
  if (includeCaptions && captionCount > 0) {
    credits += Math.ceil(captionCount / 10) * (COSTS.VIDEO_COMPOSITION_CAPTION || 1);
    realCost += captionCount * 0.001;
  }

  // 4K resolution multiplier
  if (resolution === '4k') {
    credits *= 2;
    realCost *= 1.5;
  }

  return { credits, realCost };
}
