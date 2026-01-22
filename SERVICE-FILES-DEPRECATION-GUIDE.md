# Service Files Deprecation Guide

After implementing the centralized API wrapper, several service files can be deprecated or have reduced roles. Here's the status of each:

## Files to Deprecate (No Longer Needed)

These files contain direct API calls that are now handled by the centralized wrapper:

### 1. `/src/lib/services/openrouter.ts`
- **Status**: CAN BE DEPRECATED
- **Reason**: All OpenRouter API calls now go through the centralized wrapper
- **Used by**: Only in backup files and some legacy LLM providers
- **Action**: Can be removed after verifying all consumers are updated

### 2. `/src/lib/services/elevenlabs.ts`
- **Status**: PARTIALLY DEPRECATE
- **Reason**: Direct TTS calls replaced by wrapper, but may contain voice list functionality
- **Action**: Check if voice list functionality is used, otherwise remove

### 3. `/src/lib/services/grok.ts`
- **Status**: CAN BE DEPRECATED
- **Reason**: Grok image generation now handled by wrapper
- **Action**: Remove after verification

### 4. `/src/lib/services/nano-banana.ts`
- **Status**: CAN BE DEPRECATED
- **Reason**: NanoBanana/Gemini image calls now use wrapper
- **Action**: Remove after verification

## Files to Keep

These files provide functionality beyond direct API calls:

### 1. `/src/lib/services/piapi.ts`
- **Status**: KEEP
- **Reason**: Has custom task management logic for music generation
- **Note**: Already integrated with wrapper in music route

### 2. `/src/lib/services/gemini.ts`
- **Status**: MIGHT KEEP
- **Reason**: May contain utility functions for Gemini
- **Action**: Review and extract any needed utilities

### 3. Service files that don't make API calls:
- `app-config.ts` - App configuration
- `email.ts` - Email functionality
- `s3-upload.ts` - S3 uploads
- `rate-limit.ts` - Rate limiting
- `credits.ts` - Credit management
- `real-costs.ts` - Cost calculations
- `pricing-service.ts` - Pricing logic
- `polar.ts` - Subscription management
- `user-permissions.ts` - Permission checks

## Migration Checklist

1. ✅ All API routes migrated to use wrapper
2. ✅ Inngest functions updated
3. ✅ Provider configuration centralized
4. ⬜ Remove deprecated service files
5. ⬜ Update any remaining imports
6. ⬜ Clean up backup files

## Files Still Using Old Services

Based on grep results, these files may still reference old services:

1. `src/lib/inngest/functions/scene-generation/llm-providers.ts` - Uses openrouter
2. `src/app/api/claude/scenes/route.ts` - May use openrouter
3. `src/lib/llm/wrapper.ts` - May reference multiple services

## Recommended Order of Removal

1. First verify all routes work with new wrapper
2. Update remaining consumers (llm-providers.ts, etc.)
3. Remove service files one by one:
   - Start with `grok.ts` and `nano-banana.ts` (least complex)
   - Then `openrouter.ts` and `elevenlabs.ts`
   - Keep `piapi.ts` as it has unique logic

## Testing After Removal

Test these features after removing each service file:

1. **After removing openrouter.ts**: Test LLM prompt generation
2. **After removing elevenlabs.ts**: Test TTS with ElevenLabs provider
3. **After removing grok.ts**: Test image generation with Grok
4. **After removing nano-banana.ts**: Test Gemini image generation

## Benefits of Deprecation

1. **Less Code to Maintain**: Removes ~1000+ lines of redundant code
2. **Single Source of Truth**: All API logic in one place
3. **Consistent Error Handling**: No more provider-specific error logic scattered
4. **Easier Updates**: Change endpoints/auth in one place

## Important Notes

- Keep backups of service files until fully tested
- Some service files may contain utility functions worth preserving
- The API wrapper now handles all authentication, endpoints, and error handling
- Provider-specific logic is minimal and contained in the wrapper