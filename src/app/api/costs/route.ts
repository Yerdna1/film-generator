// Action Costs API - Read-only endpoint to display costs to users
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheTTL } from '@/lib/cache';

// Cache key for action costs
const COSTS_CACHE_KEY = 'global:action-costs';

export interface ActionCostResponse {
  actionType: string;
  provider: string;
  cost: number;
  description: string | null;
}

export interface GroupedCosts {
  image: ActionCostResponse[];
  video: ActionCostResponse[];
  voiceover: ActionCostResponse[];
  scene: ActionCostResponse[];
  character: ActionCostResponse[];
  prompt: ActionCostResponse[];
}

// GET - Fetch all action costs (read-only, cached for 6 hours)
export async function GET() {
  try {
    // Check cache first
    const cachedCosts = cache.get<GroupedCosts>(COSTS_CACHE_KEY);
    if (cachedCosts) {
      console.log('[Cache HIT] Action costs');
      return NextResponse.json({
        costs: cachedCosts,
        cached: true,
      });
    }

    console.log('[Cache MISS] Fetching action costs from DB');

    // Fetch all active costs from database
    const costs = await prisma.actionCost.findMany({
      where: { isActive: true },
      orderBy: [
        { actionType: 'asc' },
        { provider: 'asc' },
      ],
    });

    // Group by action type
    const grouped: GroupedCosts = {
      image: [],
      video: [],
      voiceover: [],
      scene: [],
      character: [],
      prompt: [],
    };

    for (const cost of costs) {
      const actionType = cost.actionType as keyof GroupedCosts;
      if (grouped[actionType]) {
        grouped[actionType].push({
          actionType: cost.actionType,
          provider: cost.provider,
          cost: cost.cost,
          description: cost.description,
        });
      }
    }

    // Cache for 6 hours (costs rarely change)
    cache.set(COSTS_CACHE_KEY, grouped, cacheTTL.VERY_LONG);

    return NextResponse.json({
      costs: grouped,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching action costs:', error);

    // Return hardcoded fallback costs if database is unavailable
    const fallbackCosts: GroupedCosts = {
      image: [
        { actionType: 'image', provider: 'gemini', cost: 0.04, description: 'Gemini 3 Pro image generation' },
        { actionType: 'image', provider: 'nanoBanana', cost: 0.04, description: 'Nano Banana image generation' },
      ],
      video: [
        { actionType: 'video', provider: 'grok', cost: 0.10, description: 'Grok Imagine video generation (6s)' },
        { actionType: 'video', provider: 'kie', cost: 0.10, description: 'Kie.ai video generation (6s)' },
      ],
      voiceover: [
        { actionType: 'voiceover', provider: 'elevenlabs', cost: 0.03, description: 'ElevenLabs TTS per line (~100 chars)' },
        { actionType: 'voiceover', provider: 'gemini', cost: 0.002, description: 'Gemini TTS per line (~100 chars)' },
      ],
      scene: [
        { actionType: 'scene', provider: 'gemini', cost: 0.001, description: 'Gemini scene description' },
        { actionType: 'scene', provider: 'claude', cost: 0.005, description: 'Claude scene description' },
        { actionType: 'scene', provider: 'grok', cost: 0.003, description: 'Grok scene description' },
      ],
      character: [
        { actionType: 'character', provider: 'gemini', cost: 0.0005, description: 'Gemini character description' },
        { actionType: 'character', provider: 'claude', cost: 0.002, description: 'Claude character description' },
      ],
      prompt: [
        { actionType: 'prompt', provider: 'gemini', cost: 0.001, description: 'Gemini master prompt' },
        { actionType: 'prompt', provider: 'claude', cost: 0.005, description: 'Claude master prompt' },
      ],
    };

    return NextResponse.json({
      costs: fallbackCosts,
      fallback: true,
      error: 'Database unavailable, using fallback costs',
    });
  }
}
