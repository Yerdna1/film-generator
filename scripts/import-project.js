// Import project from local folder to database
const { Client } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load env
require('dotenv').config({ path: '.env.local' });

const destDb = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_0c5LeAwahPry@ep-hidden-meadow-ag73hwfb-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const destUserId = 'cmjsdxepp0000oyqgn471ofdt'; // andrej.galad@gmail.com

// S3 config
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || 'film-generator-assets';

// Project data
const projectData = {
  name: 'The Desert Search',
  style: 'Disney/Pixar 3D',
  story: `A young boy and his best friend (a furry purple monster named Fuzzy) are driving their white delivery truck across a vast, hot desert. They are frantic, looking for their lost friend.`,
  masterPrompt: 'High-quality Disney/Pixar 3D animation style, cinematic lighting, detailed textures, polished render',
  characters: [
    {
      name: 'The Boy',
      description: 'A 12-year-old boy, the main character',
      visualDescription: 'A 12-year-old boy in a high-quality Disney/Pixar 3D animation style, shown with a cute, expressive face and large, emotional eyes. He has slightly messy medium-brown hair that falls naturally over his forehead. His skin is warm-toned and sun-kissed from travel. He wears a bright blue delivery utility vest with visible stitching, small pockets, and a simple logo, over a light shirt, casual shorts, and worn sneakers.',
      imageFile: 'BOY.jpeg',
    },
    {
      name: 'Fuzzy',
      description: 'A cute purple furry monster, best friend of The Boy',
      visualDescription: 'A cute, purple furry monster in a high-quality Disney/Pixar 3D animation style. He has thick, fluffy purple fur with subtle color variation and softness, large expressive eyes full of emotion, and a round, lovable face. His body is small and slightly chubby, designed to feel huggable and friendly. He wears a matching blue delivery vest tailored for his shape.',
      imageFile: 'FUZZY.jpeg',
    },
  ],
  scenes: [
    {
      number: 1,
      title: 'The Heat Sets In',
      description: 'The Boy and Fuzzy sit inside a white delivery truck cabin, framed waist-up through the windshield. The desert sun blazes outside.',
      textToImagePrompt: 'Medium Shot of The Boy and Fuzzy sitting inside a white delivery truck cabin, framed waist-up through the windshield. The desert sun blazes outside, heat shimmer visible. The Boy grips the steering wheel tightly while Fuzzy leans forward nervously.',
      imageToVideoPrompt: 'The truck gently vibrates as it moves. The Boy squints forward, jaw tense. Fuzzy wipes imaginary sweat from his brow.',
      dialogue: [
        { character: 'Boy', text: 'He should\'ve met us hours ago…' },
        { character: 'Fuzzy', text: 'What if he took a wrong road?' },
      ],
    },
    {
      number: 2,
      title: 'Growing Worry',
      description: 'Close-up of The Boy\'s face inside the truck, sweat on his forehead, eyes scanning the horizon.',
      textToImagePrompt: 'Close-up of The Boy\'s face inside the truck, sweat on his forehead, eyes scanning the horizon reflected in the windshield.',
      imageToVideoPrompt: 'His eyes dart side to side, lips tightening with worry.',
      dialogue: [{ character: 'Boy', text: 'We\'re not giving up.' }],
    },
    {
      number: 3,
      title: 'Fuzzy Tries Humor',
      description: 'Close-up of Fuzzy in the passenger seat, his purple fur slightly frazzled by heat.',
      textToImagePrompt: 'Close-up of Fuzzy in the passenger seat, his purple fur slightly frazzled by heat, forcing a nervous smile.',
      imageToVideoPrompt: 'Fuzzy grins, then frowns when the joke lands flat.',
      dialogue: [{ character: 'Fuzzy', text: 'Hey… worst case, we invent a new desert delivery record?' }],
    },
    {
      number: 4,
      title: 'The Empty Road',
      description: 'The Boy and Fuzzy inside the truck, both leaning forward, eyes wide, scanning the road ahead.',
      textToImagePrompt: 'Medium Shot of The Boy and Fuzzy inside the truck, both leaning forward, eyes wide, scanning the road ahead.',
      imageToVideoPrompt: 'The Boy slows the truck. Fuzzy presses his face to the glass.',
      dialogue: [
        { character: 'Fuzzy', text: 'I don\'t like how quiet it is.' },
        { character: 'Boy', text: 'Me neither.' },
      ],
    },
    {
      number: 5,
      title: 'A Sign of Hope',
      description: 'Close-up of The Boy\'s face as his eyes suddenly light up.',
      textToImagePrompt: 'Close-up of The Boy\'s face as his eyes suddenly light up, reflected sunlight flashing across his pupils.',
      imageToVideoPrompt: 'His expression shifts from fear to hope.',
      dialogue: [{ character: 'Boy', text: 'Wait… did you see that?' }],
    },
    {
      number: 6,
      title: 'Fuzzy Spots It',
      description: 'Close-up of Fuzzy pointing excitedly forward, mouth open, eyes wide.',
      textToImagePrompt: 'Close-up of Fuzzy pointing excitedly forward, mouth open, eyes wide.',
      imageToVideoPrompt: 'Fuzzy bounces in his seat, fur rippling.',
      dialogue: [{ character: 'Fuzzy', text: 'YES! Over there! Something blue!' }],
    },
    {
      number: 7,
      title: 'Pulling Over',
      description: 'The Boy and Fuzzy jumping out of the truck, desert wind blowing.',
      textToImagePrompt: 'Medium Shot of The Boy and Fuzzy jumping out of the truck, framed waist-up, desert wind blowing their clothes and fur.',
      imageToVideoPrompt: 'They land on the sand, turning quickly toward the distance.',
      dialogue: [{ character: 'Boy', text: 'Stay close.' }],
    },
    {
      number: 8,
      title: 'Calling Out',
      description: 'The Boy cupping his hands and shouting, Fuzzy beside him looking anxious.',
      textToImagePrompt: 'Medium Shot of The Boy cupping his hands and shouting, Fuzzy beside him looking anxious.',
      imageToVideoPrompt: 'Their voices echo faintly. Fuzzy\'s ears droop.',
      dialogue: [
        { character: 'Boy', text: 'Hello?!' },
        { character: 'Fuzzy', text: 'We\'re here!' },
      ],
    },
    {
      number: 9,
      title: 'The Response',
      description: 'Close-up of both characters reacting—eyes widening at the same time.',
      textToImagePrompt: 'Close-up of both characters reacting—eyes widening at the same time.',
      imageToVideoPrompt: 'They freeze, then turn toward a distant sound.',
      dialogue: [{ character: 'Voice', text: 'Help…?' }],
    },
    {
      number: 10,
      title: 'Relief',
      description: 'Close-up of Fuzzy\'s face breaking into a huge relieved smile, eyes watering.',
      textToImagePrompt: 'Close-up of Fuzzy\'s face breaking into a huge relieved smile, eyes watering.',
      imageToVideoPrompt: 'Fuzzy laughs and sniffs.',
      dialogue: [{ character: 'Fuzzy', text: 'That\'s him! I know that voice!' }],
    },
    {
      number: 11,
      title: 'Determination',
      description: 'Close-up of The Boy, eyes sharp and confident, sun flaring behind him.',
      textToImagePrompt: 'Close-up of The Boy, eyes sharp and confident, sun flaring behind him.',
      imageToVideoPrompt: 'He nods firmly.',
      dialogue: [{ character: 'Boy', text: 'Let\'s finish this.' }],
    },
    {
      number: 12,
      title: 'Moving Forward',
      description: 'The Boy and Fuzzy running forward side by side, smiles returning despite exhaustion.',
      textToImagePrompt: 'Medium Shot of The Boy and Fuzzy running forward side by side, framed waist-up, smiles returning despite exhaustion.',
      imageToVideoPrompt: 'They run toward camera slightly, determination and hope clear on their faces.',
      dialogue: [
        { character: 'Fuzzy', text: 'Best delivery ever.' },
        { character: 'Boy', text: 'Not done yet.' },
      ],
    },
  ],
};

