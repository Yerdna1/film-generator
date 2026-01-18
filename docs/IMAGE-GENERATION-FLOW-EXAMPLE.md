# Image Generation Flow - Project: hladanie v psuti_nova

## Current Configuration

**Project:** hladanie v psuti_nova (cmkivtwqv0005l80499cyfuzx)

| Setting | Value | Source |
|----------|-------|--------|
| **Provider** | `kie` | project.modelConfig.image.provider |
| **Model** | `seedream-3.0/2k` | project.modelConfig.image.model |
| **Character Aspect Ratio** | `1:1` | project.modelConfig.image.characterAspectRatio |
| **Scene Aspect Ratio** | `16:9` | project.modelConfig.image.sceneAspectRatio |
| **Scene Resolution** | `2k` | project.modelConfig.image.sceneResolution |

---

## Model Details from Database

**Model:** `seedream-3.0/2k`
- **Name:** Seedream 3.0 (2K)
- **Provider:** ByteDance
- **Credits:** 6 credits per image
- **Cost:** $0.03 per image
- **Modality:** text-to-image
- **Supported Resolutions:** 2K

---

## What Happens When You Click "Generate Image"

### 1. **UI → Client Hook**

```typescript
// Image generation triggered
const prompt = "A beautiful landscape..."; // from scene description
const aspectRatio = "16:9"; // from project.config.image.sceneAspectRatio
const resolution = "2k"; // from project.config.image.sceneResolution
const provider = "kie"; // from project.modelConfig.image.provider
const model = "seedream-3.0/2k"; // from project.modelConfig.image.model

// Client sends request
fetch('/api/image', {
  method: 'POST',
  body: JSON.stringify({
    prompt,
    aspectRatio,
    resolution,
    provider: 'kie',
    model: 'seedream-3.0/2k',
    projectId: 'cmkivtwqv0005l80499cyfuzx'
  })
})
```

### 2. **API Route Processing**

```typescript
// /api/image/route.ts - POST handler

const { prompt, aspectRatio, resolution, provider, model, projectId } = await request.json();

// Provider from request: "kie"
// Model from request: "seedream-3.0/2k"

let imageProvider = provider || 'gemini'; // "kie"
let kieImageModel = model || 'seedream/4-5-text-to-image'; // "seedream-3.0/2k"

console.log(`[Image] Using provider: ${imageProvider}, model: ${kieImageModel}`);
// Output: [Image] Using provider: kie, model: seedream-3.0/2k

// Route to KIE.ai generation
const result = await generateWithKie(
  prompt,
  aspectRatio,
  resolution,
  projectId,
  kieApiKey,
  kieImageModel, // "seedream-3.0/2k"
  userId
);
```

### 3. **KIE.ai API Call**

```typescript
// generateWithKie function

const KIE_API_URL = 'https://api.kie.ai';

// Fetch model config from database
const modelConfig = getKieModelById('seedream-3.0/2k', 'image');
// {
//   modelId: 'seedream-3.0/2k',
//   name: 'Seedream 3.0 (2K)',
//   provider: 'ByteDance',
//   credits: 6,
//   cost: 0.03,
//   modality: ['text-to-image']
// }

const createResponse = await fetch(`${KIE_API_URL}/api/v1/jobs/createTask`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${kieApiKey}`,
  },
  body: JSON.stringify({
    model: 'seedream-3.0/2k', // ← YOUR SELECTED MODEL!
    input: {
      prompt: 'A beautiful landscape...',
      aspect_ratio: '16:9',
    },
  }),
});
```

### 4. **KIE.ai Processes Request**

```
POST https://api.kie.ai/api/v1/jobs/createTask
Authorization: Bearer YOUR_KIE_API_KEY

Request Body:
{
  "model": "seedream-3.0/2k",
  "input": {
    "prompt": "A beautiful landscape...",
    "aspect_ratio": "16:9"
  }
}

Response:
{
  "code": 200,
  "data": {
    "taskId": "task_abc123..."
  }
}
```

### 5. **Polling for Completion**

```typescript
// Poll for task completion
const statusResponse = await fetch(
  `${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=task_abc123...`,
  { headers: { 'Authorization': `Bearer ${kieApiKey}` } }
);

// Status: waiting → generating → success

// When success:
{
  "code": 200,
  "data": {
    "state": "success",
    "resultJson": "{\"resultUrls\": [\"https://.../image.jpg\"]}"
  }
}
```

### 6. **Credit Deduction**

```typescript
// Calculate cost based on model
const realCost = modelConfig.cost; // 0.03 USD
const creditCost = getImageCreditCost(resolution); // credits based on resolution

await spendCredits(
  userId,
  creditCost,
  'image',
  `KIE AI Seedream 3.0 (2K) generation (2K)`,
  projectId,
  'kie',
  {
    model: 'seedream-3.0/2k',
    kieCredits: 6
  },
  realCost // 0.03
);

// User charged: 6 credits ($0.03)
```

### 7. **Result Stored**

```typescript
// Image URL returned to client
{
  imageUrl: 'https://s3.../generated-image.jpg',
  cost: 0.03,
  storage: 's3'
}

// Saved to project scene
{
  imageUrl: 'https://s3.../generated-image.jpg',
  imageUpdatedAt: '2026-01-18T...'
}
```

---

## Server Logs You'll See

```
[Image] Using provider: kie, model: seedream-3.0/2k, reference images: 0, skipCreditCheck: false, ownerId: none
[KIE] Using model: Seedream 3.0 (2K) - 6 credits ($0.03)
[KIE] Task created: task_abc123..., polling for completion...
[KIE] Task task_abc123... state: waiting
[KIE] Task task_abc123... state: generating
[KIE] Task task_abc123... state: success
```

---

## Summary

✅ **Provider:** KIE.ai
✅ **Model:** seedream-3.0/2k (Seedream 3.0)
✅ **Cost:** 6 credits ($0.03) per image
✅ **Resolution:** 2K
✅ **Aspect Ratio:** 16:9
✅ **Database:** Model exists and is active

**When you click "Generate image", the exact model `seedream-3.0/2k` will be sent to KIE.ai!** 🎯
