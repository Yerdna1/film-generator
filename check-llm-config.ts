import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get your user
  const user = await prisma.user.findFirst({
    where: {
      email: 'andrej.galad@gmail.com',
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    console.log('User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('User:', user.email);
  console.log('User ID:', user.id);

  // Get API keys
  const apiKeys = await prisma.apiKeys.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!apiKeys) {
    console.log('\n❌ No API keys configured for this user.');
    console.log('Please configure your LLM provider in Settings > API Keys.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n✅ API Keys found:');
  console.log('- LLM Provider:', apiKeys.llmProvider || 'Not set');
  console.log('- OpenRouter API Key:', apiKeys.openRouterApiKey ? '✓ Configured' : '✗ Not configured');
  console.log('- OpenRouter Model:', apiKeys.openRouterModel || 'Not set');
  console.log('- Modal LLM Endpoint:', apiKeys.modalLlmEndpoint ? '✓ Configured' : '✗ Not configured');
  console.log('- Gemini API Key:', apiKeys.geminiApiKey ? '✓ Configured' : '✗ Not configured');

  // Check which provider is actually usable
  const provider = apiKeys.llmProvider || 'openrouter';
  console.log('\n📊 Current LLM Provider:', provider);

  if (provider === 'openrouter' && !apiKeys.openRouterApiKey) {
    console.log('❌ OpenRouter selected but no API key configured!');
  } else if (provider === 'modal' && !apiKeys.modalLlmEndpoint) {
    console.log('❌ Modal selected but no endpoint configured!');
  } else if (provider === 'gemini' && !apiKeys.geminiApiKey) {
    console.log('❌ Gemini selected but no API key configured!');
  } else {
    console.log('✅ Provider appears to be configured correctly');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
