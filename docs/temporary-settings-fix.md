# Temporary Fix for Missing Project Settings

## The Problem
Your projects are missing the `settings` field in the database, which causes the migration code to crash when trying to access `project.settings.storyModel`.

## Quick Fix Options

### Option 1: Fix in Database (Recommended)
Run the SQL queries in `/docs/fix-missing-project-settings.sql` to add default settings to all projects.

### Option 2: Temporary Code Fix
If you need an immediate fix while waiting for the database update, you can temporarily modify the migration code:

1. Open `/src/lib/stores/project-store/migrations.ts`

2. Find line 26:
```typescript
const storyModel = project.settings.storyModel || 'gemini-3-pro';
```

3. Replace it with:
```typescript
const storyModel = project.settings?.storyModel || 'gemini-3-pro';
```

4. Also update line 45:
```typescript
sceneAspectRatio: (userConstants?.sceneAspectRatio || project.settings.aspectRatio || '16:9') as any,
```

Replace with:
```typescript
sceneAspectRatio: (userConstants?.sceneAspectRatio || project.settings?.aspectRatio || '16:9') as any,
```

5. And line 46:
```typescript
sceneResolution: (userConstants?.sceneImageResolution || project.settings.imageResolution || '2k') as any,
```

Replace with:
```typescript
sceneResolution: (userConstants?.sceneImageResolution || project.settings?.imageResolution || '2k') as any,
```

### Option 3: Check for Missing Settings
You can also add a null check at the beginning of the `createModelConfigFromLegacySettings` function:

```typescript
export function createModelConfigFromLegacySettings(
  project: Project,
  apiConfig: ApiConfig,
  userConstants: UserConstants | null
): UnifiedModelConfig {
  // Add this safety check
  if (!project.settings) {
    project.settings = {
      sceneCount: 12,
      characterCount: 2,
      aspectRatio: '21:9',
      resolution: '4k',
      imageResolution: '2k',
      voiceLanguage: 'en',
      voiceProvider: 'elevenlabs',
      storyModel: 'claude-sonnet-4.5',
    };
  }

  // Rest of the function continues...
```

## After Applying the Fix

1. Clear your browser cache
2. Navigate to `http://localhost:3000/api/projects?refresh=true`
3. Return to the homepage at `http://localhost:3000`

Your projects should now load correctly!