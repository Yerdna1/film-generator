import type { StoryConfig, Character, Scene, StylePreset, ProjectSettings } from '@/types/project';
import { getStylePreset } from './style-presets';

export interface GeneratedPromptPackage {
  masterPrompt: string;
  characters: Character[];
  scenes: Scene[];
}

export function generateMasterPrompt(
  story: StoryConfig,
  style: StylePreset,
  settings: ProjectSettings
): string {
  const styleConfig = getStylePreset(style);

  return `Generate a complete creative package for a ${settings.sceneCount}-scene ${
    style === 'disney-pixar'
      ? '3D Animated'
      : style === 'realistic'
      ? 'Cinematic'
      : style === 'anime'
      ? 'Anime'
      : ''
  } Short Film.

Style: ${styleConfig.promptPrefix}${styleConfig.promptSuffix}

Story Concept: "${story.title}" — ${story.concept}

Genre: ${story.genre}
Tone: ${story.tone}
Setting: ${story.setting}

INSTRUCTIONS FOR CONSISTENCY & SCALE:

1. Define Characters Once: Use Master Prompts below for each character.

2. CRITICAL CAMERA RULE: Do not generate wide landscape shots where characters are tiny. You must prioritize Medium Shots (waist up) and Close-ups (face focus) so the characters are large, detailed, and fill the frame.

Step 1: Master Character Prompts
Write ${settings.characterCount} highly detailed Text-to-Image prompts to establish the look of each character. Each character should have:
- Detailed visual description
- Clothing and accessories
- Personality traits reflected in appearance
- Style: ${styleConfig.defaultCharacterStyle}

Step 2: Scene Breakdown
Generate the ${settings.sceneCount}-scene script. For each scene, provide these two outputs:

IMPORTANT: For every scene, specify "Medium Shot" or "Close-up" to keep characters large.

(Text-to-Image Prompt): Describe the visual action. Start the prompt with "Medium Shot of..." or "Close up of..." ensuring characters are large and clearly visible in the foreground.

(Image-to-Video Prompt): Describe the movement and facial expressions. Include character dialogue here.

Output Format:
- Master Character Prompts (one per character)
- Scene breakdown with Text-to-Image and Image-to-Video prompts for each scene
- Dialogue for each scene`;
}

export function generateCharacterPrompt(
  character: Partial<Character>,
  style: StylePreset
): string {
  const styleConfig = getStylePreset(style);

  return `${character.name} ${styleConfig.defaultCharacterStyle}. ${character.visualDescription || character.description}. ${styleConfig.promptSuffix}`;
}

export function generateSceneTextToImagePrompt(
  scene: Partial<Scene>,
  characters: Character[],
  style: StylePreset
): string {
  const styleConfig = getStylePreset(style);
  const characterNames = characters.map((c) => c.name).join(' and ');

  const cameraShot =
    scene.cameraShot === 'close-up'
      ? 'Close-up of'
      : scene.cameraShot === 'wide'
      ? 'Wide shot of'
      : 'Medium Shot of';

  return `${cameraShot} ${characterNames} ${scene.description} ${styleConfig.defaultSceneStyle}. Characters are large and clearly visible in the foreground. ${styleConfig.promptSuffix}`;
}

