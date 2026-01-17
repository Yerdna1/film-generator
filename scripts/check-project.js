require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProject() {
  const projectId = 'cmkifdlkw001foykm4mfo7cyq';

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
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
    console.log('Visibility:', project.visibility);

    console.log('\n=== SCENES ===');
    console.log('Total scenes:', project.scenes.length);
    console.log('Scenes with imageUrl:', project.scenes.filter(s => s.imageUrl).length);

    console.log('\n=== SCENE DETAILS ===');
    project.scenes.forEach((scene, index) => {
      console.log(`${index + 1}. Scene ${scene.number}: ${scene.title}`);
      console.log(`   imageUrl: ${scene.imageUrl ? 'YES - ' + scene.imageUrl.substring(0, 50) + '...' : 'NO'}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProject();
