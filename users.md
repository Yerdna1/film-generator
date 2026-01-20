# User Permission System - Detailed Implementation Tasks

## Overview
This document contains detailed tasks for fixing the user permission system to properly handle Free, Premium, and Admin users.

## User Type Definitions
- **Free User**: `subscription.plan === "free"` - Must provide own API keys
- **Premium User**: `subscription.plan !== "free"` - Uses system keys, needs credits
- **Admin User**: `user.role === "admin"` - Uses system keys, needs credits

---

## Phase 1: Core Infrastructure Tasks

### Task 1.1: Create User Permission Service
**Priority**: Critical
**File**: `/src/lib/services/user-permissions.ts` (NEW)

```typescript
// Required exports:
export interface UserPermissions {
  userType: 'free' | 'premium' | 'admin';
  canUseSystemKeys: boolean;
  requiresApiKeys: boolean;
  requiresCredits: boolean;
  missingApiKeys: string[];
  hasCredits: boolean;
  canChoosePaymentMethod: boolean;
  preferOwnKeys: boolean; // User's saved preference
}

export interface PaymentMethod {
  type: 'credits' | 'apiKeys';
  available: boolean;
}

export async function getUserPermissions(userId: string): Promise<UserPermissions>
export async function checkRequiredApiKeys(userId: string, operation: string): Promise<{hasKeys: boolean, missing: string[]}>
export async function getUserType(user: User & { subscription?: Subscription }): 'free' | 'premium' | 'admin'
export async function getAvailablePaymentMethods(userId: string): Promise<PaymentMethod[]>
export async function savePaymentPreference(userId: string, useOwnKeys: boolean): Promise<void>
```

### Task 1.2: Create API Keys Context
**Priority**: Critical
**File**: `/src/contexts/ApiKeysContext.tsx` (NEW)

- Global state for API keys
- Sync with database on mount
- Provide methods to update keys
- Emit events on key changes
- Cache keys in memory

### Task 1.3: Create Unified API Key Modal
**Priority**: High
**File**: `/src/components/modals/ApiKeyConfigModal.tsx` (NEW)

Features:
- Dynamic fields based on required operation
- Format validation for each provider
- Test connection button
- Save to both context and database
- Help text with links to get keys
- Progressive disclosure (only show needed fields)

### Task 1.4: Create Payment Method Toggle Component
**Priority**: High
**File**: `/src/components/workflow/PaymentMethodToggle.tsx` (NEW)

Features:
- Show when user has both credits and API keys
- Display current selection
- Show cost implications (credits vs free)
- Save preference to user settings
- Update on context changes

---

## Phase 2: Workflow Step Fixes

### Task 2.1: Fix Generate Main Prompt (Step 1)
**Priority**: Critical
**Files**:
- `/src/components/workflow/Step1-PromptGenerator.tsx`
- `/src/hooks/usePromptGeneration.ts` (NEW)

Changes:
```typescript
// In handleGeneratePrompt:
const permissions = await getUserPermissions(user.id);

if (permissions.requiresApiKeys) {
  const keyCheck = await checkRequiredApiKeys(user.id, 'llm');
  if (!keyCheck.hasKeys) {
    setShowApiKeyModal(true);
    setRequiredKeys(keyCheck.missing);
    return;
  }
}

if (permissions.requiresCredits) {
  // Existing credit check
}
```

### Task 2.2: Fix Character Generation (Step 2)
**Priority**: Critical
**Files**:
- `/src/components/workflow/character-step/Step2-CharacterGenerator.tsx`
- `/src/components/workflow/character-generator/hooks/useCharacterImage.ts`

Changes:
- Add permission check before generation
- Show API key modal for free users
- Only show credit modal for premium/admin

### Task 2.3: Fix Video Generation (Step 3/4)
**Priority**: Critical
**Files**:
- `/src/components/workflow/Step4-VideoGenerator.tsx`
- `/src/components/workflow/video-generator/hooks/useVideoGenerator.ts`

Changes:
- Check video provider API keys for free users
- Proper modal routing based on user type

### Task 2.4: Fix TTS Generation
**Priority**: High
**Files**:
- `/src/components/workflow/voiceover-step/VoiceoverStep.tsx`
- `/src/hooks/useVoiceoverGeneration.ts`

Changes:
- Validate TTS provider keys for free users
- Skip credit checks for users with own keys

---

## Phase 3: API Route Updates

### Task 3.1: Update Image Generation Route
**Priority**: Critical
**File**: `/src/app/api/image/route.ts`

Changes at line 584:
```typescript
// Add user type check
const permissions = await getUserPermissions(sessionUserId);

// For free users, enforce API key requirement
if (permissions.requiresApiKeys && !userHasRequiredApiKey) {
  return NextResponse.json({
    error: 'API key required',
    requiredKey: getRequiredKeyForProvider(imageProvider),
    showApiKeyModal: true
  }, { status: 403 });
}

// Only check credits for premium/admin without own keys
if (permissions.requiresCredits && !userHasOwnApiKey) {
  const creditCheck = await requireCredits(sessionUserId, creditCost);
  if (creditCheck) return creditCheck;
}
```

### Task 3.2: Update Video Generation Route
**Priority**: Critical
**File**: `/src/app/api/video/route.ts`

Similar changes to image route

