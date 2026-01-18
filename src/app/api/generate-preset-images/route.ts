import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { KieImageProvider } from '@/lib/providers/image/kie-provider';
import type { ImageProvider } from '@/types/project';

const PRESETS = [
  {
    id: 'disney-magical-creatures',
    name: 'Magical Creatures',
    prompt: 'Disney Pixar style magical fantasy scene, cute glowing spirit creatures in enchanted forest, floating lanterns, magical waterfalls, soft warm lighting, vibrant colors, heartwarming atmosphere, 3D animation style, highly detailed, square aspect ratio'
  },
  {
    id: 'disney-underdog-hero',
    name: 'Underdog Hero',
    prompt: 'Disney Pixar inspiring story scene, young dreamer in vibrant city neighborhood, family restaurant background, talent show stage, warm golden lighting, hopeful atmosphere, modern animation style, detailed and colorful, square aspect ratio'
  },
  {
    id: 'anime-spirit-world',
    name: 'Spirit World',
    prompt: 'Anime style fantasy scene, modern Tokyo with hidden spirit shrines, ancient Japanese temples, mystical forest realm, glowing spirits, cherry blossoms, dramatic anime art style, vibrant colors, highly detailed, square aspect ratio'
  },
  {
    id: 'anime-mecha-academy',
    name: 'Mecha Academy',
    prompt: 'Anime mecha scene, futuristic space academy, giant robot training grounds, orbital station view, sci-fi aesthetic, dramatic lighting, detailed mecha design, anime art style, epic atmosphere, square aspect ratio'
  },
  {
    id: 'realistic-noir-thriller',
    name: 'Noir Thriller',
    prompt: 'Film noir style scene, rain-soaked city streets at night, neon signs reflecting on wet pavement, 1940s detective office interior, smoky jazz club atmosphere, dramatic black and white photography style, moody lighting, square aspect ratio'
  },
  {
    id: 'realistic-drama-redemption',
    name: 'Redemption Story',
    prompt: 'Realistic drama scene, small coastal town at sunset, weathered fishing boat, local diner interior, autumn landscape, warm golden hour lighting, emotional atmosphere, cinematic photography style, highly detailed, square aspect ratio'
  }
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get KIE API key from env
    const kieApiKey = process.env.KIE_API_KEY;
    if (!kieApiKey) {
      return NextResponse.json({ error: 'KIE_API_KEY not configured' }, { status: 500 });
    }

    const results = [];

    for (const preset of PRESETS) {
      try {
        console.log(`Generating image for ${preset.name}...`);

        // Use KIE provider to generate image
        const provider = new KieImageProvider({
          provider: 'kie',
          apiKey: kieApiKey,
          model: 'seedream/4-5-text-to-image',
        });

        const { base64, mimeType } = await provider.generateImage(
          preset.prompt,
          '1:1',
          '1k'
        );

        // Convert base64 to URL (for now, just return base64)
        // In production, you'd upload to S3/Cloudflare R2
        const dataUrl = `data:${mimeType};base64,${base64}`;

        results.push({
          id: preset.id,
          name: preset.name,
          imageUrl: dataUrl,
        });

        console.log(`✓ Generated ${preset.name}`);
      } catch (error) {
        console.error(`✗ Failed ${preset.name}:`, error);
        results.push({
          id: preset.id,
          name: preset.name,
          imageUrl: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error generating preset images:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preset images' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to generate preset images',
    presets: PRESETS.map(p => ({ id: p.id, name: p.name })),
  });
}
