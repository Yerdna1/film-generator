// Migration Script: Move base64 data from DB to S3
// This script finds scenes with base64 data stored in URL fields,
// uploads them to S3, and updates the database with proper URLs.
//
// Usage: DATABASE_URL="..." node scripts/migrate-base64-to-s3.js

const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION || 'eu-central-1';

function isBase64Data(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:') || (str.length > 1000 && !str.startsWith('http'));
}

function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('http://') || str.startsWith('https://');
}

async function uploadBase64ToS3(base64Data, folder, extension) {
  let mimeType = 'application/octet-stream';
  let base64Content = base64Data;

  if (base64Data.startsWith('data:')) {
    const matches = base64Data.match(/^data:([^;,]+)[^,]*,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Content = matches[2];
    }
  }

  // Determine extension from mime type if not provided
  if (!extension) {
    const extMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
    };
    extension = extMap[mimeType.split(';')[0].toLowerCase()] || 'bin';
  }

  const key = `${folder}/${uuidv4()}.${extension}`;
  const buffer = Buffer.from(base64Content, 'base64');

  console.log(`  Uploading ${(buffer.length / 1024).toFixed(1)} KB as ${mimeType}...`);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'max-age=86400',
    })
  );

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  console.log(`  Uploaded to: ${url}`);

  return url;
}

async function migrateScenes() {
  console.log('\n=== Migrating Scenes with Base64 Data ===\n');

  // Find all scenes
  const scenes = await prisma.scene.findMany({
    select: {
      id: true,
      number: true,
      imageUrl: true,
      videoUrl: true,
      projectId: true,
      project: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`Found ${scenes.length} total scenes\n`);

  let imagesMigrated = 0;
  let videosMigrated = 0;

  for (const scene of scenes) {
    const hasBase64Image = isBase64Data(scene.imageUrl);
    const hasBase64Video = isBase64Data(scene.videoUrl);

    if (!hasBase64Image && !hasBase64Video) continue;

    console.log(`\nScene ${scene.number} in project "${scene.project.name}" (${scene.id}):`);

    const updates = {};

    // Migrate image
    if (hasBase64Image) {
      console.log(`  Image: ${(scene.imageUrl.length / 1024).toFixed(1)} KB of base64 data`);
      try {
        const folder = `film-generator/${scene.projectId}/images`;
        const s3Url = await uploadBase64ToS3(scene.imageUrl, folder, 'png');
        updates.imageUrl = s3Url;
        imagesMigrated++;
      } catch (error) {
        console.error(`  ERROR migrating image: ${error.message}`);
      }
    }

    // Migrate video
    if (hasBase64Video) {
      console.log(`  Video: ${(scene.videoUrl.length / 1024).toFixed(1)} KB of base64 data`);
      try {
        const folder = `film-generator/${scene.projectId}/videos`;
        const s3Url = await uploadBase64ToS3(scene.videoUrl, folder, 'mp4');
        updates.videoUrl = s3Url;
        videosMigrated++;
      } catch (error) {
        console.error(`  ERROR migrating video: ${error.message}`);
      }
    }

    // Update database
    if (Object.keys(updates).length > 0) {
      await prisma.scene.update({
        where: { id: scene.id },
        data: updates,
      });
      console.log(`  Database updated successfully`);
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Images migrated: ${imagesMigrated}`);
  console.log(`Videos migrated: ${videosMigrated}`);
}

async function migrateCharacters() {
  console.log('\n=== Migrating Characters with Base64 Data ===\n');

  const characters = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      projectId: true,
      project: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`Found ${characters.length} total characters\n`);

  let imagesMigrated = 0;

  for (const character of characters) {
    if (!isBase64Data(character.imageUrl)) continue;

    console.log(`\nCharacter "${character.name}" in project "${character.project.name}" (${character.id}):`);
    console.log(`  Image: ${(character.imageUrl.length / 1024).toFixed(1)} KB of base64 data`);

    try {
      const folder = `film-generator/${character.projectId}/characters`;
      const s3Url = await uploadBase64ToS3(character.imageUrl, folder, 'png');

      await prisma.character.update({
        where: { id: character.id },
        data: { imageUrl: s3Url },
      });

      console.log(`  Database updated successfully`);
      imagesMigrated++;
    } catch (error) {
      console.error(`  ERROR: ${error.message}`);
    }
  }

  console.log('\n=== Character Migration Complete ===');
  console.log(`Images migrated: ${imagesMigrated}`);
}

async function main() {
  console.log('===========================================');
  console.log('Base64 to S3 Migration Script');
  console.log('===========================================\n');

  if (!bucket) {
    console.error('ERROR: AWS_S3_BUCKET not set in environment');
    process.exit(1);
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('ERROR: AWS credentials not set in environment');
    process.exit(1);
  }

  console.log(`S3 Bucket: ${bucket}`);
  console.log(`Region: ${region}\n`);

  try {
    await migrateScenes();
    await migrateCharacters();

    console.log('\n===========================================');
    console.log('All migrations completed successfully!');
    console.log('===========================================');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
