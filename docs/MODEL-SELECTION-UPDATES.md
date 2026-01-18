# Model Selection Updates - All API Routes

## Summary

Updated all API routes (Video, Image, TTS, Music) to use the model from `project.modelConfig` for **all users** (free and premium). The model from the request body takes precedence over the `apiKeys` table settings, allowing users to select different models per project.

---

## Changes Made

### 1. **Video API** (`/api/video/route.ts`)

**Interface Update:**
```typescript
interface VideoGenerationRequest {
  // ... existing fields
  videoProvider?: VideoProvider; // Provider from project model config
  model?: string; // Model ID from project model config (e.g., 'veo/3.1-text-to-video-fast-5s-720p')
}
```

**Logic:**
```typescript
// Use model from request body, fallback to default
let kieVideoModel = requestModel || 'grok-imagine/image-to-video';

// Only use database model if not provided in request
if (!requestModel && userApiKeys?.kieVideoModel) {
  kieVideoModel = userApiKeys.kieVideoModel;
}

console.log(`[Video] Using model: ${kieVideoModel}`);
```

**Polling Update:**
```typescript
// GET handler accepts model from query string
const model = searchParams.get('model') || undefined;
let kieVideoModel = model || 'grok-imagine/image-to-video';

// Only use database model if not provided in query string
if (!model && userApiKeys?.kieVideoModel) {
  kieVideoModel = userApiKeys.kieVideoModel;
}
```

---

### 2. **Image API** (`/api/image/route.ts`)

**Interface Update:**
```typescript
interface ImageGenerationRequest {
  // ... existing fields
  imageProvider?: ImageProvider; // Override the default provider from user settings
  model?: string; // Model ID from project model config (for free users)
}
```

**Logic:**
```typescript
// Use provider from request body, fallback to 'gemini'
let imageProvider: ImageProvider = requestProvider || 'gemini';

// Use model from request, fallback to default
let kieImageModel = requestModel || 'seedream/4-5-text-to-image';

// Only use database provider if not provided in request
if (!requestProvider) {
  imageProvider = (userApiKeys.imageProvider as ImageProvider) || 'gemini';
}

// Only use database model if not provided in request
if (!requestModel && userApiKeys.kieImageModel) {
  kieImageModel = userApiKeys.kieImageModel;
}

console.log(`[Image] Using provider: ${imageProvider}, model: ${kieImageModel}`);
```

---

### 3. **TTS API** (`/api/tts/route.ts`)

**Interface Update:**
```typescript
interface TTSRequest {
  // ... existing fields
  provider?: TTSProvider;  // Allow overriding provider from UI
  model?: string; // Model ID from project model config (for KIE TTS)
  // ... other voice customization settings
}
```

**Logic:**
```typescript
// Use provider from request, fallback to default
let ttsProvider: TTSProvider = requestedProvider || 'gemini-tts';

// Use model from request, fallback to default
let kieTtsModel = requestModel || 'elevenlabs/text-to-dialogue-v3';

// Only use DB provider if not specified in request
if (!requestedProvider) {
  ttsProvider = (userApiKeys.ttsProvider as TTSProvider) || 'gemini-tts';
}

// Only use database model if not provided in request
if (!requestModel && userApiKeys.kieTtsModel) {
  kieTtsModel = userApiKeys.kieTtsModel;
}

console.log(`[TTS] Using provider: ${ttsProvider}, model: ${kieTtsModel}`);
```

---

### 4. **Music API** (`/api/music/route.ts`)

**Interface Update:**
```typescript
interface MusicGenerationRequest {
  prompt: string;
  model?: string; // Model ID from project config
  instrumental?: boolean;
  projectId?: string;
  title?: string;
  style?: string;
  provider?: 'piapi' | 'suno' | 'modal' | 'kie'; // Override provider from request
}
```

**Logic:**
```typescript
// Determine which model to use
const kieMusicModel = requestModel || userApiKeys?.kieMusicModel || 'suno/v3-5-music';

console.log(`[Music] Using provider: ${provider}, model: ${kieMusicModel}`);

// Use the kieMusicModel (from request or user settings)
const modelId = kieMusicModel;
```

**Polling Update:**
```typescript
// Use the model from query string or user settings
const modelId = searchParams.get('model') || userApiKeys?.kieMusicModel || 'suno/v3-5-music';
```

