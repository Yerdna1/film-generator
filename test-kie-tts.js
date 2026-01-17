// Test KIE AI TTS API to check voice support
const KIE_API_KEY = '1c5776ce80df8a40e01f114c3bbe9446';
const KIE_API_URL = 'https://api.kie.ai';

// Test models
const MODELS = [
  'elevenlabs/text-to-speech-turbo-2-5',
  'elevenlabs/text-to-dialogue-v3',
  'elevenlabs/text-to-speech-multilingual-v2',
];

// Test different voice formats
const TEST_VOICE_FORMATS = [
  { format: 'elevenlabs-id', voiceId: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (full ID)' },
  { format: 'lowercase', voiceId: 'adam', name: 'Adam (lowercase)' },
  { format: 'uppercase', voiceId: 'ADAM', name: 'Adam (uppercase)' },
  { format: 'name-with-elevenlabs', voiceId: 'elevenlabs/adam', name: 'Adam (elevenlabs/ prefix)' },
  { format: 'tm-id', voiceId: 'tm-8q7k8q', name: 'Adam (tm- prefix)' },
  { format: 'without-prefix', voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (ID only)' },
];

async function testKIEVoice(modelId, voiceFormat) {
  console.log(`\n========================================`);
  console.log(`Testing: ${modelId}`);
  console.log(`Voice format: ${voiceFormat.format} - ${voiceFormat.name}`);
  console.log(`Voice value: "${voiceFormat.voiceId}"`);
  console.log(`========================================`);

  try {
    const inputData = {
      text: 'Hello, this is a test.',
      voice: voiceFormat.voiceId,
    };

    // For dialogue models, use different format
    if (modelId.includes('dialogue')) {
      inputData.dialogue = [{ text: 'Hello, this is a test.', voice: voiceFormat.voiceId }];
      delete inputData.text;
      delete inputData.voice;
    }

    console.log(`Request payload:`, JSON.stringify({
      model: modelId,
      input: inputData,
    }, null, 2));

    const response = await fetch(`${KIE_API_URL}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        input: inputData,
      }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (data.code === 200) {
      console.log(`✅ SUCCESS! Task ID: ${data.data?.taskId}`);
      return { ...voiceFormat, success: true, taskId: data.data?.taskId };
    } else {
      console.log(`❌ FAILED: ${data.msg || data.message}`);
      return { ...voiceFormat, success: false, error: data.msg || data.message };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { ...voiceFormat, success: false, error: error.message };
  }
}

async function testAllCombinations() {
  console.log('KIE AI TTS Voice Support Test');
  console.log('=================================\n');
  console.log('Testing different voice formats to find what KIE accepts...\n');

  const results = [];

  for (const model of MODELS) {
    console.log(`\n>>> Testing model: ${model} <<<`);

    for (const voiceFormat of TEST_VOICE_FORMATS) {
      const result = await testKIEVoice(model, voiceFormat);
      results.push({ model, ...result });

      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));

      // If we found a working format, we can stop testing other formats for this model
      if (result.success) {
        console.log(`\n🎉 Found working format for ${model}: ${result.format}`);
        break;
      }
    }
  }

  console.log('\n\n========================================');
  console.log('FINAL SUMMARY');
  console.log('========================================');

  for (const model of MODELS) {
    console.log(`\n${model}:`);
    const modelResults = results.filter(r => r.model === model);
    const workingFormats = modelResults.filter(r => r.success);
    const failedFormats = modelResults.filter(r => !r.success);

    if (workingFormats.length > 0) {
      console.log(`  ✅ Working format: ${workingFormats[0].format} - "${workingFormats[0].voiceId}"`);
      console.log(`     (${workingFormats[0].name})`);
    } else {
      console.log(`  ❌ No working formats found`);
      console.log(`  Failed formats:`, failedFormats.map(f => `${f.format} (${f.error?.substring(0, 50)}...)`));
    }
  }

  console.log('\n========================================');
  console.log('RECOMMENDATION');
  console.log('========================================');
  const anySuccess = results.some(r => r.success);
  if (anySuccess) {
    console.log('✅ At least one voice format works!');
    console.log('Update the API endpoint to use the working format.');
  } else {
    console.log('❌ None of the tested formats work.');
    console.log('Possible issues:');
    console.log('  - KIE API key is invalid or lacks permissions');
    console.log('  - KIE account has insufficient credits');
    console.log('  - Models require a higher subscription tier');
    console.log('  - KIE has a different voice format not tested');
  }
}

// Run tests
testAllCombinations().catch(console.error);
