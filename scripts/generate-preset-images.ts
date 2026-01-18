// Script to generate preset images using KIE.ai nano_banana 1k model
// Run with: npx tsx scripts/generate-preset-images.ts

const KIE_API_KEY = '1c5776ce80df8a40e01f114c3bbe9446';
const KIE_API_URL = 'https://api.kie.ai';

const presets = [
  {
    id: 'disney-magical-creatures',
    name: 'Magical Creatures',
    prompt: 'Disney Pixar style magical fantasy scene, cute glowing spirit creatures in enchanted forest, floating lanterns, magical waterfalls, soft warm lighting, vibrant colors, heartwarming atmosphere, 3D animation style, highly detailed'
  },
  {
    id: 'disney-underdog-hero',
    name: 'Underdog Hero',
    prompt: 'Disney Pixar inspiring story scene, young dreamer in vibrant city neighborhood, family restaurant background, talent show stage, warm golden lighting, hopeful atmosphere, modern animation style, detailed and colorful'
  },
  {
    id: 'anime-spirit-world',
    name: 'Spirit World',
    prompt: 'Anime style fantasy scene, modern Tokyo with hidden spirit shrines, ancient Japanese temples, mystical forest realm, glowing spirits, cherry blossoms, dramatic anime art style, vibrant colors, highly detailed'
  },
  {
    id: 'anime-mecha-academy',
    name: 'Mecha Academy',
    prompt: 'Anime mecha scene, futuristic space academy, giant robot training grounds, orbital station view, sci-fi aesthetic, dramatic lighting, detailed mecha design, anime art style, epic atmosphere'
  },
  {
    id: 'realistic-noir-thriller',
    name: 'Noir Thriller',
    prompt: 'Film noir style scene, rain-soaked city streets at night, neon signs reflecting on wet pavement, 1940s detective office interior, smoky jazz club atmosphere, dramatic black and white photography style, moody lighting'
  },
  {
    id: 'realistic-drama-redemption',
    name: 'Redemption Story',
    prompt: 'Realistic drama scene, small coastal town at sunset, weathered fishing boat, local diner interior, autumn landscape, warm golden hour lighting, emotional atmosphere, cinematic photography style, highly detailed'
  }
];

async function generateImage(prompt: string): Promise<string> {
  console.log(`Generating image for: ${prompt.substring(0, 50)}...`);

  // Create task
  const response = await fetch(`${KIE_API_URL}/api/v1/generate/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: prompt,
      model: 'seedream/4-5-text-to-image', // Use high quality model
      resolution: '1024', // 1k resolution
      aspect_ratio: '1:1', // Square for preset cards
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create task: ${error}`);
  }

  const data = await response.json();
  const taskId = data.data?.taskId;
  if (!taskId) {
    throw new Error('No task ID in response');
  }
  console.log(`Task created: ${taskId}`);

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusResponse = await fetch(`${KIE_API_URL}/api/v1/fetch/image/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check status: ${statusResponse.statusText}`);
    }

    const statusData = await statusResponse.json();
    const state = statusData.data?.state;
    console.log(`Status: ${state}, attempt ${attempts + 1}/${maxAttempts}`);

    if (state === 'COMPLETED') {
      const url = statusData.data?.result?.url;
      if (url) {
        console.log(`✓ Image generated: ${url}`);
        return url;
      }
      throw new Error('No image URL in result');
    }

    if (state === 'FAILED') {
      throw new Error(`Task failed: ${statusData.data?.error || 'Unknown error'}`);
    }

    attempts++;
  }

  throw new Error('Task timed out');
}

async function main() {
  console.log('Generating preset images...\n');

  const results = [];

  for (const preset of presets) {
    try {
      const imageUrl = await generateImage(preset.prompt);
      results.push({
        id: preset.id,
        name: preset.name,
        imageUrl: imageUrl,
      });
      console.log(`\n✓ ${preset.name}: ${imageUrl}\n`);
    } catch (error) {
      console.error(`\n✗ ${preset.name} failed:`, error);
      results.push({
        id: preset.id,
        name: preset.name,
        imageUrl: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  console.log('\n=== COPY THIS TO story-presets.ts ===');
  results.forEach(result => {
    if (result.imageUrl) {
      console.log(`  ${result.id}: '${result.imageUrl}',`);
    }
  });
}

main().catch(console.error);
