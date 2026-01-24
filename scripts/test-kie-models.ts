import { prisma } from '../src/lib/db/prisma';

/**
 * Test script to validate which KIE image models are actually supported by the KIE API.
 *
 * This script will:
 * 1. Get all active KIE image models from the database
 * 2. Test each model by making a minimal createTask request
 * 3. Report which models return success vs error
 */

interface ModelTestResult {
  modelId: string;
  apiModelId: string | null;
  name: string;
  status: 'valid' | 'invalid' | 'error';
  message: string;
}

async function getKieApiKey(): Promise<string> {
  // Get a KIE API key from organization or user settings
  const orgKey = await prisma.organizationApiKeys.findFirst({
    where: { kieApiKey: { not: null } },
    select: { kieApiKey: true }
  });

  if (orgKey?.kieApiKey) {
    return orgKey.kieApiKey;
  }

  // Fallback to user API keys
  const userKey = await prisma.apiKeys.findFirst({
    where: { kieApiKey: { not: null } },
    select: { kieApiKey: true }
  });

  if (userKey?.kieApiKey) {
    return userKey.kieApiKey;
  }

  throw new Error('No KIE API key found in database');
}

async function testModel(apiKey: string, model: { modelId: string; apiModelId: string | null; name: string }): Promise<ModelTestResult> {
  const apiModelId = model.apiModelId || model.modelId;

  try {
    const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: apiModelId,
        input: {
          prompt: 'test',
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.data?.taskId) {
      return {
        modelId: model.modelId,
        apiModelId: model.apiModelId,
        name: model.name,
        status: 'valid',
        message: `Task created: ${data.data.taskId}`,
      };
    }

    // Check if error is about model not supported
    if (data?.code === 422 || data?.msg?.includes?.('not supported')) {
      return {
        modelId: model.modelId,
        apiModelId: model.apiModelId,
        name: model.name,
        status: 'invalid',
        message: data.msg || data.message || 'Model not supported',
      };
    }

    // Other errors
    return {
      modelId: model.modelId,
      apiModelId: model.apiModelId,
      name: model.name,
      status: 'error',
      message: `HTTP ${response.status}: ${data?.msg || data?.message || response.statusText}`,
    };
  } catch (error) {
    return {
      modelId: model.modelId,
      apiModelId: model.apiModelId,
      name: model.name,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testKieModels() {
  console.log('========================================');
  console.log('KIE Image Models Validation Test');
  console.log('========================================\n');

  // Get KIE API key
  const apiKey = await getKieApiKey();
  console.log('✓ Found KIE API key\n');

  // Get all active models from our database
  const dbModels = await prisma.kieImageModel.findMany({
    where: { isActive: true },
    select: {
      modelId: true,
      apiModelId: true,
      name: true,
      provider: true,
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Testing ${dbModels.length} active models...\n`);

  const results: ModelTestResult[] = [];

  for (let i = 0; i < dbModels.length; i++) {
    const model = dbModels[i];
    console.log(`[${i + 1}/${dbModels.length}] Testing ${model.name}...`);

    const result = await testModel(apiKey, model);
    results.push(result);

    const icon = result.status === 'valid' ? '✓' : result.status === 'invalid' ? '✗' : '?';
    console.log(`  ${icon} ${result.status.toUpperCase()}: ${result.message}`);
    console.log(`     modelId: ${model.modelId}, apiModelId: ${model.apiModelId || '(null)'}`);
    console.log('');
  }

  // Summary
  const valid = results.filter(r => r.status === 'valid');
  const invalid = results.filter(r => r.status === 'invalid');
  const errors = results.filter(r => r.status === 'error');
  const nullApiModelId = dbModels.filter(m => !m.apiModelId);

  console.log('========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`\nTotal models tested: ${dbModels.length}`);
  console.log(`✓ Valid:   ${valid.length}`);
  console.log(`✗ Invalid: ${invalid.length}`);
  console.log(`? Errors:  ${errors.length}`);
  console.log(`⚠ Null apiModelId: ${nullApiModelId.length}`);

  if (valid.length > 0) {
    console.log('\n========================================');
    console.log('VALID MODELS');
    console.log('========================================');
    for (const r of valid) {
      console.log(`\n✓ ${r.name}`);
      console.log(`  modelId:    ${r.modelId}`);
      console.log(`  apiModelId: ${r.apiModelId || '(null)'}`);
      console.log(`  Message:    ${r.message}`);
    }
  }

  if (invalid.length > 0) {
    console.log('\n========================================');
    console.log('INVALID MODELS (Need Fixing)');
    console.log('========================================');
    for (const r of invalid) {
      console.log(`\n✗ ${r.name}`);
      console.log(`  modelId:    ${r.modelId}`);
      console.log(`  apiModelId: ${r.apiModelId || '(null)'}`);
      console.log(`  Reason:     ${r.message}`);
    }
  }

  if (errors.length > 0) {
    console.log('\n========================================');
    console.log('MODELS WITH ERRORS');
    console.log('========================================');
    for (const r of errors) {
      console.log(`\n? ${r.name}`);
      console.log(`  modelId:    ${r.modelId}`);
      console.log(`  apiModelId: ${r.apiModelId || '(null)'}`);
      console.log(`  Error:      ${r.message}`);
    }
  }

  if (nullApiModelId.length > 0) {
    console.log('\n========================================');
    console.log('MODELS WITH NULL apiModelId');
    console.log('========================================');
    for (const m of nullApiModelId) {
      console.log(`⚠ ${m.name} (modelId: ${m.modelId})`);
    }
  }

  return { valid, invalid, errors, nullApiModelId };
}

testKieModels()
  .then((results) => {
    console.log('\n========================================');
    console.log('Test completed!');
    console.log('========================================');
    process.exit(results.invalid.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\nError during test:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
