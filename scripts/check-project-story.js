require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProjectStory() {
  const projectId = 'cmkifdlkw001foykm4mfo7cyq';

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        story: true,
        settings: true,
        characters: {
          select: {
            id: true,
            name: true,
            masterPrompt: true,
          },
          take: 3,
        },
      },
    });

    if (!project) {
      console.log('Project not found');
      return;
    }

    console.log('\n=== PROJECT STORY CHECK ===');
    console.log('ID:', project.id);
    console.log('Name:', project.name);
    console.log('\nStory field:');
    console.log(JSON.stringify(project.story, null, 2));

    console.log('\nCharacters (first 3):');
    project.characters.forEach((char, index) => {
      console.log(`${index + 1}. ${char.name}`);
      console.log(`   masterPrompt: ${char.masterPrompt ? 'YES' : 'NO'}`);
    });

    console.log('\nSettings:');
    console.log('Scene count:', project.settings?.sceneCount);

    // Check if story has required fields
    if (!project.story) {
      console.log('\n⚠️  WARNING: story field is NULL or undefined!');
    } else {
      const required = ['title', 'concept', 'genre', 'tone', 'setting'];
      const missing = required.filter(field => !project.story[field]);
      if (missing.length > 0) {
        console.log(`\n⚠️  WARNING: Story missing fields: ${missing.join(', ')}`);
      } else {
        console.log('\n✓ Story has all required fields');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjectStory();
