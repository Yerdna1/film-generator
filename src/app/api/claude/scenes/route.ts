import { NextRequest, NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { auth } from '@/lib/auth';
import { spendCredits, COSTS } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';

export const maxDuration = 120; // Allow up to 2 minutes for generation

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

    // Call Claude Agent SDK - it will use CLI auth if no API key is set
    let fullResponse = '';

    const stream = query({
      prompt,
      options: {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: 'You are a professional film director and screenwriter specializing in animated short films. Generate detailed scene breakdowns in the exact JSON format requested. Return ONLY valid JSON, no markdown code blocks or explanations.',
        maxTurns: 1,
        allowedTools: [], // No tools needed for text generation
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

    // Track cost for scene generation
    const realCost = ACTION_COSTS.scene.claude * sceneCount;
    await spendCredits(
      session.user.id,
      COSTS.SCENE_GENERATION * sceneCount,
      'scene',
      `Claude scene generation (${sceneCount} scenes)`,
      projectId,
      'claude',
      undefined,  // metadata
      realCost    // pass the total real cost for all scenes
    );

    return NextResponse.json({ scenes: scenesWithIds, cost: realCost });
  } catch (error) {
    console.error('Error generating scenes with Claude:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenes', details: String(error) },
      { status: 500 }
    );
  }
}
