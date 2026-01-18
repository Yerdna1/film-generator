# FREE User Model Selection - Complete Flow

## Storage Location

**Table:** `Project`
**Column:** `modelConfig` (JSON field)

```sql
model Project {
  id          String   @id @default(cuid())
  name        String
  userId      String
  modelConfig   Json?   ← Models stored here!
  // ... other fields
}
```

---

## How It Works

### 1. **User Selects Models in UI**

```typescript
// VideoTab.tsx
<Select
  value={selectedModelId}
  onValueChange={(value: string) => {
    updateVideo({ model: value }); // Saves to project.modelConfig
  }}
>
```

### 2. **Saved to Database**

When the user clicks "Save" or it auto-saves:

```typescript
// Stored in Project.modelConfig as JSON:
{
  "video": {
    "provider": "kie",
    "model": "veo/3.1-text-to-video-fast-5s-720p",  ← Selected model
    "videoDuration": "5s",
    "videoResolution": "720p",
    "videoAspectRatio": "16:9"
  },
  "image": {
    "provider": "kie",
    "model": "seedream/4-5-text-to-image",  ← Selected model
    "characterAspectRatio": "16:9",
    "sceneAspectRatio": "16:9"
  },
  "tts": {
    "provider": "kie",
    "model": "elevenlabs/text-to-dialogue-v3"  ← Selected model
  },
  "music": {
    "provider": "kie",
    "model": "suno/v3-5-music"  ← Selected model
  }
}
```

### 3. **Used Across All API Requests**

When generating content:

```typescript
// Client: useVideoGenerator.ts
const modelConfig = project.modelConfig;
const videoModel = modelConfig?.video?.model; // "veo/3.1-text-to-video-fast-5s-720p"

// Sent to API:
fetch('/api/video', {
  body: JSON.stringify({
    model: videoModel,  // ← This model from DB!
    videoProvider: 'kie',
    // ...
  })
})
```

### 4. **API Routes Use the Model**

```typescript
// /api/video/route.ts
const { model: requestModel } = await request.json();
let kieVideoModel = requestModel || 'grok-imagine/image-to-video';

// Calls KIE.ai with exact model:
await createKieTask(..., kieVideoModel)
// → { "model": "veo/3.1-text-to-video-fast-5s-720p" }
```

---

## Database Example

**Query to see a project's model config:**

```sql
SELECT id, name, modelConfig FROM "Project" WHERE id = 'project_id_here';
```

**Result:**

| id | name | modelConfig |
|---|---|---|
| `cm3x9abc...` | My Film | `{"video":{"provider":"kie","model":"veo/3.1-text-to-video-fast-5s-720p","videoDuration":"5s","videoResolution":"720p","videoAspectRatio":"16:9"},"image":{"provider":"kie","model":"seedream/4-5-text-to-image","characterAspectRatio":"16:9","sceneAspectRatio":"16:9"},"tts":{"provider":"kie","model":"elevenlabs/text-to-dialogue-v3"},"music":{"provider":"kie","model":"suno/v3-5-music"}}` |

---

## FREE vs Premium Users

### **FREE Users:**
- ✅ Models stored in: `Project.modelConfig` (JSON)
- ✅ Location: `Project` table
- ✅ Scope: Per-project (different models per project)
- ✅ Used: Across all API requests (video, image, TTS, music)

### **Premium Users (with own API keys):**
- ✅ Models ALSO can be stored in: `Project.modelConfig` (NEW!)
- ✅ OR can use legacy: `apiKeys` table (global setting)
- ✅ Priority: Request body > `apiKeys` table
- ✅ Result: Can override models per project

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FREE USER (no API keys)                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. User selects model in UI: "Google Veo 3.1 Fast 720p (5s)"      │
│     (VideoTab.tsx)                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Saved to: project.modelConfig.video.model                     │
│     {                                                               │
│       "video": {                                                   │
│         "provider": "kie",                                         │
│         "model": "veo/3.1-text-to-video-fast-5s-720p"  ← HERE!   │
│       }                                                            │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Stored in Database:                                             │
│     Table: Project                                                  │
│     Column: modelConfig (JSON)                                      │
│     Row: cm3x9abc...                                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. When generating video:                                          │
│     const modelConfig = project.modelConfig;                        │
│     const videoModel = modelConfig?.video?.model;                   │
│     // "veo/3.1-text-to-video-fast-5s-720p"                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. API Request:                                                    │
│     POST /api/video                                                 │
│     {                                                               │
│       "model": "veo/3.1-text-to-video-fast-5s-720p"  ← FROM DB!   │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. Server receives model:                                         │
│     const { model: requestModel } = await request.json();          │
│     let kieVideoModel = requestModel || 'default';                 │
│     // kieVideoModel = "veo/3.1-text-to-video-fast-5s-720p"       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. KIE.ai API called with exact model:                            │
│     POST https://api.kie.ai/api/v1/jobs/createTask                 │
│     {                                                               │
│       "model": "veo/3.1-text-to-video-fast-5s-720p"  ← USED!      │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. Video generated with correct parameters:                       │
│     - 5 seconds duration                                            │
│     - 720p resolution                                               │
│     - Fast quality                                                  │
│     - Cost: 38 credits ($0.19)                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Verification

### Check if models are stored:

```bash
# Run this in your terminal
npx dotenv-cli -e .env.local -- npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const projects = await prisma.project.findMany({
  take: 3,
  select: {
    id: true,
    name: true,
    modelConfig: true,
  }
});

console.log('Projects with model configs:');
projects.forEach(p => {
  console.log(\`Project: \${p.name}\`);
  console.log(\`Model Config: \${JSON.stringify(p.modelConfig, null, 2)}\`);
  console.log('---');
});

await prisma.\$disconnect();
"
```

### Check API logs:

When generating content, you should see:

```
[Video] Using provider: kie, model: veo/3.1-text-to-video-fast-5s-720p
[Image] Using provider: kie, model: seedream/4-5-text-to-image
[TTS] Using provider: kie, model: elevenlabs/text-to-dialogue-v3
[Music] Using provider: kie, model: suno/v3-5-music
```

---

## Summary

✅ **Storage:** `Project` table, `modelConfig` column (JSON field)
✅ **Scope:** Per-project (each project can have different models)
✅ **Users:** Works for ALL users (FREE and premium)
✅ **APIs:** Used across ALL API requests (video, image, TTS, music)
✅ **Persistence:** Models persist across sessions (stored in database)
✅ **Accuracy:** Exact model from database is used in KIE.ai API calls

**FREE users select models → Saved to Project.modelConfig → Used in all API calls!** 🎯
