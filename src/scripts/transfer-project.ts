import { prisma } from '../lib/db/prisma';

async function main() {
  const projectId = 'cmjsem9l10033oyy72roh82eq';
  const newUserId = 'cmjsdxepp0000oyqgn471ofdt';  // andrej.galad@gmail.com

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { 
      scenes: true,
      characters: true 
    }
  });

  if (!project) {
    console.log('Project not found');
    return;
  }

  console.log('Found project:', project.name);
  console.log('Current owner:', project.userId);
  console.log('Characters:', project.characters.length);
  console.log('Scenes:', project.scenes.length);
  console.log('Scenes with images:', project.scenes.filter(s => s.imageUrl).length);

  // Transfer ownership
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { userId: newUserId }
  });

  console.log('\nProject transferred to:', updated.userId);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