### Task 3.3: Update LLM Prompt Route
**Priority**: Critical
**File**: `/src/app/api/llm/prompt/route.ts`

Add permission-based validation

### Task 3.4: Update TTS Route
**Priority**: High
**File**: `/src/app/api/tts/route.ts`

Add API key validation for free users

---

## Phase 4: Settings Integration

### Task 4.1: Update Settings Page
**Priority**: High
**File**: `/src/app/settings/page.tsx`

Changes:
- Use ApiKeysContext instead of direct state
- Add visual indicators for saved keys
- Show different UI based on user type
- Add "Test Connection" for each provider

### Task 4.2: Update Existing API Key Modals
**Priority**: Medium
**Files**:
- `/src/components/workflow/step1/ApiKeyModal.tsx`
- `/src/components/workflow/character-generator/components/KieApiKeyModal.tsx`

Changes:
- Use shared ApiKeysContext
- Remove local state management
- Emit events on save

---

## Phase 5: Credit System Updates

### Task 5.1: Update Credit Middleware
**Priority**: High
**File**: `/src/lib/api/middleware.ts`

Add new function:
```typescript
export async function requireCreditsForUser(
  userId: string,
  requiredCredits: number,
  userType: 'free' | 'premium' | 'admin'
): Promise<NextResponse | null> {
  // Skip for free users
  if (userType === 'free') return null;

  return requireCredits(userId, requiredCredits);
}
```

### Task 5.2: Update Credits Context
**Priority**: Medium
**File**: `/src/contexts/CreditsContext.tsx`

Changes:
- Add user type awareness
- Don't show credit modal for free users
- Add helper to determine modal type

---

## Phase 6: Testing Implementation

### Task 6.1: Create Test Utilities
**Priority**: High
**File**: `/src/lib/test/user-permissions.test.ts` (NEW)

Test cases:
- Free user without keys
- Free user with partial keys
- Free user with all keys
- Premium user workflows
- Admin user workflows

### Task 6.2: Create E2E Tests
**Priority**: Medium
**File**: `/tests/e2e/user-permissions.spec.ts` (NEW)

Scenarios:
- Complete free user journey
- Premium user with no credits
- API key modal appearance
- Settings synchronization

---

## Phase 7: Migration & Cleanup

### Task 7.1: Create Migration Script
**Priority**: Low
**File**: `/scripts/migrate-user-permissions.ts` (NEW)

Actions:
- Audit existing free users with credits
- Check for orphaned API keys
- Ensure subscription status consistency

### Task 7.2: Add Feature Flags
**Priority**: Low
**File**: `/src/lib/feature-flags.ts`

Flags:
- `new-permission-system`: Enable new flows
- `strict-free-user-keys`: Enforce API key requirement

---

## Implementation Order

1. **Week 1**: Phase 1 (Core Infrastructure)
   - User permission service
   - API keys context
   - Unified modal

2. **Week 2**: Phase 2-3 (Workflow & API Updates)
   - Fix all workflow steps
   - Update API routes
   - Test with all user types

3. **Week 3**: Phase 4-5 (Settings & Credits)
   - Settings integration
   - Credit system updates
   - End-to-end testing

4. **Week 4**: Phase 6-7 (Testing & Rollout)
   - Comprehensive testing
   - Migration scripts
   - Gradual rollout with feature flags

---

## Success Metrics

1. **Free Users**:
   - 0% can bypass API key requirements
   - 100% see API key modal when needed
   - 0% see credit-related modals

2. **Premium/Admin Users**:
   - 0% see API key modals (unless choosing own keys)
   - 100% proper credit deductions
   - 100% can override with own keys

3. **General**:
   - Settings sync works 100%
   - Modal routing 100% correct
   - No regression in existing flows

---

## Risk Areas

1. **Database Performance**:
   - Cache permission checks
   - Batch API key lookups

2. **Backward Compatibility**:
   - Grandfather existing setups
   - Provide migration path

3. **Security**:
   - Never expose system keys
   - Validate all API keys
   - Rate limit key validation

---

## Additional Implementation Details

### Progressive API Key Collection Flow
When a free user attempts an operation without required keys:

1. **First Operation (e.g., Generate Prompt)**:
   - Check for OpenRouter API key
   - Show modal with only OpenRouter field
   - Save and continue

2. **Second Operation (e.g., Generate Image)**:
   - Check for image provider key
   - Show modal with only missing key field
   - Remember all previously entered keys

3. **Key Storage**:
   - Save each key immediately to database
   - Update context for real-time sync
   - Show "already configured" indicators

### Payment Method Selection Logic
```typescript
// Determine available payment methods
function getPaymentMethods(user, apiKeys, credits):
  methods = []

  if (user.type === 'free' || user.preferOwnKeys) {
    if (hasRequiredApiKeys) methods.push('apiKeys')
    if (credits.balance > 0) methods.push('credits')
  } else { // premium/admin
    methods.push('credits') // always available
    if (hasRequiredApiKeys) methods.push('apiKeys')
  }

  return methods
```

## Resolved Questions (Based on User Feedback)

1. **Free users with credits and keys**: Let user choose via toggle
2. **Premium users mixing keys**: Yes, with toggle to choose
3. **Usage tracking with own keys**: Yes, for analytics (no credit deduction)
4. **Default behavior**: Use user's saved preference
5. **API key requirements**: Progressive - only ask when needed