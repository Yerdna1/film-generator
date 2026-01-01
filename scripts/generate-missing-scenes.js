const { spawnSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PROJECT_ID = 'cmjsem9l10033oyy72roh82eq';
const LENA_ID = 'cmjserkq8003loyy7d0n4yf0k';
const NELA_ID = 'cmjsesrma003royy7ikn556t5';

const prompt = `Generate 23 scenes (numbered 10-32) for a Disney/Pixar style animated short film about two girls (Lena and Nela) bonding with a kitten named Maciatko.

Context:
- Scene 9: "First Pet" - Nela gently petting the kitten while Lena watches with delight
- Scene 33: "Maciatko's Treat" - Lena placing a treat for Maciatko who eats eagerly

The missing scenes 10-32 should show:
- The girls naming the kitten "Maciatko"
- Playing with the kitten
- Taking care of it (feeding, sleeping)
- Meeting a squirrel friend (Veverica)
- Some tennis scenes mixed in
- Building friendship between the girls and animals

Characters:
- Lena: 14yo blonde with glasses, pink t-shirt and jeans
- Nela: 12yo dark hair, sometimes wears cap

Output ONLY valid JSON array with this exact format:
[
  {
    "number": 10,
    "title": "Scene Title",
    "description": "Brief scene description",
    "cameraShot": "medium|close-up|wide|establishing",
    "imageToVideoPrompt": "Camera movement and action description",
    "dialogue": [
      {"characterName": "Lena", "text": "Slovak dialogue"},
      {"characterName": "Nela", "text": "Slovak dialogue"}
    ]
  }
]

Generate all 23 scenes (10-32). Dialogue must be in Slovak language. Keep scenes varied - some at tennis court, some at home, introduce Veverica around scene 20.`;

async function main() {
  console.log('Generating scenes with Claude CLI...');
  
  const claudePath = '/Users/andrejpt/.nvm/versions/node/v22.21.1/bin/claude';
  const cleanEnv = { ...process.env };
  delete cleanEnv.ANTHROPIC_API_KEY;
  
  const result = spawnSync(claudePath, ['-p', '--output-format', 'text'], {
    input: prompt,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    timeout: 300000,
    env: { ...cleanEnv, PATH: process.env.PATH + ':/Users/andrejpt/.nvm/versions/node/v22.21.1/bin', HOME: '/Users/andrejpt' },
    cwd: '/Volumes/DATA/Python/film-generator',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Claude CLI failed: ' + result.stderr);

  // Extract JSON from response
  let response = result.stdout;
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  
  const scenes = JSON.parse(jsonMatch[0]);
  console.log('Generated', scenes.length, 'scenes');

  // Insert scenes into database
  for (const scene of scenes) {
    const dialogue = scene.dialogue.map((d, i) => ({
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      text: d.text,
      characterId: d.characterName === 'Lena' ? LENA_ID : NELA_ID,
      characterName: d.characterName
    }));

    await prisma.scene.create({
      data: {
        projectId: PROJECT_ID,
        number: scene.number,
        title: scene.title,
        description: scene.description || '',
        textToImagePrompt: '',
        imageToVideoPrompt: scene.imageToVideoPrompt || '',
        cameraShot: scene.cameraShot || 'medium',
        duration: 6,
        dialogue: dialogue,
      }
    });
    console.log('Created scene', scene.number, '-', scene.title);
  }

  const count = await prisma.scene.count({ where: { projectId: PROJECT_ID } });
  console.log('\nTotal scenes now:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
