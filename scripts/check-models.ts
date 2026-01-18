import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking video model variants in database...\n');

  const videos = await prisma.kieVideoModel.findMany({
    take: 15,
    orderBy: { name: 'asc' }
  });

  console.log('Sample of 15 video model variants:');
  console.log('━'.repeat(80));
  videos.forEach((v, i) => {
    console.log(`${i + 1}. ${v.name}`);
    console.log(`   Model ID: ${v.modelId}`);
    console.log(`   Provider: ${v.provider} | Quality: ${v.quality} | Length: ${v.length}`);
    console.log(`   Credits: ${v.credits} | Cost: $${v.cost.toFixed(2)}`);
    console.log(`   Modality: ${v.modality.join(', ')}`);
    console.log('');
  });

  const totalCount = await prisma.kieVideoModel.count();
  console.log('━'.repeat(80));
  console.log(`\n📊 Total video model variants in database: ${totalCount}`);

  // Show Seedance variants as an example
  const seedanceVariants = await prisma.kieVideoModel.findMany({
    where: {
      modelId: { contains: 'seedance' }
    },
    orderBy: { name: 'asc' }
  });

  console.log('\n🎬 Seedance 1.5 Pro variants (showing how resolution/duration/audio are separate choices):');
  console.log('━'.repeat(80));
  seedanceVariants.forEach((v, i) => {
    console.log(`${i + 1}. ${v.name}`);
    console.log(`   Credits: ${v.credits} | Cost: $${v.cost.toFixed(2)}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main();
