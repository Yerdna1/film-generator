import { PrismaClient } from './prisma/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const VIDEOS_DIR = '/Users/andrejpt/Desktop/VIDEOS';

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:')) {
      // Handle base64 data URL
      const matches = url.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(filepath, buffer);
        resolve(filepath);
      } else {
        reject(new Error('Invalid data URL'));
      }
    } else {
      // Handle HTTP/HTTPS URL
      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(filepath);
      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirect
          downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      }).on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }
  });
}

async function main() {
  const userEmail = 'Andrej.galad@gmail.com';

  console.log(`Fetching user: ${userEmail}`);

  // Find user - case insensitive
  let user = await prisma.user.findFirst({
    where: {
      email: {
        equals: userEmail,
        mode: 'insensitive'
      }
    }
  });

  if (!user) {
    console.log('User not found. Listing all users:');
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });
    console.log(JSON.stringify(allUsers, null, 2));
    return;
  }

  const userId = user.id;
  console.log(`Found user: ${user.name} (${user.email}), ID: ${userId}`);

  // Get all projects with scenes
  const projects = await prisma.project.findMany({
    where: { userId: userId },
    include: {
      scenes: {
        orderBy: { number: 'asc' }
      },
      characters: true
    }
  });

  console.log(`\nFound ${projects.length} projects:\n`);

  const videosInfo = [];

  for (const project of projects) {
    console.log(`\n📁 Project: ${project.name} (ID: ${project.id})`);
    console.log(`   Style: ${project.style}`);
    console.log(`   Scenes: ${project.scenes.length}`);

    const projectDir = path.join(VIDEOS_DIR, project.name.replace(/[^a-zA-Z0-9]/g, '_'));
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    for (const scene of project.scenes) {
      if (scene.videoUrl) {
        const videoFilename = `scene_${String(scene.number).padStart(2, '0')}_${scene.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.mp4`;
        const videoPath = path.join(projectDir, videoFilename);

        videosInfo.push({
          projectId: project.id,
          projectName: project.name,
          sceneId: scene.id,
          sceneNumber: scene.number,
          sceneTitle: scene.title,
          description: scene.description,
          dialogue: scene.dialogue,
          duration: scene.duration,
          videoUrl: scene.videoUrl,
          audioUrl: scene.audioUrl,
          localPath: videoPath
        });

        console.log(`   🎬 Scene ${scene.number}: ${scene.title}`);
        console.log(`      Video URL: ${scene.videoUrl.substring(0, 80)}...`);

        // Download video
        try {
          if (!fs.existsSync(videoPath)) {
            console.log(`      Downloading to: ${videoPath}`);
            await downloadFile(scene.videoUrl, videoPath);
            console.log(`      ✅ Downloaded!`);
          } else {
            console.log(`      ⏭️ Already exists`);
          }
        } catch (err) {
          console.log(`      ❌ Download failed: ${err.message}`);
        }
      }
    }
  }

  // Save metadata
  const metadataPath = path.join(VIDEOS_DIR, 'videos_metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify({
    user: { id: user.id, email: user.email, name: user.name },
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      style: p.style,
      story: p.story,
      characters: p.characters.map(c => ({ name: c.name, description: c.description }))
    })),
    videos: videosInfo,
    fetchedAt: new Date().toISOString()
  }, null, 2));

  console.log(`\n✅ Metadata saved to: ${metadataPath}`);
  console.log(`📊 Total videos: ${videosInfo.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
