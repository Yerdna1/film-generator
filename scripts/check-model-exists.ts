import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const modelId = 'seedream-3.0/2k';

  const model = await prisma.kieImageModel.findUnique({
    where: { modelId }
  });

  if (!model) {
    console.log('❌ Model NOT found in database!');
    console.log('   Model ID:', modelId);
    console.log('');
    console.log('   This might cause an error when generating images.');
    console.log('   Available Seedream models:');

    const seedreamModels = await prisma.kieImageModel.findMany({
      where: { modelId: { contains: 'seedream' } },
      orderBy: { modelId: 'asc' },
      take: 10
    });

    seedreamModels.forEach(m => {
      console.log('   -', m.modelId, '(' + m.name + ')');
    });
  } else {
    console.log('✅ Model found in database!');
    console.log('');
    console.log('📦 Model Details:');
    console.log('   Model ID:', model.modelId);
    console.log('   Name:', model.name);
    console.log('   Provider:', model.provider);
    console.log('   Credits:', model.credits);
    console.log('   Cost: $' + model.cost.toFixed(2));
    console.log('   Modality:', model.modality.join(', '));
    console.log('');
    console.log('🎨 Supported Resolutions:');
    console.log('   ' + (model.qualityOptions || []).join(', '));
  }

  await prisma.$disconnect();
}

main();