export function generateScenePrompt(
  sceneInput: { title: string; description: string; cameraShot: string },
  style: StylePreset,
  characters: Character[]
): { textToImagePrompt: string; imageToVideoPrompt: string } {
  const styleConfig = getStylePreset(style);

  const cameraShotText =
    sceneInput.cameraShot === 'close-up'
      ? 'Close-up of'
      : sceneInput.cameraShot === 'extreme-close-up'
      ? 'Extreme close-up of'
      : sceneInput.cameraShot === 'wide'
      ? 'Wide shot of'
      : sceneInput.cameraShot === 'over-shoulder'
      ? 'Over-the-shoulder shot of'
      : sceneInput.cameraShot === 'pov'
      ? 'POV shot showing'
      : sceneInput.cameraShot === 'aerial'
      ? 'Aerial shot of'
      : sceneInput.cameraShot === 'low-angle'
      ? 'Low angle shot of'
      : sceneInput.cameraShot === 'high-angle'
      ? 'High angle shot of'
      : 'Medium shot of';

  // Build character descriptions for consistency
  // Include full visual description for each character to maintain consistency across scenes
  const characterDescriptions = characters
    .map((c) => {
      // Use the character's master prompt if available, otherwise build from description
      if (c.masterPrompt) {
        return `[${c.name.toUpperCase()}]: ${c.masterPrompt}`;
      }
      return `[${c.name.toUpperCase()}]: ${c.visualDescription || c.description || c.name}`;
    })
    .join('\n\n');

  const characterNames = characters.map((c) => c.name).join(' and ');

  // Include character master prompts in the scene prompt for AI consistency
  const textToImagePrompt = `CHARACTERS (use these exact descriptions for consistency):
${characterDescriptions}

SCENE: ${cameraShotText} ${characterNames} in "${sceneInput.title}". ${sceneInput.description}. ${styleConfig.defaultSceneStyle}. Characters are large and clearly visible in the foreground. ${styleConfig.promptSuffix}`;

  const imageToVideoPrompt = `Scene: ${sceneInput.title}
${sceneInput.description}

Movement: Characters show subtle movements, expressions, and interactions appropriate to the scene.
Camera: ${sceneInput.cameraShot} with slight cinematic motion.
Duration: 6 seconds.`;

  return { textToImagePrompt, imageToVideoPrompt };
}

export function generateSceneImageToVideoPrompt(scene: Partial<Scene>): string {
  const dialogueText = scene.dialogue
    ?.map((d) => `${d.characterName}: "${d.text}"`)
    .join('\n');

  return `${scene.description}

Movement: Characters show subtle movements and expressions.

${dialogueText ? `Dialogue:\n${dialogueText}` : ''}`;
}

export function formatCharacterForExport(character: Character): string {
  return `CHARACTER: ${character.name}

Text-to-Image Prompt:
${character.masterPrompt}
`;
}

export function formatSceneForExport(scene: Scene): string {
  const dialogueText = scene.dialogue
    .map((d) => `${d.characterName}: "${d.text}"`)
    .join('\n');

  return `SCENE ${scene.number}: ${scene.title}

Text-to-Image Prompt:
${scene.textToImagePrompt}

Image-to-Video Prompt:
${scene.imageToVideoPrompt}

Dialogue:
${dialogueText}
`;
}