function generateId() {
  return 'cm' + crypto.randomBytes(12).toString('base64url').toLowerCase().slice(0, 22);
}

async function uploadToS3(filePath, key) {
  const fileContent = fs.readFileSync(filePath);
  const contentType = filePath.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  }));

  return `https://${BUCKET}.s3.eu-central-1.amazonaws.com/${key}`;
}

async function main() {
  const sourceDir = '/Volumes/DATA/Python/Film_Andrej_2026';
  const client = new Client({ connectionString: destDb });
  await client.connect();

  try {
    const projectId = generateId();
    console.log('Creating project:', projectData.name);
    console.log('Project ID:', projectId);

    // Create project
    await client.query(`
      INSERT INTO "Project" (id, name, "userId", style, "masterPrompt", "currentStep", "isComplete", "createdAt", "updatedAt", story)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8::jsonb)
    `, [
      projectId,
      projectData.name,
      destUserId,
      projectData.style,
      projectData.masterPrompt,
      5, // export step
      false,
      JSON.stringify({ content: projectData.story }),
    ]);
    console.log('Project created');

    // Upload and create characters
    for (const char of projectData.characters) {
      const charId = generateId();
      const imagePath = path.join(sourceDir, char.imageFile);

      let imageUrl = null;
      if (fs.existsSync(imagePath)) {
        console.log(`Uploading ${char.name} image...`);
        const s3Key = `projects/${projectId}/characters/${charId}.jpeg`;
        imageUrl = await uploadToS3(imagePath, s3Key);
        console.log(`  Uploaded: ${imageUrl}`);
      }

      await client.query(`
        INSERT INTO "Character" (id, "projectId", name, description, "visualDescription", "masterPrompt", "imageUrl", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [charId, projectId, char.name, char.description, char.visualDescription, char.visualDescription, imageUrl]);
      console.log(`Character created: ${char.name}`);
    }

    // Upload and create scenes
    for (const scene of projectData.scenes) {
      const sceneId = generateId();
      const imageFile = `scene${scene.number}.jpeg`;
      const videoFile = `video${scene.number}.mp4`;
      const imagePath = path.join(sourceDir, imageFile);
      const videoPath = path.join(sourceDir, videoFile);

      let imageUrl = null;
      let videoUrl = null;

      if (fs.existsSync(imagePath)) {
        console.log(`Uploading scene ${scene.number} image...`);
        const s3Key = `projects/${projectId}/scenes/${sceneId}/image.jpeg`;
        imageUrl = await uploadToS3(imagePath, s3Key);
      }

      if (fs.existsSync(videoPath)) {
        console.log(`Uploading scene ${scene.number} video...`);
        const s3Key = `projects/${projectId}/scenes/${sceneId}/video.mp4`;
        videoUrl = await uploadToS3(videoPath, s3Key);
      }

      await client.query(`
        INSERT INTO "Scene" (id, "projectId", number, title, description, "textToImagePrompt", "imageToVideoPrompt", "imageUrl", "videoUrl", dialogue, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW(), NOW())
      `, [
        sceneId,
        projectId,
        scene.number,
        scene.title,
        scene.description,
        scene.textToImagePrompt,
        scene.imageToVideoPrompt,
        imageUrl,
        videoUrl,
        JSON.stringify(scene.dialogue),
      ]);
      console.log(`Scene ${scene.number} created: ${scene.title}`);
    }

    console.log('\n=== Import complete! ===');
    console.log(`Project: ${projectData.name}`);
    console.log(`Characters: ${projectData.characters.length}`);
    console.log(`Scenes: ${projectData.scenes.length}`);

  } finally {
    await client.end();
  }
}

main().catch(console.error);
