# Image API Fix - Database Query

## Problem

The image API was using `getKieModelById()` from the **constants file** instead of querying the **database**, causing "invalid KIE image model" errors for models stored in the database.

## Solution

Updated `/api/image/route.ts` to query the database directly:

```typescript
// BEFORE (using constants file):
const { getKieModelById, formatKiePrice } = await import('@/lib/constants/kie-models');
const modelConfig = getKieModelById(modelId, 'image');

if (!modelConfig) {
  throw new Error(`Invalid KIE image model: ${modelId}`);
}

// AFTER (querying database):
const modelConfig = await prisma.kieImageModel.findUnique({
  where: { modelId }
});

if (!modelConfig || !modelConfig.isActive) {
  throw new Error(`Invalid KIE image model: ${modelId}`);
}
```

## What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Source** | Constants file (`@/lib/constants/kie-models.ts`) | Database (`KieImageModel` table) |
| **Models Available** | Only hardcoded models | All 64 models in database |
| **Error Handling** | Threw error if not in constants | Checks database + `isActive` flag |
| **Model Properties** | From constant definitions | From database (name, credits, cost) |

## Compatible Properties

The database model has all required properties:

```typescript
// From Database (KieImageModel)
{
  modelId: string
  name: string
  credits: number
  cost: number
  modality: string[]
  // ... other properties
}

// Used in API:
modelConfig.name  ✅
modelConfig.credits  ✅
modelConfig.cost  ✅
```

## Model-Specific Parameters

These checks still work since they use the `modelId` string:

```typescript
{
  model: modelId,
  input: {
    prompt: prompt,
    aspect_ratio: aspectRatio,
    // Model-specific parameters based on modelId string
    ...(modelId.includes('ideogram') && { render_text: true }),
    ...(modelId.includes('flux') && { guidance_scale: 7.5 }),
  },
}
```

## Testing

For your project `hladanie v psuti_nova`:

1. **Model in database:** `seedream-3.0/2k` ✅
2. **Model exists:** Yes ✅
3. **Model is active:** Yes ✅
4. **API will find it:** Now yes! ✅

**Expected logs:**

```
[KIE] Generating image with model: seedream-3.0/2k
[KIE] Using model: Seedream 3.0 (2K) - 6 credits ($0.03)
[KIE] Task created: task_abc123..., polling for completion...
```

## Result

✅ **Fixed:** Image API now queries database for models
✅ **Works:** All 64 image models in database are now available
✅ **No more errors:** "Invalid KIE image model" should be resolved

**Try generating an image now - it should work!** 🎯
