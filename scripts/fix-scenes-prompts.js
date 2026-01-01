const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PROJECT_ID = 'cmjsem9l10033oyy72roh82eq';

// Disney/Pixar style prefix
const STYLE_PREFIX = 'In a high-quality Disney/Pixar 3D animation style, with cute expressive faces and large emotional eyes, smooth stylized proportions, detailed skin textures, professional CGI lighting with soft volumetric effects, cinematic depth of field, vibrant saturated colors, and the polished look of a major animated feature film. ';

// Camera shot descriptions
const CAMERA_SHOTS = {
  'close-up': 'Close-up shot focusing on facial expressions and emotions',
  'medium': 'Medium shot showing characters from waist up with some background',
  'wide': 'Wide shot establishing the full scene and environment',
  'establishing': 'Establishing shot showing the complete setting',
};

// Character descriptions (from the database)
const CHARACTERS = {
  'Lena': 'Lena (14yo blonde girl with glasses, pink t-shirt and jeans)',
  'Nela': 'Nela (12yo dark-haired girl, energetic and playful)',
};

function generateTextToImagePrompt(scene) {
  const cameraDesc = CAMERA_SHOTS[scene.cameraShot] || CAMERA_SHOTS['medium'];

  // Build character string if any characters are in the scene
  let charString = '';
  if (scene.title.toLowerCase().includes('lena') || scene.description?.toLowerCase().includes('lena')) {
    charString += CHARACTERS['Lena'] + ', ';
  }
  if (scene.title.toLowerCase().includes('nela') || scene.description?.toLowerCase().includes('nela')) {
    charString += CHARACTERS['Nela'] + ', ';
  }
  // Default: include both main characters for most scenes
  if (!charString) {
    charString = `${CHARACTERS['Lena']} and ${CHARACTERS['Nela']}, `;
  }

  return `${STYLE_PREFIX}${cameraDesc}. ${charString}${scene.title}: ${scene.description || scene.title}. Warm, inviting atmosphere with soft lighting.`;
}

function generateImageToVideoPrompt(scene) {
  const movements = {
    'close-up': 'Subtle facial expressions, eyes blinking, slight head movements',
    'medium': 'Natural body language, gentle gestures, characters interacting',
    'wide': 'Dynamic scene with movement, characters walking or playing',
    'establishing': 'Slow pan across the scene, ambient movement in background',
  };
  return movements[scene.cameraShot] || movements['medium'];
}

// New scenes to add (59 and 60)
const NEW_SCENES = [
  {
    number: 59,
    title: 'Family Photo',
    description: 'Lena and Nela pose for a photo with Maciatko the kitten and Veverica the squirrel, all smiling at the camera',
    cameraShot: 'medium',
  },
  {
    number: 60,
    title: 'The End',
    description: 'Final scene showing Lena, Nela, Maciatko and Veverica watching the sunset together, best friends forever',
    cameraShot: 'wide',
  },
];

async function main() {
  console.log('Fetching scenes without prompts...');

  // Get all scenes
  const scenes = await prisma.scene.findMany({
    where: { projectId: PROJECT_ID },
    orderBy: { number: 'asc' },
  });

  const missingPrompts = scenes.filter(s => {
    const prompt = s.textToImagePrompt;
    return prompt === null || prompt === undefined || prompt.trim() === '';
  });

  console.log(`Found ${missingPrompts.length} scenes missing prompts`);

  // Update scenes with missing prompts
  for (const scene of missingPrompts) {
    const textToImagePrompt = generateTextToImagePrompt(scene);
    const imageToVideoPrompt = generateImageToVideoPrompt(scene);

    await prisma.scene.update({
      where: { id: scene.id },
      data: { textToImagePrompt, imageToVideoPrompt },
    });

    console.log(`Updated scene ${scene.number}: ${scene.title}`);
  }

  // Add new scenes
  console.log('\nAdding new scenes...');
  for (const newScene of NEW_SCENES) {
    const textToImagePrompt = generateTextToImagePrompt(newScene);
    const imageToVideoPrompt = generateImageToVideoPrompt(newScene);

    await prisma.scene.create({
      data: {
        projectId: PROJECT_ID,
        number: newScene.number,
        title: newScene.title,
        description: newScene.description,
        textToImagePrompt,
        imageToVideoPrompt,
        cameraShot: newScene.cameraShot,
        duration: 6,
        dialogue: [],
      },
    });

    console.log(`Created scene ${newScene.number}: ${newScene.title}`);
  }

  // Final count
  const finalCount = await prisma.scene.count({ where: { projectId: PROJECT_ID } });
  console.log(`\nTotal scenes now: ${finalCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