// Generate sample scenes based on story concept
export function generateSampleScenes(
  story: StoryConfig,
  style: StylePreset,
  characters: Character[],
  sceneCount: number
): Omit<Scene, 'id'>[] {
  const styleConfig = getStylePreset(style);
  const characterNames = characters.map((c) => c.name);
  const mainCharacter = characterNames[0] || 'the protagonist';
  const secondaryCharacter = characterNames[1] || 'companion';

  // Generate scene templates based on story structure
  const sceneTemplates = [
    {
      title: 'The Beginning',
      description: `${mainCharacter} in ${story.setting}, establishing the world and introducing the main character`,
      cameraShot: 'medium' as const,
      dialogueTemplates: [{ character: mainCharacter, text: 'This is where our story begins...' }],
    },
    {
      title: 'Introduction',
      description: `${mainCharacter} goes about daily life, showing personality and environment`,
      cameraShot: 'medium' as const,
      dialogueTemplates: [],
    },
    {
      title: 'The Meeting',
      description: `${mainCharacter} encounters ${secondaryCharacter} for the first time`,
      cameraShot: 'medium' as const,
      dialogueTemplates: characterNames.length > 1
        ? [{ character: secondaryCharacter, text: 'Hello there!' }]
        : [],
    },
    {
      title: 'The Discovery',
      description: `${mainCharacter} discovers something unexpected that sets the story in motion`,
      cameraShot: 'close-up' as const,
      dialogueTemplates: [{ character: mainCharacter, text: 'What is this...?' }],
    },
    {
      title: 'First Challenge',
      description: `${mainCharacter} faces the first obstacle or challenge`,
      cameraShot: 'medium' as const,
      dialogueTemplates: [],
    },
    {
      title: 'Growing Bond',
      description: `${mainCharacter} and ${secondaryCharacter} develop their relationship`,
      cameraShot: 'medium' as const,
      dialogueTemplates: characterNames.length > 1
        ? [
            { character: mainCharacter, text: 'I never expected to find a friend like you.' },
            { character: secondaryCharacter, text: 'Neither did I.' },
          ]
        : [],
    },
    {
      title: 'The Setback',
      description: `Things take a turn for the worse, conflict arises`,
      cameraShot: 'medium' as const,
      dialogueTemplates: [{ character: mainCharacter, text: 'No, this can\'t be happening!' }],
    },
    {
      title: 'Moment of Doubt',
      description: `${mainCharacter} questions whether to continue`,
      cameraShot: 'close-up' as const,
      dialogueTemplates: [{ character: mainCharacter, text: 'Maybe I should just give up...' }],
    },
    {
      title: 'The Turning Point',
      description: `${mainCharacter} finds renewed determination`,
      cameraShot: 'close-up' as const,
      dialogueTemplates: [{ character: mainCharacter, text: 'No. I won\'t give up. Not now.' }],
    },
    {
      title: 'The Climax',
      description: `The final confrontation or challenge`,
      cameraShot: 'wide' as const,
      dialogueTemplates: [],
    },
    {
      title: 'Resolution',
      description: `The outcome of the climax, showing the result`,
      cameraShot: 'medium' as const,
      dialogueTemplates: [],
    },
    {
      title: 'The End',
      description: `${mainCharacter} reflects on the journey, final moments`,
      cameraShot: 'close-up' as const,
      dialogueTemplates: [{ character: mainCharacter, text: 'And so our story ends... for now.' }],
    },
  ];

  // Repeat or trim templates to match desired scene count
  const scenes: Omit<Scene, 'id'>[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const template = sceneTemplates[i % sceneTemplates.length];
    const sceneNum = i + 1;

    const { textToImagePrompt, imageToVideoPrompt } = generateScenePrompt(
      {
        title: template.title,
        description: template.description,
        cameraShot: template.cameraShot,
      },
      style,
      characters
    );

    // Generate dialogue with proper IDs
    const dialogue = template.dialogueTemplates.map((d, idx) => {
      const char = characters.find((c) => c.name === d.character);
      return {
        id: `scene-${sceneNum}-dialogue-${idx}`,
        characterId: char?.id || '',
        characterName: d.character,
        text: d.text,
      };
    });

    scenes.push({
      number: sceneNum,
      title: `Scene ${sceneNum}: ${template.title}`,
      description: template.description,
      textToImagePrompt,
      imageToVideoPrompt,
      dialogue,
      cameraShot: template.cameraShot,
      duration: 6,
    });
  }

  return scenes;
}

export function exportProjectAsMarkdown(
  story: StoryConfig,
  characters: Character[],
  scenes: Scene[],
  style: StylePreset
): string {
  const styleConfig = getStylePreset(style);

  let markdown = `# ${story.title}

## Project Details
- **Genre**: ${story.genre}
- **Tone**: ${story.tone}
- **Setting**: ${story.setting}
- **Style**: ${styleConfig.nameKey}

## Story Concept
${story.concept}

---

## Master Character Prompts

`;

  characters.forEach((character) => {
    markdown += formatCharacterForExport(character) + '\n---\n\n';
  });

  markdown += `## Scene Breakdown

`;

  scenes.forEach((scene) => {
    markdown += formatSceneForExport(scene) + '\n---\n\n';
  });

  return markdown;
}
