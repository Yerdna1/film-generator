# Role Management System Documentation

## Overview

The film generator application uses a multi-level role management system with both subscription-level roles and project-level roles.

## Subscription Levels (Application-wide)

### 1. FREE User with One-Time Payment
- **What they can do**: Choose their own Kie.AI or OpenRouter API keys in Step1
- **Credits**: Based on their own API usage (no platform credits)
- **Limitations**:
  - Max 12 scenes
  - Disney-Pixar style only
  - English language only
- **Validation**: Checked in `Step1-PromptGenerator.tsx` via `isPremiumUser` state

### 2. FREE User with No Payment
- **What they can do**: Basic film generation with severe limitations
- **Credits**: 33 credits on signup (from `AppConfig.startingCredits`)
- **Limitations**: Same as FREE with payment
- **Validation**: Subscription status checked via `/api/polar` endpoint

### 3. PREMIUM STARTER
- **Monthly Price**: $9
- **Credits**: 500 credits/month
- **What they can do**:
  - All AI models access
  - All visual styles
  - Multiple languages
  - Email support
- **Validation**: `plan === 'starter'` in Subscription table

### 4. PREMIUM PRO
- **Monthly Price**: $29
- **Credits**: 2,000 credits/month
- **What they can do**:
  - Everything from Starter
  - Priority generation queue
  - Priority support
- **Validation**: `plan === 'pro'` in Subscription table

### 5. PREMIUM STUDIO
- **Monthly Price**: $79
- **Credits**: 6,000 credits/month
- **What they can do**:
  - Everything from Pro
  - Highest priority processing
  - Dedicated support
- **Validation**: `plan === 'studio'` in Subscription table

### 6. SUPERADMIN (Application-wide)
- **What they can do**:
  - Access admin panel at `/admin`
  - Manage all users (block/unblock, approve/reject)
  - Adjust user credits
  - Change app configuration
  - View actual costs (costMultiplier = 1.0)
  - Auto-approved on signup
  - Automatic API keys created
- **Validation**: `User.role === 'admin'` in database
- **Credits**: Unlimited (can adjust their own)

## Project-Level Roles

### 1. OWNER (Currently named 'admin' in code - needs renaming)
- **What they can do**:
  - Full project control (view, edit, delete)
  - Direct regeneration without approval
  - Manage project members
  - Approve/reject requests from collaborators
  - Prepay credits for collaborator regenerations (3x cost)
- **Permissions**:
  ```typescript
  canView: true
  canEdit: true
  canRegenerate: true
  canDelete: true
  canRequestDeletion: false
  canRequestRegeneration: false
  canManageMembers: true
  canApproveRequests: true
  ```

### 2. COLLABORATOR
- **What they can do**:
  - View and edit project
  - Request changes for images, videos, or TTS
  - Regenerate if they have credits
  - Request deletion (needs owner approval)
  - Request regeneration if no credits (owner prepays 3x)
- **Permissions**:
  ```typescript
  canView: true
  canEdit: true
  canRegenerate: true (if has credits)
  canDelete: false
  canRequestDeletion: true
  canRequestRegeneration: true
  canManageMembers: false
  canApproveRequests: false
  ```

### 3. VIEWER (Named 'reader' in code)
- **What they can do**:
  - View project images and videos only
  - No editing capabilities
  - No regeneration capabilities
- **Permissions**:
  ```typescript
  canView: true
  canEdit: false
  canRegenerate: false
  canDelete: false
  canRequestDeletion: false
  canRequestRegeneration: false
  canManageMembers: false
  canApproveRequests: false
  ```

## Credit System

### Credit Costs
- Image Generation (1K/2K): 27 credits
- Image Generation (4K): 48 credits
- Video Generation: 20 credits
- Voiceover Line: 6 credits
- Scene Generation: 2 credits
- Character Generation: 2 credits
- Music Generation: 10 credits
- Video Composition Base: 5 credits
- Video Composition Music: 2 credits
- Video Composition Caption: 1 credit
- Transition Suggestion: 1 credit

### Credit Allocation by Subscription
| Plan | Monthly Credits | Monthly Cost |
|------|----------------|--------------|
| Free | 33 (one-time) | $0 |
| Starter | 500 | $9 |
| Pro | 2,000 | $29 |
| Studio | 6,000 | $79 |

