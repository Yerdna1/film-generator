# KIE.ai Model Selection Flow - Complete Documentation

## Overview

This document explains how the KIE.ai model selection flows from the UI (database models) to the actual API call.

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER SELECTION                                 │
│                     (VideoTab.tsx / ImageTab.tsx)                          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROJECT CONFIGURATION                                     │
│                 project.modelConfig.video.model                              │
│                                                                              │
│  Example: "veo/3.1-text-to-video-fast-5s-720p"                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLIENT SIDE (useVideoGenerator.ts)                     │
│                                                                              │
│  const modelConfig = project.modelConfig;                                   │
│  const videoModel = modelConfig?.video?.model;                              │
│                                                                              │
│  // Sends in POST body                                                      │
│  fetch('/api/video', {                                                      │
│    body: JSON.stringify({                                                   │
│      model: videoModel,  // ← "veo/3.1-text-to-video-fast-5s-720p"        │
│      videoProvider: 'kie',                                                  │
│      ...                                                                    │
│    })                                                                       │
│  })                                                                         │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   SERVER SIDE (/api/video/route.ts)                         │
│                                                                              │
│  const { model: requestModel } = await request.json();                      │
│  let kieVideoModel = requestModel || 'grok-imagine/image-to-video';         │
│                                                                              │
│  // Calls KIE.ai with the specific model                                    │
│  await createKieTask(imageUrl, prompt, mode, seed, kieApiKey, kieVideoModel)│
│                                                                              │
│  // KIE.ai API call:                                                        │
│  POST https://api.kie.ai/api/v1/jobs/createTask                             │
│  {                                                                          │
│    "model": "veo/3.1-text-to-video-fast-5s-720p",  // ← Used here!        │
│    "input": {                                                               │
│      "image_urls": [...],                                                   │
│      "prompt": "..."                                                        │
│    }                                                                        │
│  }                                                                          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KIE.AI API SERVER                                  │
│                                                                              │
│  Processes request using model: "veo/3.1-text-to-video-fast-5s-720p"        │
│  - Generates 5-second video                                                 │
│  - At 720p resolution                                                       │
│  - Using fast quality                                                       │
│  - Costs 38 credits ($0.19)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Components

### 1. **Database Models** (`KieVideoModel` table)

```sql
modelId: "veo/3.1-text-to-video-fast-5s-720p"
name: "Google Veo 3.1 Text to Video Fast 720p (5s)"
provider: "Google"
quality: "fast"
length: "5s"
credits: 38
cost: 0.19
supportedResolutions: ["720p"]
supportedDurations: ["5s"]
```

### 2. **UI Selection** (`VideoTab.tsx`)

```typescript
// When user selects model, combo boxes auto-adjust and disable
const isModelSpecificParams = !!modelConfig;

// Duration is set from model.length
const currentDuration = modelConfig?.length || '5s';

// Resolution is set from model.defaultResolution
const currentResolution = modelConfig?.defaultResolution || '720p';

// Combo boxes are disabled when model is selected
<Select disabled={disabled || isModelSpecificParams}>
```

### 3. **Project Configuration** (stored in database)

```typescript
// In Project.modelConfig
{
  video: {
    provider: "kie",
    model: "veo/3.1-text-to-video-fast-5s-720p",  // ← Selected model
    videoDuration: "5s",    // Auto-set from model
    videoResolution: "720p", // Auto-set from model
    videoAspectRatio: "16:9" // Auto-set from model
  }
}
```

### 4. **API Request** (`/api/video/route.ts`)

```typescript
// POST body includes the model
{
  "imageUrl": "https://...",
  "prompt": "A beautiful sunset...",
  "model": "veo/3.1-text-to-video-fast-5s-720p",  // ← This is used!
  "videoProvider": "kie",
  "projectId": "..."
}

// Server extracts and uses it
const { model: requestModel } = await request.json();
let kieVideoModel = requestModel || 'grok-imagine/image-to-video';

// Calls KIE.ai with exact model
await createKieTask(..., kieVideoModel)
```

### 5. **KIE.ai API Call**

```bash
curl -X POST https://api.kie.ai/api/v1/jobs/createTask \
  -H "Authorization: Bearer YOUR_KIE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "veo/3.1-text-to-video-fast-5s-720p",
    "input": {
      "image_urls": ["https://example.com/image.jpg"],
      "prompt": "A beautiful sunset over the ocean",
      "mode": "normal"
    }
  }'
```

