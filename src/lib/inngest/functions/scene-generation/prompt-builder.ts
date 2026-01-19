import type { StoryData, Character } from './types';
import { STYLE_MAPPING } from './constants';

export function buildCharacterDescriptions(characters: Character[]): string {
  return characters
    .map((c) => `[${c.name.toUpperCase()}] Master Prompt:\n${c.masterPrompt || c.description}`)
    .join('\n\n');
}

export function getCharacterNames(characters: Character[]): string {
  return characters.map((c) => c.name).join(' and ');
}

export function getStyleDescription(style: string): string {
  return STYLE_MAPPING[style] || STYLE_MAPPING['disney-pixar'];
}

export function buildSceneGenerationPrompt(options: {
  startScene: number;
  endScene: number;
  batchSize: number;
  story: StoryData;
  styleDescription: string;
  characterDescriptions: string;
  characterNames: string;
  sceneCount: number;
  batchIndex: number;
  totalBatches: number;
}): string {
  const {
    startScene,
    endScene,
    batchSize,
    story,
    styleDescription,
    characterDescriptions,
    characterNames,
    sceneCount,
    batchIndex,
    totalBatches,
  } = options;

  return `Generate scenes ${startScene} to ${endScene} (${batchSize} scenes) for a 3D animated short film.

STORY CONCEPT: "${story.concept}"
TITLE: "${story.title || 'Untitled'}"
GENRE: ${story.genre || 'adventure'}
TONE: ${story.tone || 'heartfelt'}
SETTING: ${story.setting || 'various locations'}
STYLE: ${styleDescription}
TOTAL FILM LENGTH: ${sceneCount} scenes

CHARACTER MASTER PROMPTS (CRITICAL - include these EXACT descriptions in EVERY scene's textToImagePrompt):
${characterDescriptions}

${batchIndex > 0 ? `CONTEXT: This is batch ${batchIndex + 1} of ${totalBatches}. Continue the story from scene ${startScene}. Maintain narrative continuity.` : ''}

CRITICAL CAMERA RULE: Prioritize Medium Shots (waist up) and Close-ups (face focus) so characters are large and fill the frame.

For each scene, provide EXACTLY this format (JSON array):

[
  {
    "number": ${startScene},
    "title": "Scene Title",
    "cameraShot": "medium" or "close-up",
    "textToImagePrompt": "CHARACTERS:\\n[CHARACTER_NAME]: [full master prompt]\\n\\nSCENE: Medium Shot of... [detailed description]. ${styleDescription}.",
    "imageToVideoPrompt": "[Movement and expression description]",
    "dialogue": [
      { "characterName": "CharacterName", "text": "Dialogue..." }
    ]
  }
]

Generate exactly ${batchSize} scenes (numbered ${startScene} to ${endScene}). Each scene should:
1. Include ALL character master prompts in textToImagePrompt
2. Feature ${characterNames} prominently
3. Include dialogue for at least one character
4. Progress the story naturally${batchIndex > 0 ? ' from where the previous batch ended' : ''}

Return ONLY the JSON array.`;
}
