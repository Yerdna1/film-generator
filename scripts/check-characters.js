require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProject() {
  const projectId = 'cmkifdlkw001foykm4mfo7cyq';

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        currentStep: true,
        settings: true,
        characters: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        scenes: {
          select: {
            id: true,
            number: true,
            title: true,
            imageUrl: true,
          },
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!project) {
      console.log('Project not found');
      return;
    }

    console.log('\n=== PROJECT INFO ===');
    console.log('ID:', project.id);
    console.log('Name:', project.name);
    console.log('Current Step:', project.currentStep);

    console.log('\n=== CHARACTERS ===');
    console.log('Total characters:', project.characters.length);
    if (project.characters.length > 0) {
      project.characters.forEach((char, index) => {
        console.log(`${index + 1}. ${char.name} - ${char.imageUrl ? 'has image' : 'no image'}`);
      });
    } else {
      console.log('No characters found!');
    }

    console.log('\n=== SCENES ===');
    console.log('Total scenes:', project.scenes.length);
    console.log('Scenes with imageUrl:', project.scenes.filter(s => s.imageUrl).length);

    console.log('\n=== SETTINGS ===');
    console.log('Scene count from settings:', project.settings?.sceneCount);

    if (project.scenes.length > 0) {
      console.log('\n=== FIRST 3 SCENES ===');
      project.scenes.slice(0, 3).forEach((scene, index) => {
        console.log(`${index + 1}. Scene ${scene.number}: ${scene.title}`);
        console.log(`   imageUrl: ${scene.imageUrl ? 'YES' : 'NO'}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProject();