## Technical Implementation Details

### Where is Role Validation?

1. **Application-level role validation**:
   - File: `/src/lib/admin.ts`
   - Functions: `verifyAdmin()`, `isUserAdmin(userId)`
   - Checks: `User.role === 'admin'` in database

2. **Project-level role validation**:
   - File: `/src/lib/permissions.ts`
   - Functions:
     - `getUserProjectRole(userId, projectId)` - Gets user's role
     - `checkPermission(userId, projectId, permission)` - Checks specific permission
     - `verifyPermission(userId, projectId, permission)` - Returns validation result

3. **Subscription validation**:
   - Endpoint: `/api/polar`
   - Returns: Subscription status and plan details
   - Used in: Step1-PromptGenerator.tsx via `isPremiumUser` state

### What File to Change in Step1 for Validation?

**Primary file**: `/src/components/workflow/Step1-PromptGenerator.tsx`

**Key areas to modify**:
1. Lines 131-147: Premium features enforcement
2. Line 80: `isPremiumUser` state initialization
3. Lines 408-420: Subscription check logic

**Related files**:
- `/src/components/workflow/step1/ModelConfigurationPanel.tsx` - Model selection validation
- `/src/components/workflow/step1/ApiKeyModal.tsx` - API key input for FREE users
- `/src/components/workflow/step1/SettingsPanel.tsx` - Settings based on tier

### Database Schema for Roles

#### Application Role Storage
**Table**: `User`
**Column**: `role` (String, default: "user")
**Values**: "user" | "admin"
**Location**: `/prisma/schema.prisma` Line 49

```prisma
model User {
  id        String  @id
  email     String? @unique
  name      String?
  role      String  @default("user")  // Application-wide role
  ...
}
```

#### Project Role Storage
**Table**: `ProjectMember`
**Column**: `role` (String, default: "reader")
**Values**: "admin" | "collaborator" | "reader"
**Location**: `/prisma/schema.prisma` Lines 371-385

```prisma
model ProjectMember {
  id        String @id
  projectId String
  userId    String
  role      String @default("reader")  // Project-level role
  ...
}
```

#### Subscription Storage
**Table**: `Subscription`
**Columns**:
- `status`: "free" | "active" | "canceled" | "past_due"
- `plan`: "free" | "starter" | "pro" | "studio"
**Location**: `/prisma/schema.prisma` Lines 78-91

```prisma
model Subscription {
  id     String @id
  userId String @unique
  status String @default("free")
  plan   String @default("free")
  ...
}
```

## API Endpoints for Role Management

### User Management
- `GET /api/admin/users` - List all users (admin only)
- `PUT /api/admin/users/[userId]` - Update user credits/status (admin only)

### Project Members
- `GET /api/projects/[id]/members` - List project members
- `POST /api/projects/[id]/members` - Add member (owner only)
- `PUT /api/projects/[id]/members/[memberId]` - Update member role (owner only)
- `DELETE /api/projects/[id]/members/[memberId]` - Remove member (owner only)

### Permissions Check
- `GET /api/projects/[id]/permissions` - Get current user's permissions

### Subscription Management
- `GET /api/polar` - Get subscription status
- `POST /api/polar/webhook` - Handle subscription updates

## Middleware and Guards

### Authentication Middleware
**Location**: `/src/lib/api/middleware.ts`
- `withAuth()` - Require authentication
- `requireAuth()` - Get auth context or error
- `optionalAuth()` - Optional authentication

### Permission Guards
**Location**: `/src/lib/permissions.ts`
- `verifyPermission()` - Verify specific permission
- `checkPermission()` - Boolean permission check

### Admin Guards
**Location**: `/src/lib/admin.ts`
- `verifyAdmin()` - Verify admin status
- Admin routes automatically protected

## Testing

Test suite location: `/src/lib/__tests__/permissions.test.ts`

Covers:
- Role assignment validation
- Permission checks for all roles
- Public/private project access
- Member management permissions
- Request approval workflows

## Recommended Changes

1. **Rename 'admin' to 'owner' at project level** to avoid confusion with application-level admin
2. **Add role badges** in UI to clearly show user's role
3. **Implement role upgrade paths** for project members
4. **Add audit logging** for role changes
5. **Create role migration tool** for existing projects