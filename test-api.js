// Test script to verify the database-driven provider and model APIs

const testAPIs = async () => {
  const baseURL = 'http://localhost:3000';

  console.log('Testing Provider and Model APIs...\n');

  try {
    // Test 1: Get all providers
    console.log('1. Testing GET /api/providers');
    const providersRes = await fetch(`${baseURL}/api/providers`);
    if (!providersRes.ok) {
      console.log(`   ❌ Failed: ${providersRes.status} ${providersRes.statusText}`);
    } else {
      const data = await providersRes.json();
      console.log(`   ✅ Success: Found ${data.providers?.length || 0} providers`);
    }

    // Test 2: Get providers by modality
    console.log('\n2. Testing GET /api/providers?modality=image');
    const imageProvidersRes = await fetch(`${baseURL}/api/providers?modality=image`);
    if (!imageProvidersRes.ok) {
      console.log(`   ❌ Failed: ${imageProvidersRes.status} ${imageProvidersRes.statusText}`);
    } else {
      const data = await imageProvidersRes.json();
      console.log(`   ✅ Success: Found ${data.providers?.length || 0} image providers`);
    }

    // Test 3: Get image models
    console.log('\n3. Testing GET /api/models/image');
    const imageModelsRes = await fetch(`${baseURL}/api/models/image`);
    if (!imageModelsRes.ok) {
      console.log(`   ❌ Failed: ${imageModelsRes.status} ${imageModelsRes.statusText}`);
    } else {
      const data = await imageModelsRes.json();
      console.log(`   ✅ Success: Found ${data.models?.length || 0} image models`);
    }

    // Test 4: Get KIE-specific models
    console.log('\n4. Testing GET /api/models/image?providerId=kie');
    const kieModelsRes = await fetch(`${baseURL}/api/models/image?providerId=kie`);
    if (!kieModelsRes.ok) {
      console.log(`   ❌ Failed: ${kieModelsRes.status} ${kieModelsRes.statusText}`);
    } else {
      const data = await kieModelsRes.json();
      console.log(`   ✅ Success: Found ${data.models?.length || 0} KIE image models`);
    }

    console.log('\n✨ API testing complete!');
    console.log('\nNote: If you see 401 Unauthorized errors, that\'s expected - the APIs require authentication.');
    console.log('The important thing is that the endpoints exist and respond correctly.\n');

  } catch (error) {
    console.error('Error testing APIs:', error.message);
    console.log('\nMake sure the development server is running on http://localhost:3000');
  }
};

testAPIs();