---

## Usage Examples

### Video Generation
```typescript
// Client sends:
fetch('/api/video', {
  method: 'POST',
  body: JSON.stringify({
    imageUrl: 'https://...',
    prompt: 'A beautiful sunset',
    model: 'veo/3.1-text-to-video-fast-5s-720p', // ← Selected from database
    videoProvider: 'kie',
    projectId: '...'
  })
})

// Server logs:
// [Video] Using provider: kie, model: veo/3.1-text-to-video-fast-5s-720p

// KIE.ai receives:
// {
//   "model": "veo/3.1-text-to-video-fast-5s-720p",
//   "input": { ... }
// }
```

### Image Generation
```typescript
// Client sends:
fetch('/api/image', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'A beautiful landscape',
    aspectRatio: '16:9',
    resolution: '2k',
    model: 'seedream/4-5-text-to-image', // ← Selected from database
    imageProvider: 'kie',
    projectId: '...'
  })
})

// Server logs:
// [Image] Using provider: kie, model: seedream/4-5-text-to-image
```

### TTS Generation
```typescript
// Client sends:
fetch('/api/tts', {
  method: 'POST',
  body: JSON.stringify({
    text: 'Hello world',
    language: 'en',
    model: 'elevenlabs/text-to-dialogue-v3', // ← Selected from database
    provider: 'kie',
    voiceId: 'Rachel'
  })
})

// Server logs:
// [TTS] Using provider: kie, model: elevenlabs/text-to-dialogue-v3
```

### Music Generation
```typescript
// Client sends:
fetch('/api/music', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'Upbeat pop song',
    instrumental: true,
    model: 'suno/v3-5-music', // ← Selected from database
    provider: 'kie',
    projectId: '...'
  })
})

// Server logs:
// [Music] Using provider: kie, model: suno/v3-5-music
```

---

## Backward Compatibility

All changes maintain **full backward compatibility**:

1. **If `model` is provided in request**: Use it (new behavior)
2. **If `model` is NOT provided**: Fall back to `apiKeys` table (old behavior)
3. **If `provider` is provided in request**: Use it (already existed)
4. **If `provider` is NOT provided**: Fall back to `apiKeys` table (already existed)

This means:
- ✅ Old clients that don't send `model` still work
- ✅ Premium users can still use their `apiKeys` settings
- ✅ New clients can send `model` to override per-project
- ✅ Both systems work seamlessly together

---

## Testing

### Verify Model is Being Used

1. **Select a model in UI** (e.g., "Google Veo 3.1 Fast 720p (5s)")
2. **Generate content** (video/image/TTS/music)
3. **Check server logs:**
   ```
   [Video] Using model: veo/3.1-text-to-video-fast-5s-720p
   [Image] Using model: seedream/4-5-text-to-image
   [TTS] Using provider: kie, model: elevenlabs/text-to-dialogue-v3
   [Music] Using provider: kie, model: suno/v3-5-music
   ```
4. **Verify cost:** Check that credits match the database model's cost

### Manual Test with cURL

```bash
# Video
curl -X POST http://localhost:3000/api/video \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://picsum.photos/1024/1024",
    "prompt": "A sunset",
    "model": "veo/3.1-text-to-video-fast-5s-720p",
    "videoProvider": "kie"
  }'

# Image
curl -X POST http://localhost:3000/api/image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A landscape",
    "model": "seedream/4-5-text-to-image",
    "imageProvider": "kie"
  }'

# TTS
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "model": "elevenlabs/text-to-dialogue-v3",
    "provider": "kie"
  }'

# Music
curl -X POST http://localhost:3000/api/music \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Upbeat song",
    "model": "suno/v3-5-music",
    "provider": "kie"
  }'
```

---

## Summary

✅ **Video API**: Updated to use model from request for all users
✅ **Image API**: Updated to use model from request for all users
✅ **TTS API**: Updated to use model from request for all users
✅ **Music API**: Updated to use model from request for all users
✅ **Backward Compatibility**: Maintained via fallback to `apiKeys` table
✅ **Logging**: Added model to all server logs for debugging

**Result**: All users (free and premium) can now select different models per project, and those models are actually used in the API calls to KIE.ai!
