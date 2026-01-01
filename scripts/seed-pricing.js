/**
 * Seed pricing data into the ActionCost table
 *
 * Run with: DATABASE_URL="..." node scripts/seed-pricing.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const pricingData = [
  // Image providers
  { actionType: 'image', provider: 'gemini', cost: 0.24, description: 'Gemini 3 Pro Image Generation' },
  { actionType: 'image', provider: 'gemini-flash', cost: 0.039, description: 'Gemini Flash Image (up to 1024px)' },
  { actionType: 'image', provider: 'modal', cost: 0.09, description: 'Modal Qwen-VL Image Generation (H100)' },
  { actionType: 'image', provider: 'modal-edit', cost: 0.09, description: 'Modal Qwen-Image-Edit-2511 (H100)' },
  { actionType: 'image', provider: 'nanoBanana', cost: 0.24, description: 'Nano Banana Pro (Gemini 3 Pro)' },

  // Video providers
  { actionType: 'video', provider: 'grok', cost: 0.10, description: 'Grok Video Generation (6s clip)' },
  { actionType: 'video', provider: 'kie', cost: 0.10, description: 'Kie.ai Video Generation (6s clip)' },
  { actionType: 'video', provider: 'modal', cost: 0.15, description: 'Modal Hallo3 Portrait Video (H100)' },

  // Voiceover providers
  { actionType: 'voiceover', provider: 'elevenlabs', cost: 0.03, description: 'ElevenLabs TTS (per line ~100 chars)' },
  { actionType: 'voiceover', provider: 'gemini-tts', cost: 0.002, description: 'Gemini TTS (per line)' },
  { actionType: 'voiceover', provider: 'modal', cost: 0.01, description: 'Modal Chatterbox TTS (per line)' },

  // Scene generation
  { actionType: 'scene', provider: 'gemini', cost: 0.001, description: 'Gemini Scene Generation' },
  { actionType: 'scene', provider: 'claude', cost: 0.01, description: 'Claude Scene Generation' },
  { actionType: 'scene', provider: 'grok', cost: 0.003, description: 'Grok Scene Generation' },
  { actionType: 'scene', provider: 'modal', cost: 0.002, description: 'Modal LLM Scene Generation' },
  { actionType: 'scene', provider: 'openrouter', cost: 0.01, description: 'OpenRouter LLM Scene Generation' },

  // Character generation
  { actionType: 'character', provider: 'gemini', cost: 0.0005, description: 'Gemini Character Description' },
  { actionType: 'character', provider: 'claude', cost: 0.008, description: 'Claude Character Description' },

  // Prompt generation
  { actionType: 'prompt', provider: 'gemini', cost: 0.001, description: 'Gemini Master Prompt' },
  { actionType: 'prompt', provider: 'claude', cost: 0.012, description: 'Claude Master Prompt' },

  // Music generation
  { actionType: 'music', provider: 'suno', cost: 0.05, description: 'Suno AI Music Track' },
  { actionType: 'music', provider: 'piapi', cost: 0.05, description: 'PiAPI Music Track (Suno/Udio)' },
  { actionType: 'music', provider: 'modal', cost: 0.03, description: 'Modal ACE-Step Music' },
];

async function main() {
  console.log('Seeding pricing data...\n');

  const now = new Date();

  for (const item of pricingData) {
    const result = await prisma.actionCost.upsert({
      where: {
        actionType_provider: {
          actionType: item.actionType,
          provider: item.provider,
        },
      },
      update: {
        cost: item.cost,
        description: item.description,
        updatedAt: new Date(),
      },
      create: {
        ...item,
        validFrom: now,
        validTo: null,
        isActive: true,
      },
    });

    console.log(`✓ ${item.actionType}/${item.provider}: $${item.cost.toFixed(4)}`);
  }

  console.log('\n✅ Pricing data seeded successfully!');

  // Show summary
  const counts = await prisma.actionCost.groupBy({
    by: ['actionType'],
    _count: true,
  });

  console.log('\nSummary:');
  for (const c of counts) {
    console.log(`  ${c.actionType}: ${c._count} providers`);
  }
}

main()
  .catch((e) => {
    console.error('Error seeding pricing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
