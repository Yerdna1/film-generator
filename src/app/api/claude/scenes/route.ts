import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { spendCredits, COSTS, checkBalance } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import { callOpenRouter, DEFAULT_OPENROUTER_MODEL } from '@/lib/services/openrouter';
import { prisma } from '@/lib/db/prisma';

export const maxDuration = 120; // Allow up to 2 minutes for generation

// Dynamically import Claude SDK - only used when claude-sdk provider is selected
// This allows the app to work on Vercel even without Claude CLI installed
async function queryClaudeSDK(prompt: string, systemPrompt: string): Promise<string> {
  try {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    let fullResponse = '';

    const stream = query({
      prompt,
      options: {
        model: 'claude-sonnet-4-20250514',
        systemPrompt,
        maxTurns: 1,
        allowedTools: [],
      },
    });

    for await (const message of stream) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
          }
        }
      }
    }

    return fullResponse;
  } catch (error) {
    throw new Error(`Claude SDK error: ${error instanceof Error ? error.message : String(error)}. Make sure Claude CLI is installed and authenticated.`);
  }
}

// Query Modal LLM endpoint (self-hosted)
async function queryModalLLM(prompt: string, systemPrompt: string, endpoint: string): Promise<string> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        system_prompt: systemPrompt,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Modal LLM request failed: ${errorText}`);
    }

    const data = await response.json();

    // Handle various response formats from Modal endpoint
    if (data.response) {
      return data.response;
    } else if (data.text) {
      return data.text;
    } else if (data.content) {
      return data.content;
    } else if (typeof data === 'string') {
      return data;
    }

    throw new Error('Modal endpoint did not return expected response format');
  } catch (error) {
    throw new Error(`Modal LLM error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface GenerateScenesRequest {
  projectId: string;
  story: {
    title: string;
    concept: string;
    genre: string;
    tone: string;
    setting: string;
  };
  characters: Array<{
    id: string;
    name: string;
    description: string;
    masterPrompt: string;
  }>;
  style: string;
  sceneCount: number;
}

