# API Wrapper Migration Guide

This guide explains how to migrate from direct API calls to the centralized API wrapper system.

## Overview

The centralized API wrapper ensures:
- All API configurations come from your Settings (single source of truth)
- No hardcoded API endpoints, models, or keys
- Consistent error handling and logging
- Loading messages for better UX
- Proper authentication headers

## Key Changes

### 1. Created Files

- `/src/lib/providers/api-wrapper.ts` - Centralized API wrapper
- `/src/lib/constants/api-endpoints.ts` - All API endpoints in one place
- `/src/app/api/llm/prompt/route-refactored.ts` - Example of refactored route

### 2. Benefits

- **Single Source of Truth**: All API calls use the provider configuration from Settings
- **No Hardcoded Values**: API endpoints and models are centralized
- **Consistent Error Handling**: Unified error extraction and user-friendly messages
- **Loading States**: Built-in loading message support
- **Type Safety**: Full TypeScript support

## Migration Steps

### Step 1: Replace Direct Fetch Calls

**Before:**
```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ model, messages, max_tokens }),
});
```

**After:**
```typescript
import { callExternalApi } from '@/lib/providers/api-wrapper';

const response = await callExternalApi({
  userId,
  projectId,
  type: 'llm',
  body: { model, messages, max_tokens },
  showLoadingMessage: true,
  loadingMessage: 'Generating response...',
});

if (response.error) {
  return NextResponse.json({ error: response.error }, { status: response.status });
}

const text = response.data?.choices?.[0]?.message?.content;
```

### Step 2: Remove Hardcoded URLs

**Before:**
```typescript
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const KIE_CREATE_TASK = 'https://api.kie.ai/api/v1/jobs/createTask';
```

**After:**
```typescript
import { getEndpointUrl } from '@/lib/constants/api-endpoints';

const url = getEndpointUrl('gemini', 'generateContent', model);
const kieUrl = getEndpointUrl('kie', 'createTask');
```

### Step 3: Use Provider Config

**Before:**
```typescript
// Hardcoded model selection
const model = 'anthropic/claude-4.5-sonnet';
const provider = 'openrouter';
```

**After:**
```typescript
import { getProviderConfig } from '@/lib/providers';

const config = await getProviderConfig({
  userId,
  projectId,
  type: 'llm',
});

// Uses settings from database/project config
const { provider, model, apiKey } = config;
```

### Step 4: KIE Task Polling

**Before:**
```typescript
// Manual polling with hardcoded URL
while (polls < maxPolls) {
  const response = await fetch(
    `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );
  // ... polling logic
}
```

**After:**
```typescript
import { pollKieTask } from '@/lib/providers/api-wrapper';

const taskData = await pollKieTask(taskId, apiKey);
```

## API Wrapper Usage

### Basic Usage

```typescript
import { callExternalApi } from '@/lib/providers/api-wrapper';

// LLM Call
const llmResponse = await callExternalApi({
  userId: session.user.id,
  projectId: project.id,
  type: 'llm',
  body: {
    messages: [...],
    max_tokens: 8192,
  },
});

// Image Generation
const imageResponse = await callExternalApi({
  userId: session.user.id,
  projectId: project.id,
  type: 'image',
  body: {
    prompt: 'A beautiful landscape',
    aspect_ratio: '16:9',
  },
});
```

### Error Handling

```typescript
const response = await callExternalApi({ ... });

if (response.error) {
  // Error is already user-friendly
  return NextResponse.json(
    { error: response.error },
    { status: response.status }
  );
}

// Success - use response.data
const result = response.data;
```

### Custom Endpoints (Modal)

```typescript
// For Modal or other custom endpoints
const response = await callExternalApi({
  userId,
  projectId,
  type: 'llm',
  endpoint: userApiKeys.modalLlmEndpoint, // Custom endpoint
  body: { prompt, system_prompt },
});
```

## Files to Migrate

Priority files that need migration:

1. **API Routes** (High Priority)
   - `/src/app/api/llm/prompt/route.ts` → Use wrapper
   - `/src/app/api/image/route.ts` → Use wrapper
   - `/src/app/api/video/route.ts` → Use wrapper
   - `/src/app/api/tts/route.ts` → Use wrapper
   - `/src/app/api/music/route.ts` → Use wrapper

2. **Service Files** (Medium Priority)
   - `/src/lib/services/openrouter.ts` → Remove, use wrapper
   - `/src/lib/services/gemini.ts` → Update to use wrapper
   - `/src/lib/services/grok.ts` → Update to use wrapper
   - `/src/lib/services/elevenlabs.ts` → Update to use wrapper

3. **Inngest Functions** (Medium Priority)
   - `/src/lib/inngest/functions/generate-images.ts` → Use wrapper
   - `/src/lib/inngest/functions/generate-videos.ts` → Use wrapper

4. **Provider Implementations** (Low Priority)
   - `/src/lib/providers/*/` → Update to use wrapper internally

## Testing

After migration, test:

1. **Configuration Priority**: Ensure project settings override user settings
2. **API Keys**: Verify correct key is used (user vs organization vs env)
3. **Error Messages**: Check that errors are user-friendly
4. **Loading States**: Verify loading messages appear
5. **Model Selection**: Ensure correct models are used from settings

## Rollback

If issues occur, the original files are preserved. You can rollback by:
1. Reverting changes to use direct fetch calls
2. Re-adding hardcoded URLs (not recommended)

## Next Steps

1. Start with one API route (e.g., LLM prompt)
2. Test thoroughly
3. Migrate remaining routes
4. Remove old service files
5. Update documentation

The centralized wrapper ensures your Settings are the single source of truth for all API integrations.