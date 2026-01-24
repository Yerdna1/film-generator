import { prisma } from '../src/lib/db/prisma';

async function main() {
  const videoModels = await prisma.kieVideoModel.findMany({
    orderBy: { name: 'asc' },
  });

  console.log('KIE Video Models in Database:');
  console.log('================================\n');

  videoModels.forEach((model, index) => {
    console.log(`${index + 1}. ${model.name}`);
    console.log(`   Model ID: ${model.modelId}`);
    console.log(`   API Model ID: ${model.apiModelId}`);
    console.log(`   Active: ${model.isActive}`);
    console.log(`   Resolutions: ${JSON.stringify(model.supportedResolutions)}`);
    console.log(`   Durations: ${JSON.stringify(model.supportedDurations)}`);
    console.log(`   Aspect Ratios: ${JSON.stringify(model.supportedAspectRatios)}`);
    console.log(`   Cost: ${model.cost}`);
    console.log('');
  });

  const activeCount = videoModels.filter(m => m.isActive).length;
  console.log(`\nTotal: ${videoModels.length} models, ${activeCount} active`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
