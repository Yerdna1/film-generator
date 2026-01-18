import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projectId = 'cmkivtwqv0005l80499cyfuzx';

  // Get project with model config
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      modelConfig: true,
      userId: true,
    }
  });

  if (!project) {
    console.log('❌ Project not found');
    await prisma.$disconnect();
    return;
  }

  console.log('📋 Project Info:');
  console.log('   Name:', project.name);
  console.log('   ID:', project.id);
  console.log('');

  console.log('🔧 Model Config:');
  if (project.modelConfig) {
    const config = project.modelConfig as any;
    console.log('   Image Provider:', config.image?.provider || 'NOT SET');
    console.log('   Image Model:', config.image?.model || 'NOT SET');
    console.log('   Character Aspect Ratio:', config.image?.characterAspectRatio || 'NOT SET');
    console.log('   Scene Aspect Ratio:', config.image?.sceneAspectRatio || 'NOT SET');
    console.log('   Scene Resolution:', config.image?.sceneResolution || 'NOT SET');
  } else {
    console.log('   ❌ No modelConfig found in project');
  }

  // Get user's API keys (to see default fallback)
  console.log('');
  console.log('🔑 User API Keys (fallback):');
  const userApiKeys = await prisma.apiKeys.findUnique({
    where: { userId: project.userId },
    select: {
      imageProvider: true,
      kieImageModel: true,
    }
  });

  if (userApiKeys) {
    console.log('   Image Provider:', userApiKeys.imageProvider || 'NOT SET');
    console.log('   KIE Image Model:', userApiKeys.kieImageModel || 'NOT SET');
  } else {
    console.log('   ❌ No API keys found for user');
  }

  // Determine what will be used
  console.log('');
  console.log('🎯 What will be used when generating images:');

  const config = project.modelConfig as any;
  const providerFromProject = config?.image?.provider;
  const modelFromProject = config?.image?.model;
  const providerFromKeys = userApiKeys?.imageProvider;
  const modelFromKeys = userApiKeys.kieImageModel;

  const finalProvider = providerFromProject || providerFromKeys || 'gemini';
  const finalModel = modelFromProject || modelFromKeys || 'gemini-3-pro-image-preview';

  console.log('   Provider:', finalProvider);
  console.log('   Model:', finalModel);
  console.log('');

  if (finalProvider === 'kie') {
    console.log('✅ Will use KIE.ai with model:', finalModel);
    console.log('   API call: POST /api/image');
    console.log('   Body: { model: "' + finalModel + '", provider: "kie", ... }');
  } else if (finalProvider === 'gemini') {
    console.log('✅ Will use Gemini with model: gemini-3-pro-image-preview');
    console.log('   API call: POST /api/image');
  } else {
    console.log('ℹ️  Will use provider:', finalProvider);
  }

  await prisma.$disconnect();
}

main();
