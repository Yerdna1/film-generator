import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create or update the default user
  const email = 'andrej.galad@gmail.com';
  const password = 'Andrejko1';
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name: 'Andrej Galad',
    },
    create: {
      email,
      password: hashedPassword,
      name: 'Andrej Galad',
      emailVerified: new Date(),
    },
  });

  console.log(`User created/updated: ${user.email}`);

  // Create or update API keys for the user
  // NOTE: Replace these placeholder values with your actual API keys
  const apiKeys = await prisma.apiKeys.upsert({
    where: { userId: user.id },
    update: {
      geminiApiKey: process.env.SEED_GEMINI_API_KEY || 'your-gemini-api-key-here',
      grokApiKey: process.env.SEED_GROK_API_KEY || 'your-grok-api-key-here',
      elevenLabsApiKey: process.env.SEED_ELEVENLABS_API_KEY || 'your-elevenlabs-api-key-here',
      claudeApiKey: process.env.SEED_CLAUDE_API_KEY || 'your-claude-api-key-here',
      openaiApiKey: process.env.SEED_OPENAI_API_KEY || 'your-openai-api-key-here',
      nanoBananaApiKey: process.env.SEED_NANOBANANA_API_KEY || 'your-nanobanana-api-key-here',
    },
    create: {
      userId: user.id,
      geminiApiKey: process.env.SEED_GEMINI_API_KEY || 'your-gemini-api-key-here',
      grokApiKey: process.env.SEED_GROK_API_KEY || 'your-grok-api-key-here',
      elevenLabsApiKey: process.env.SEED_ELEVENLABS_API_KEY || 'your-elevenlabs-api-key-here',
      claudeApiKey: process.env.SEED_CLAUDE_API_KEY || 'your-claude-api-key-here',
      openaiApiKey: process.env.SEED_OPENAI_API_KEY || 'your-openai-api-key-here',
      nanoBananaApiKey: process.env.SEED_NANOBANANA_API_KEY || 'your-nanobanana-api-key-here',
    },
  });

  console.log(`API keys created/updated for user: ${user.email}`);
  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
