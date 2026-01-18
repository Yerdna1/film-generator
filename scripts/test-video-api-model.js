#!/usr/bin/env node

/**
 * Test script to demonstrate how to call the KIE.ai video API with a specific model
 * This shows how the model selection from the database flows through to the actual API call
 */

const API_BASE = 'http://localhost:3000';
const KIE_API_URL = 'https://api.kie.ai';

// Test models from the database
const TEST_MODELS = [
  {
    modelId: 'veo/3.1-text-to-video-fast-5s-720p',
    name: 'Google Veo 3.1 Text to Video Fast 720p (5s)',
    description: 'Fast 5-second video at 720p resolution',
    expectedCredits: 38,
    expectedCost: 0.19,
  },
  {
    modelId: 'kling-2.6/text-to-video-5s-1080p-no-audio',
    name: 'Kling 2.6 Text to Video (5s, 1080p, No Audio)',
    description: '5-second video at 1080p without audio',
    expectedCredits: 82,
    expectedCost: 0.41,
  },
  {
    modelId: 'sora-2/text-to-video-5s-1080p',
    name: 'OpenAI Sora 2 Text to Video (5s, 1080p)',
    description: '5-second video at 1080p with Sora 2',
    expectedCredits: 30,
    expectedCost: 0.15,
  },
];

/**
 * Direct KIE.ai API call example
 * This is what your Next.js API route does internally
 */
async function callKieApiDirect(modelId, imageUrl, prompt) {
  console.log('\n📡 Direct KIE.ai API Call');
  console.log('━'.repeat(80));
  console.log(`Model: ${modelId}`);
  console.log(`Image URL: ${imageUrl}`);
  console.log(`Prompt: ${prompt}`);

  const requestBody = {
    model: modelId,
    input: {
      image_urls: [imageUrl],
      prompt: prompt,
      mode: 'normal',
    },
  };

  console.log('\n📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(`${KIE_API_URL}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      console.error('\n❌ Error:', data.msg || data.message);
      return null;
    }

    console.log('\n✅ Success!');
    console.log(`Task ID: ${data.data.taskId}`);
    console.log(`\nYou can poll for status at:`);
    console.log(`${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${data.data.taskId}`);

    return data.data.taskId;
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    return null;
  }
}

/**
 * Via your Next.js API route
 * This is how your frontend calls the backend
 */
async function callViaNextJsApi(modelId, imageUrl, prompt, projectId) {
  console.log('\n🌐 Via Next.js API Route');
  console.log('━'.repeat(80));
  console.log(`Model: ${modelId}`);
  console.log(`Image URL: ${imageUrl}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Project ID: ${projectId || 'none'}`);

  const requestBody = {
    imageUrl: imageUrl,
    prompt: prompt,
    mode: 'normal',
    model: modelId, // This is the key parameter - comes from project.modelConfig.video.model
    videoProvider: 'kie',
    projectId: projectId,
  };

  console.log('\n📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));

  console.log('\n📡 API Call:');
  console.log(`POST ${API_BASE}/api/video`);

  try {
    const response = await fetch(`${API_BASE}/api/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Error:', data.error);
      return null;
    }

    console.log('\n✅ Success!');
    console.log(`Task ID: ${data.taskId}`);
    console.log(`Status: ${data.status}`);

    if (data.taskId) {
      console.log(`\n📊 Poll for status at:`);
      console.log(`GET ${API_BASE}/api/video?taskId=${data.taskId}&projectId=${projectId || 'none'}&model=${modelId}`);
    }

    return data.taskId;
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    return null;
  }
}

/**
 * Poll for video completion
 */
async function pollForCompletion(taskId, modelId, projectId) {
  console.log('\n⏳ Polling for completion...');
  console.log('━'.repeat(80));

  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const params = new URLSearchParams({
        taskId,
        projectId: projectId || 'none',
        model: modelId,
        download: 'true',
      });

      const response = await fetch(`${API_BASE}/api/video?${params}`);
      if (!response.ok) continue;

      const data = await response.json();
      console.log(`[${i + 1}/${maxAttempts}] Status: ${data.status}`);

      if (data.status === 'complete' && data.videoUrl) {
        console.log('\n✅ Video complete!');
        console.log(`Video URL: ${data.videoUrl}`);
        console.log(`Cost: ${data.cost ? `$${data.cost.toFixed(2)}` : 'N/A'}`);
        return data.videoUrl;
      }

      if (data.status === 'error') {
        console.error('\n❌ Generation failed:', data.failMessage);
        return null;
      }
    } catch (error) {
      console.error('Polling error:', error.message);
    }
  }

  console.log('\n⏱️ Timeout - video took too long');
  return null;
}

/**
 * Main function
 */
async function main() {
  console.log('🎬 KIE.ai Video API - Model Selection Test');
  console.log('='.repeat(80));

  // Check if API key is set
  if (!process.env.KIE_API_KEY) {
    console.error('\n❌ KIE_API_KEY environment variable not set!');
    console.error('Please set it with: export KIE_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log('\n📋 Available test models:');
  TEST_MODELS.forEach((model, i) => {
    console.log(`${i + 1}. ${model.name}`);
    console.log(`   Model ID: ${model.modelId}`);
    console.log(`   ${model.description}`);
    console.log(`   Cost: ${model.expectedCredits} credits ($${model.expectedCost.toFixed(2)})`);
    console.log('');
  });

  // Get user input
  const args = process.argv.slice(2);
  const modelChoice = args[0] ? parseInt(args[0]) - 1 : 0;
  const testMode = args[1] || 'nextjs'; // 'direct' or 'nextjs'
  const imageUrl = args[2] || 'https://picsum.photos/1024/1024';
  const projectId = args[3];
  const prompt = args[4] || 'A beautiful sunset over the ocean with gentle waves';

  if (modelChoice < 0 || modelChoice >= TEST_MODELS.length) {
    console.error(`\n❌ Invalid model choice. Please choose 1-${TEST_MODELS.length}`);
    process.exit(1);
  }

  const selectedModel = TEST_MODELS[modelChoice];
  console.log(`\n🎯 Selected: ${selectedModel.name}`);
  console.log(`Model ID: ${selectedModel.modelId}`);
  console.log(`Test Mode: ${testMode === 'direct' ? 'Direct KIE.ai API' : 'Via Next.js API'}`);
  console.log(`Image: ${imageUrl}`);
  console.log(`Prompt: ${prompt}`);

  let taskId;
  if (testMode === 'direct') {
    taskId = await callKieApiDirect(selectedModel.modelId, imageUrl, prompt);
  } else {
    taskId = await callViaNextJsApi(selectedModel.modelId, imageUrl, prompt, projectId);
  }

  if (taskId && testMode === 'nextjs') {
    await pollForCompletion(taskId, selectedModel.modelId, projectId);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete!');
}

// Run the script
main().catch(console.error);