// POST - Generate scenes using Claude Agent SDK
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: GenerateScenesRequest = await request.json();
    const { projectId, story, characters, style, sceneCount } = body;

    // Pre-check credit balance before starting generation
    // Cost is per scene, so multiply by scene count
    const totalCost = COSTS.SCENE_GENERATION * sceneCount;
    const balanceCheck = await checkBalance(session.user.id, totalCost);
    if (!balanceCheck.hasEnough) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: balanceCheck.required,
        balance: balanceCheck.balance,
        needsPurchase: true,
      }, { status: 402 });
    }

    if (!story.concept || characters.length === 0) {
      return NextResponse.json(
        { error: 'Story concept and characters are required' },
        { status: 400 }
      );
    }

    // Build the prompt for scene generation - include FULL master prompts for consistency
    const characterDescriptions = characters
      .map((c) => `[${c.name.toUpperCase()}] Master Prompt:\n${c.masterPrompt || c.description}`)
      .join('\n\n');

    const characterNames = characters.map((c) => c.name).join(' and ');

    const styleMapping: Record<string, string> = {
      'disney-pixar': 'high-quality Disney/Pixar 3D animation style',
      'realistic': 'photorealistic cinematic style with real people',
      'anime': 'high-quality Japanese anime style',
      'custom': 'custom artistic style',
    };

    const styleDescription = styleMapping[style] || styleMapping['disney-pixar'];

    // Fetch user's API keys and LLM provider preference
    const userApiKeys = await prisma.apiKeys.findUnique({
      where: { userId: session.user.id },
    });

    // Default to OpenRouter if no preference set
    const llmProvider = userApiKeys?.llmProvider || 'openrouter';
    const openRouterApiKey = userApiKeys?.openRouterApiKey || process.env.OPENROUTER_API_KEY;
    const openRouterModel = userApiKeys?.openRouterModel || DEFAULT_OPENROUTER_MODEL;
    const modalLlmEndpoint = userApiKeys?.modalLlmEndpoint;

    // Validate API key/endpoint for selected provider
    if (llmProvider === 'openrouter' && !openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is required. Please configure it in Settings.' },
        { status: 400 }
      );
    }

    if (llmProvider === 'modal' && !modalLlmEndpoint) {
      return NextResponse.json(
        { error: 'Modal LLM endpoint is required. Please configure it in Settings.' },
        { status: 400 }
      );
    }

    const prompt = `Generate a complete ${sceneCount}-scene breakdown for a 3D animated short film.

STORY CONCEPT: "${story.concept}"
TITLE: "${story.title || 'Untitled'}"
GENRE: ${story.genre || 'adventure'}
TONE: ${story.tone || 'heartfelt'}
SETTING: ${story.setting || 'various locations'}
STYLE: ${styleDescription}

CHARACTER MASTER PROMPTS (CRITICAL - include these EXACT descriptions in EVERY scene's textToImagePrompt for visual consistency):
${characterDescriptions}

CRITICAL CAMERA RULE: Do not generate wide landscape shots where characters are tiny. You must prioritize Medium Shots (waist up) and Close-ups (face focus) so the characters are large, detailed, and fill the frame.

For each scene, provide EXACTLY this format (use JSON array):

[
  {
    "number": 1,
    "title": "Scene Title",
    "cameraShot": "medium" or "close-up",
    "textToImagePrompt": "CHARACTERS (use exact descriptions):\\n[CHARACTER_NAME]: [paste their full master prompt here]\\n\\nSCENE: Medium Shot of... or Close-up of... [detailed visual description]. Characters are large and clearly visible in the foreground. ${styleDescription}.",
    "imageToVideoPrompt": "[Movement and facial expression description. Include subtle animations and emotional reactions.]",
    "dialogue": [
      { "characterName": "CharacterName", "text": "Dialogue line..." }
    ]
  }
]

IMPORTANT: In each textToImagePrompt, you MUST include the full character master prompts at the beginning, followed by the scene description. This ensures visual consistency across all scenes.

Generate exactly ${sceneCount} scenes. Each scene should:
1. Include ALL character master prompts at the beginning of textToImagePrompt
2. Start scene description with "Medium Shot of..." or "Close-up of..."
3. Feature ${characterNames} prominently in the foreground
4. Include dialogue for at least one character
5. Progress the story naturally

Return ONLY the JSON array, no other text.`;

    const systemPrompt = 'You are a professional film director and screenwriter specializing in animated short films. Generate detailed scene breakdowns in the exact JSON format requested. Return ONLY valid JSON, no markdown code blocks or explanations.';

    // Call LLM based on provider preference
    let fullResponse = '';

    console.log(`[LLM] Using provider: ${llmProvider}`);

    if (llmProvider === 'modal') {
      // Use Modal self-hosted LLM endpoint
      fullResponse = await queryModalLLM(prompt, systemPrompt, modalLlmEndpoint!);
    } else if (llmProvider === 'openrouter') {
      // Use OpenRouter API (works on Vercel and everywhere)
      fullResponse = await callOpenRouter(
        openRouterApiKey!,
        systemPrompt,
        prompt,
        openRouterModel,
        8192
      );
    } else {
      // Use Claude SDK/CLI (requires local Claude CLI installation)
      fullResponse = await queryClaudeSDK(prompt, systemPrompt);
    }

    // Parse the JSON response
    let scenes;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanResponse = fullResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      cleanResponse = cleanResponse.trim();

      scenes = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', fullResponse);
      return NextResponse.json(
        { error: 'Failed to parse generated scenes', raw: fullResponse },
        { status: 500 }
      );
    }

    // Map character names to IDs
    const scenesWithIds = scenes.map((scene: any) => ({
      ...scene,
      dialogue: scene.dialogue?.map((line: any) => {
        const character = characters.find(
          (c) => c.name.toLowerCase() === line.characterName?.toLowerCase()
        );
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          characterId: character?.id || characters[0]?.id || '',
          characterName: line.characterName || 'Unknown',
          text: line.text || '',
        };
      }) || [],
    }));

    // Track cost for scene generation - use actual costs for all providers
    let realCost: number;
    if (llmProvider === 'modal') {
      realCost = ACTION_COSTS.scene.modal * sceneCount; // ~$0.002 per scene
    } else {
      realCost = ACTION_COSTS.scene.claude * sceneCount; // ~$0.01 per scene
    }
    const providerName = llmProvider === 'modal' ? 'modal' : (llmProvider === 'openrouter' ? 'openrouter' : 'claude');
    await spendCredits(
      session.user.id,
      COSTS.SCENE_GENERATION * sceneCount,
      'scene',
      `${providerName} scene generation (${sceneCount} scenes)`,
      projectId,
      providerName,
      undefined,  // metadata
      realCost    // pass the total real cost for all scenes
    );

    return NextResponse.json({ scenes: scenesWithIds, cost: realCost, provider: llmProvider });
  } catch (error) {
    console.error('Error generating scenes with Claude:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenes', details: String(error) },
      { status: 500 }
    );
  }
}
