# Provider System Migration Guide

## Overview

The new provider system dramatically simplifies our generation routes by extracting common patterns into reusable components. Routes that were 400-700+ lines are now ~100 lines.

## Key Changes

### Before (Old Pattern)
```typescript
// 700+ lines in route.ts
async function generateWithGemini(...) { /* 150 lines */ }
async function generateWithModal(...) { /* 200 lines */ }
async function generateWithKie(...) { /* 250 lines */ }

export const POST = withAuth(async (request, _, { userId }) => {
  // 100+ lines of provider selection logic
  // 50+ lines of credit checking
  // Complex if/else routing
});
```

### After (New Pattern)
```typescript
// ~100 lines total
import '@/lib/providers/all-providers'; // Register providers

export const POST = withAuth(async (request, _, { userId }) => {
  const config = await getProviderConfig({ userId, type: 'image', ... });
  const provider = createProvider('image', config);

  const result = await withCredits({
    userId,
    action: 'image',
    provider: config.provider,
    execute: () => provider.generate(request)
  });

  return NextResponse.json(result);
});
```

## Migration Steps

### 1. Import Provider System
```typescript
import { createProvider, getProviderConfig } from '@/lib/providers';
import { withCredits } from '@/lib/api/generation';
import '@/lib/providers/all-providers'; // Ensure providers are registered
```

### 2. Replace Provider Selection Logic
```typescript
// Old way
let imageProvider = requestProvider || 'gemini';
if (userApiKeys) {
  imageProvider = userApiKeys.imageProvider || imageProvider;
  // ... 50 more lines
}

// New way
const config = await getProviderConfig({
  userId,
  type: 'image',
  requestProvider,
  projectId,
  settingsUserId,
  ownerId,
});
```

### 3. Replace Generation Functions
```typescript
// Old way
if (provider === 'gemini') {
  result = await generateWithGemini(...);
} else if (provider === 'modal') {
  result = await generateWithModal(...);
}

// New way
const provider = createProvider('image', config);
const result = await provider.generate(request);
```

### 4. Use Credit Wrapper
```typescript
// Old way
const insufficientCredits = await requireCredits(userId, creditCost);
if (insufficientCredits) return insufficientCredits;
// ... generation code
await spendCredits(userId, creditCost, ...);

// New way
const result = await withCredits({
  userId,
  action: 'image',
  provider: config.provider,
  execute: () => provider.generate(request)
});
```

## Provider Implementation

### Adding a New Provider

1. Create provider class:
```typescript
@RegisterProvider('image', 'new-provider', {
  description: 'My new provider',
  features: ['Feature 1', 'Feature 2'],
  costPerUnit: 0.02,
  isAsync: false,
})
export class NewImageProvider extends BaseImageProvider {
  name = 'new-provider';

  async validateConfig(): Promise<void> {
    // Validate API key or endpoint
  }

  async generateImage(...): Promise<{ base64: string; mimeType: string }> {
    // Implementation
  }
}
```

2. Add to index:
```typescript
// src/lib/providers/image/index.ts
import './new-provider';
export { NewImageProvider } from './new-provider';
```

### Async Providers (with Polling)

For providers that return a task ID and require polling:

```typescript
export class AsyncMusicProvider extends BaseMusicProvider implements AsyncProvider<...> {
  async createTask(request): Promise<{ taskId: string }> {
    // Create async task
  }

  async checkStatus(taskId: string): Promise<TaskStatus> {
    // Check task status
  }

  async getResult(taskId: string): Promise<MusicGenerationResponse> {
    // Get final result
  }

  async generateMusic(...) {
    // Uses the async workflow automatically
    const task = await this.createTask(...);
    const result = await pollTask({
      taskId: task.taskId,
      checkStatus: (id) => this.checkStatus(id),
    });
    return this.getResult(task.taskId);
  }
}
```

## Using the v2 API

### Single Generation
```typescript
POST /api/v2/generations
{
  "type": "image",
  "provider": "gemini", // Optional, auto-selected if not provided
  "config": {
    "prompt": "A beautiful sunset",
    "resolution": "2k",
    "aspectRatio": "16:9"
  },
  "metadata": {
    "projectId": "...",
    "sceneId": "..."
  }
}
```

### Batch Generation
```typescript
POST /api/v2/generations/batch
{
  "items": [
    { "type": "image", "config": { "prompt": "Image 1" } },
    { "type": "tts", "config": { "text": "Hello world" } },
    { "type": "video", "config": { "imageUrl": "...", "prompt": "..." } }
  ],
  "parallel": true,
  "continueOnError": true
}
```

### Provider Health Check
```typescript
GET /api/v2/providers/health
// Returns health status for all providers

GET /api/v2/providers/image
// Lists available image providers with costs
```

## Benefits

1. **Code Reduction**: 500-700 lines of duplicate code eliminated
2. **Consistency**: All providers follow the same pattern
3. **Extensibility**: New providers added in <1 hour
4. **Testability**: Providers can be unit tested in isolation
5. **Type Safety**: Full TypeScript support throughout
6. **Error Handling**: Centralized error handling with specific error types
7. **Cost Tracking**: Automatic credit and real cost tracking
8. **Provider Failover**: Easy to implement with the new system
9. **Batch Processing**: Built-in support for multiple generations
10. **Webhooks**: Async completion notifications

## Common Patterns

### Provider with Reference Images
```typescript
const result = await provider.generate({
  prompt: "Character in a new scene",
  referenceImages: [
    { name: "Main character", imageUrl: "..." }
  ],
  aspectRatio: "16:9"
});
```

### Async Task Polling
```typescript
// Handled automatically by the provider
const result = await provider.generate(request);
// Provider internally polls until complete
```

### Custom Model Selection
```typescript
const config = await getProviderConfig({ ... });
config.model = 'custom-model-id';
const provider = createProvider('video', config);
```

### Error Handling
```typescript
try {
  const result = await provider.generate(request);
} catch (error) {
  if (error instanceof ProviderRateLimitError) {
    // Handle rate limit
  } else if (error instanceof ProviderAuthError) {
    // Handle auth error
  }
}
```

## Testing

```typescript
// Mock provider for testing
class MockImageProvider extends BaseImageProvider {
  async generateImage() {
    return {
      base64: 'mock-base64-data',
      mimeType: 'image/png'
    };
  }
}

// Register mock provider
providerRegistry.register('image', 'mock', MockImageProvider, {
  name: 'Mock Provider',
  description: 'For testing',
  features: [],
  costPerUnit: 0,
  isAsync: false,
});
```

## Monitoring

The new system provides built-in monitoring capabilities:

- Provider health checks
- Success/failure rates
- Latency tracking
- Cost tracking per provider
- Error logging with context

## Future Enhancements

1. **Provider Failover**: Automatic fallback to secondary providers
2. **Smart Routing**: Route to fastest/cheapest provider based on requirements
3. **Caching**: Cache results for identical requests
4. **Rate Limiting**: Per-provider rate limits
5. **A/B Testing**: Test different providers for quality comparison