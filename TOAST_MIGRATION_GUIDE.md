# Toast Migration Guide

## Overview
We've created a centralized toast configuration system to ensure consistent styling across all toast notifications in the application.

## New Toast System

### 1. Custom Toast Utility
Located at: `/src/lib/toast.ts`

This provides a wrapper around Sonner's toast with:
- Consistent dark glass-morphism styling
- Color-coded glows for different toast types
- Predefined styles for success, error, warning, info, and loading states

### 2. Updated Toaster Configuration
The main Toaster component in `layout.tsx` now has:
- Dark theme by default
- Glass-morphism background
- Consistent border radius and spacing
- 5-second default duration

## Migration Steps

### Step 1: Update Imports
Replace all imports of toast from 'sonner':
```typescript
// Old
import { toast } from 'sonner';

// New
import { toast } from '@/lib/toast';
```

### Step 2: Usage Remains the Same
The API is identical to Sonner's, so no code changes needed:
```typescript
// Success toast with green glow
toast.success('API key saved successfully');

// Error toast with red glow
toast.error('Please fix your validation errors');

// Info toast with blue glow
toast.info('Processing your request...');

// Warning toast with yellow glow
toast.warning('API rate limit approaching');

// Loading toast with purple glow
toast.loading('Generating images...');

// Promise toast
toast.promise(saveData(), {
  loading: 'Saving...',
  success: 'Data saved!',
  error: 'Failed to save'
});
```

## Toast Styles by Type

1. **Success** - Green glow (#22c55e)
2. **Error** - Red glow (#ef4444)
3. **Info** - Blue glow (#3b82f6)
4. **Warning** - Yellow glow (#f59e0b)
5. **Loading** - Purple glow (#9333ea)

## Bulk Migration Script

To update all files at once, you can use this bash command:
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s/import { toast } from 'sonner'/import { toast } from '@\/lib\/toast'/g"
```

## Benefits

1. **Consistency**: All toasts have the same base styling
2. **Maintainability**: Change styles in one place
3. **Better UX**: Color-coded glows help users quickly identify toast types
4. **Dark Theme**: Matches the app's cinematic aesthetic
5. **Professional Look**: Glass-morphism effect with backdrop blur

## Files Already Updated

- `/src/components/workflow/api-key-modal/ApiKeyConfigModal.tsx`
- `/src/contexts/ApiKeysContext.tsx`

## Next Steps

Continue updating other files that use toast notifications to ensure consistency throughout the application.