---

## 🧪 Testing

### Manual Test with cURL

```bash
# 1. Get your KIE API key from .env.local
export KIE_API_KEY="your_kie_api_key"

# 2. Call the video API directly
curl -X POST http://localhost:3000/api/video \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://picsum.photos/1024/1024",
    "prompt": "A beautiful sunset over the ocean",
    "mode": "normal",
    "model": "veo/3.1-text-to-video-fast-5s-720p",
    "videoProvider": "kie"
  }'

# 3. Poll for status using the returned taskId
curl "http://localhost:3000/api/video?taskId=TASK_ID&model=veo/3.1-text-to-video-fast-5s-720p"
```

### Using the Test Script

```bash
# Make it executable
chmod +x scripts/test-video-api-model.js

# Run with default options
node scripts/test-video-api-model.js

# Choose specific model
node scripts/test-video-api-model.js 1

# Test via Next.js API
node scripts/test-video-api-model.js 1 nextjs

# Test direct KIE.ai API
node scripts/test-video-api-model.js 1 direct "https://picsum.photos/1024/1024"
```

---

## ✅ Verification Checklist

To verify the model is being used correctly:

- [ ] **UI**: Select a model in VideoTab, verify combo boxes show correct parameters
- [ ] **UI**: Verify combo boxes are disabled when model is selected
- [ ] **Project**: Check that `project.modelConfig.video.model` is saved to database
- [ ] **Client**: Check browser network tab for POST to `/api/video`
- [ ] **Request Body**: Verify `model` field is included in POST body
- [ ] **Server**: Check server logs for `[Video] Using model: veo/3.1-text-to-video-fast-5s-720p`
- [ ] **KIE.ai**: Check that the correct model was used (credits match database)

---

## 📝 Example Scenarios

### Scenario 1: User selects "Google Veo 3.1 Fast 720p (5s)"

**Database Model:**
```json
{
  "modelId": "veo/3.1-text-to-video-fast-5s-720p",
  "name": "Google Veo 3.1 Text to Video Fast 720p (5s)",
  "quality": "fast",
  "length": "5s",
  "credits": 38,
  "cost": 0.19,
  "supportedResolutions": ["720p"],
  "supportedDurations": ["5s"]
}
```

**UI Behavior:**
- Duration combo box shows "5s" and is disabled
- Resolution combo box shows "720p" and is disabled
- Aspect ratio shows "16:9" and is disabled
- Model info displays: "Cost: 38 credits ($0.19) per video"

**API Call:**
```json
POST /api/video
{
  "imageUrl": "https://...",
  "prompt": "A sunset...",
  "model": "veo/3.1-text-to-video-fast-5s-720p",
  "videoProvider": "kie"
}
```

**KIE.ai Request:**
```json
POST https://api.kie.ai/api/v1/jobs/createTask
{
  "model": "veo/3.1-text-to-video-fast-5s-720p",
  "input": {
    "image_urls": ["https://..."],
    "prompt": "A sunset..."
  }
}
```

**Result:**
- 5-second video generated at 720p resolution
- User charged 38 credits ($0.19)
- ✅ Correct model was used!

---

## 🔧 Troubleshooting

### Problem: Wrong model is being used

**Check:**
1. Browser DevTools → Network → POST /api/video → Request Payload
2. Verify `model` field matches selected model
3. Check server logs: `[Video] Using model: ...`

### Problem: Parameters are not matching the model

**Check:**
1. Verify combo boxes are disabled when model is selected
2. Check `project.modelConfig.video` in database
3. Ensure duration/resolution match model defaults

### Problem: Cost doesn't match database

**Check:**
1. Look up model in `KieVideoModel` table
2. Verify credits field
3. Check server logs for actual KIE.ai response

---

## 🎯 Summary

The flow is:

1. **UI**: User selects model → combo boxes auto-adjust to model parameters
2. **Project**: Model ID saved to `project.modelConfig.video.model`
3. **Client**: Sends `model` in POST body to `/api/video`
4. **Server**: Extracts `model` from request body
5. **KIE.ai**: API called with exact model ID from database
6. **Result**: Video generated using correct model with correct parameters and cost

✅ **The selected model IS being used for the actual API call!**
