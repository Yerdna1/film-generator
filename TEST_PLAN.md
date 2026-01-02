# Comprehensive Test Plan for Film Generator

## Overview

This document outlines a multi-phase testing strategy covering all critical aspects of the Film Generator application. The plan includes approximately **550+ test cases** organized across 12 phases.

**Application Inventory:**
- 62 API route files with ~90 HTTP methods
- ~80 exported service functions
- 57 workflow components
- 21 Prisma models
- 4 roles: admin, collaborator, reader, public

**Key Areas:**
- Credit system and cost calculations
- Role-based access control (admin, collaborator, reader, public)
- Collaboration workflows (invitations, regeneration requests, deletion requests)
- Generation endpoints with cost tracking
- Statistics and reporting accuracy

---

## Phase 1: Setup & Core Unit Tests (45 tests)

### 1.1 Testing Framework Setup

```bash
# Install dependencies
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom
npm install -D msw supertest prisma-test-environment
```

**Configuration files to create:**
- `vitest.config.ts` - Main test configuration
- `src/test/setup.ts` - Global test setup
- `src/test/mocks/prisma.ts` - Prisma mock client
- `src/test/factories/` - Test data factories

---

### 1.2 Credit System Unit Tests (20 tests)

**File:** `src/lib/services/__tests__/credits.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | `getOrCreateCredits - new user` | Creates credit record with 0 balance for new user |
| 2 | `getOrCreateCredits - existing user` | Returns existing credit record |
| 3 | `getOrCreateCredits - concurrent calls` | Handles race condition gracefully |
| 4 | `spendCredits - sufficient balance` | Deducts credits and tracks real cost |
| 5 | `spendCredits - insufficient balance` | Throws error, no deduction occurs |
| 6 | `spendCredits - zero amount` | Handles zero credit operations |
| 7 | `spendCredits - with project context` | Associates transaction with project |
| 8 | `spendCredits - with regeneration flag` | Marks transaction as regeneration |
| 9 | `spendCredits - creates transaction record` | Verifies CreditTransaction creation |
| 10 | `trackRealCostOnly - no credit deduction` | Tracks cost without affecting balance |
| 11 | `trackRealCostOnly - transaction metadata` | Stores correct metadata |
| 12 | `addCredits - purchase` | Adds credits with 'purchase' type |
| 13 | `addCredits - bonus` | Adds credits with 'bonus' type |
| 14 | `addCredits - updates total received` | Updates totalReceived field |
| 15 | `checkBalance - sufficient` | Returns true when enough credits |
| 16 | `checkBalance - insufficient` | Returns false when not enough |
| 17 | `checkBalance - exact amount` | Edge case: balance equals required |
| 18 | `getUserCostMultiplier - default` | Returns 1.0 for users without multiplier |
| 19 | `getUserCostMultiplier - custom` | Returns configured multiplier |
| 20 | `getUserCostMultiplier - applies to costs` | Multiplier affects credit deduction |

---

### 1.3 Real Costs Unit Tests (15 tests)

**File:** `src/lib/services/__tests__/real-costs.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 21 | `getActionCost - from database` | Returns DB-stored cost (priority) |
| 22 | `getActionCost - fallback to constants` | Uses hardcoded when DB empty |
| 23 | `getActionCost - unknown action` | Returns 0 for unknown actions |
| 24 | `getImageCost - gemini-3-pro 1K` | $0.24 per image |
| 25 | `getImageCost - gemini-3-pro 2K` | $0.24 per image |
| 26 | `getImageCost - gemini-3-pro 4K` | $0.24 per image |
| 27 | `getImageCost - gemini-flash 1K` | $0.039 per image |
| 28 | `getImageCost - modal-qwen` | $0.09 per image |
| 29 | `getImageCost - modal-qwen-edit` | $0.09 per image |
| 30 | `getVideoCost - kie/grok` | $0.10 per 6s video |
| 31 | `getVideoCost - modal-hallo3` | $0.15 per video |
| 32 | `getTTSCost - elevenlabs` | $0.30 per 1K characters |
| 33 | `getMusicCost - suno` | $0.05 per track |
| 34 | `estimateCost - with quantity` | Multiplies unit cost by quantity |
| 35 | `estimateProjectCost - full project` | Calculates all components |

---

### 1.4 Permission System Unit Tests (10 tests)

**File:** `src/lib/__tests__/permissions.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 36 | `getUserProjectRole - owner` | Always returns 'admin' |
| 37 | `getUserProjectRole - member admin` | Returns 'admin' from ProjectMember |
| 38 | `getUserProjectRole - member collaborator` | Returns 'collaborator' |
| 39 | `getUserProjectRole - member reader` | Returns 'reader' |
| 40 | `getUserProjectRole - public project` | Returns 'reader' for any user |
| 41 | `getUserProjectRole - private no access` | Returns null |
| 42 | `checkPermission - permission matrix` | Verifies all role/permission combos |
| 43 | `verifyPermission - error messages` | Returns descriptive errors |
| 44 | `getProjectAdmins - includes owner` | Owner always in admin list |
| 45 | `getProjectAdmins - includes member admins` | Member admins included |

---

## Phase 2: Role & Permission Integration Tests (55 tests)

### 2.1 Authentication Tests (10 tests)

**File:** `src/app/api/auth/__tests__/auth.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 46 | `register - valid credentials` | Creates user account |
| 47 | `register - duplicate email` | Returns error |
| 48 | `register - weak password` | Validation error |
| 49 | `login - valid credentials` | Returns session |
| 50 | `login - invalid password` | Returns 401 |
| 51 | `login - non-existent user` | Returns 401 |
| 52 | `session - valid token` | Returns user data |
| 53 | `session - expired token` | Returns 401 |
| 54 | `logout - clears session` | Invalidates token |
| 55 | `OAuth - Google provider` | Handles OAuth flow |

---

### 2.2 Admin Role Tests (15 tests)

**File:** `src/app/api/projects/__tests__/admin-role.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 56 | `admin - can view project` | Returns project data |
| 57 | `admin - can edit project` | Updates project |
| 58 | `admin - can delete project` | Deletes project |
| 59 | `admin - can regenerate images` | Triggers regeneration |
| 60 | `admin - can manage members` | Add/remove members |
| 61 | `admin - can approve requests` | Approve deletion/regen |
| 62 | `admin - can reject requests` | Reject with reason |
| 63 | `admin - can change member roles` | Promote/demote |
| 64 | `admin - can revoke invitations` | Cancel pending invites |
| 65 | `admin - can view all statistics` | Full project stats |
| 66 | `admin - credits deducted on generation` | Verifies deduction |
| 67 | `admin - can make project public` | Change visibility |
| 68 | `admin - can export project` | Full export |
| 69 | `admin - can import to project` | Import scenes |
| 70 | `admin - can batch operations` | Multiple scenes at once |

---

### 2.3 Collaborator Role Tests (15 tests)

**File:** `src/app/api/projects/__tests__/collaborator-role.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 71 | `collaborator - can view project` | Returns project data |
| 72 | `collaborator - can edit scenes` | Update scene fields |
| 73 | `collaborator - cannot delete project` | Returns 403 |
| 74 | `collaborator - can request deletion` | Creates DeletionRequest |
| 75 | `collaborator - can regenerate with credits` | Uses own credits |
| 76 | `collaborator - can request regeneration no credits` | Creates RegenerationRequest |
| 77 | `collaborator - cannot manage members` | Returns 403 |
| 78 | `collaborator - cannot approve requests` | Returns 403 |
| 79 | `collaborator - can view own statistics` | Limited stats view |
| 80 | `collaborator - credits deducted own account` | Verifies own deduction |
| 81 | `collaborator - cannot change visibility` | Returns 403 |
| 82 | `collaborator - can use approved regeneration` | Post-approval regen |
| 83 | `collaborator - cannot exceed max attempts` | Limited to maxAttempts |
| 84 | `collaborator - can select from generated options` | Pick best version |
| 85 | `collaborator - cannot invite others` | Returns 403 |

---

### 2.4 Reader Role Tests (10 tests)

**File:** `src/app/api/projects/__tests__/reader-role.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 86 | `reader - can view project` | Returns project data |
| 87 | `reader - cannot edit project` | Returns 403 |
| 88 | `reader - cannot edit scenes` | Returns 403 |
| 89 | `reader - cannot delete anything` | Returns 403 |
| 90 | `reader - cannot request deletion` | Returns 403 |
| 91 | `reader - cannot regenerate` | Returns 403 |
| 92 | `reader - cannot request regeneration` | Returns 403 |
| 93 | `reader - cannot manage members` | Returns 403 |
| 94 | `reader - can view project stats` | Read-only stats |
| 95 | `reader - cannot export` | Returns 403 |

---

### 2.5 Public Access Tests (5 tests)

**File:** `src/app/api/projects/__tests__/public-access.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 96 | `public - can view public project` | No auth required |
| 97 | `public - cannot view private project` | Returns 401/403 |
| 98 | `public - cannot edit public project` | Returns 403 |
| 99 | `public - can list public projects` | Discovery endpoint |
| 100 | `public - cannot see member list` | Privacy protection |

---

## Phase 3: Collaboration Workflow Tests (60 tests)

### 3.1 Invitation Flow Tests (15 tests)

**File:** `src/app/api/projects/[id]/invitations/__tests__/invitations.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 101 | `create invitation - valid email` | Creates pending invitation |
| 102 | `create invitation - existing member` | Returns error |
| 103 | `create invitation - already invited` | Returns existing invite |
| 104 | `create invitation - sets expiration` | 7-day default expiry |
| 105 | `create invitation - generates unique token` | Token for link |
| 106 | `accept invitation - valid token` | Creates ProjectMember |
| 107 | `accept invitation - expired token` | Returns error |
| 108 | `accept invitation - already accepted` | Returns error |
| 109 | `accept invitation - wrong user` | Email mismatch error |
| 110 | `revoke invitation - by admin` | Deletes invitation |
| 111 | `revoke invitation - by non-admin` | Returns 403 |
| 112 | `list invitations - admin sees all` | Full list |
| 113 | `list invitations - collaborator denied` | Returns 403 |
| 114 | `resend invitation - resets expiry` | New expiration date |
| 115 | `invitation - email notification sent` | Triggers email |

---

### 3.2 Deletion Request Flow Tests (15 tests)

**File:** `src/app/api/projects/[id]/deletion-requests/__tests__/deletion-requests.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 116 | `create deletion request - scene` | Creates pending request |
| 117 | `create deletion request - character` | Creates for character |
| 118 | `create deletion request - video` | Creates for video |
| 119 | `create deletion request - project` | Creates for project |
| 120 | `create deletion request - by admin` | Auto-approves (optional) |
| 121 | `approve deletion - by admin` | Status -> approved |
| 122 | `approve deletion - executes delete` | Target removed |
| 123 | `approve deletion - cascade delete` | Related data cleaned |
| 124 | `reject deletion - with note` | Status -> rejected, note saved |
| 125 | `reject deletion - by non-admin` | Returns 403 |
| 126 | `list deletion requests - pending only` | Filters by status |
| 127 | `list deletion requests - all statuses` | Admin can see all |
| 128 | `duplicate request - same target` | Returns existing |
| 129 | `cancel request - by requester` | Allows cancellation |
| 130 | `notification - admin notified` | Triggers notification |

---

### 3.3 Regeneration Request Flow Tests (30 tests)

**File:** `src/app/api/projects/[id]/regeneration-requests/__tests__/regeneration-requests.test.ts`

#### Request Creation (5 tests)
| # | Test Case | Description |
|---|-----------|-------------|
| 131 | `create regen request - image` | Creates for image |
| 132 | `create regen request - video` | Creates for video |
| 133 | `create regen request - batch scenes` | Multiple scenes |
| 134 | `create regen request - sets max attempts` | Default 3 attempts |
| 135 | `create regen request - notification sent` | Notifies admins |

#### Admin Approval (8 tests)
| # | Test Case | Description |
|---|-----------|-------------|
| 136 | `approve regen - calculates prepayment` | 3x cost calculated |
| 137 | `approve regen - deducts admin credits` | Credits from admin |
| 138 | `approve regen - stores creditsPaid` | Saved for tracking |
| 139 | `approve regen - status -> approved` | State transition |
| 140 | `approve regen - insufficient admin credits` | Returns error |
| 141 | `reject regen - with reason` | Status -> rejected |
| 142 | `reject regen - no credit deduction` | Nothing spent |
| 143 | `approve regen - notifies requester` | Email/notification |

#### Collaborator Generation (10 tests)
| # | Test Case | Description |
|---|-----------|-------------|
| 144 | `generate - uses approved request` | Valid approved status |
| 145 | `generate - no credit deduction` | Uses prepaid credits |
| 146 | `generate - tracks real cost only` | trackRealCostOnly called |
| 147 | `generate - increments attemptsUsed` | Counter updated |
| 148 | `generate - stores generated URLs` | Saved to generatedUrls |
| 149 | `generate - status -> generating` | State transition |
| 150 | `generate - max attempts reached` | Status -> selecting |
| 151 | `generate - before approval` | Returns 403 |
| 152 | `generate - after rejection` | Returns 403 |
| 153 | `generate - wrong collaborator` | Returns 403 |

#### Selection & Final Approval (7 tests)
| # | Test Case | Description |
|---|-----------|-------------|
| 154 | `select - picks from options` | Sets selectedUrl |
| 155 | `select - status -> awaiting_final` | State transition |
| 156 | `select - before all attempts` | Returns error |
| 157 | `final approve - applies selection` | Updates scene |
| 158 | `final approve - status -> completed` | Final state |
| 159 | `final reject - status -> rejected` | Rejection path |
| 160 | `final reject - refund consideration` | Tracks unused attempts |

---

## Phase 4: Generation & Cost Tracking Tests (70 tests)

### 4.1 Image Generation Tests (20 tests)

**File:** `src/app/api/image/__tests__/image-generation.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 161 | `generate image - gemini-3-pro` | Successful generation |
| 162 | `generate image - gemini-flash` | Successful generation |
| 163 | `generate image - modal-qwen` | Successful generation |
| 164 | `generate image - modal-edit` | Edit with reference |
| 165 | `generate image - deducts credits` | 27 credits (2K) |
| 166 | `generate image - tracks real cost` | Provider-specific cost |
| 167 | `generate image - insufficient credits` | Returns 402 |
| 168 | `generate image - associates with project` | projectId in transaction |
| 169 | `generate image - 1K resolution` | Lower credit cost |
| 170 | `generate image - 4K resolution` | Higher credit cost (48) |
| 171 | `generate image - with reference` | Consistency mode |
| 172 | `generate image - failed provider` | Error handling |
| 173 | `generate image - retry on failure` | Retry logic |
| 174 | `generate image - rate limiting` | Handles 429 |
| 175 | `generate image - saves to S3` | URL returned |
| 176 | `generate image - updates scene` | Scene.imageUrl set |
| 177 | `regenerate image - marked as regen` | isRegeneration flag |
| 178 | `regenerate image - different cost` | If applicable |
| 179 | `batch generation - parallel` | 5 concurrent |
| 180 | `batch generation - partial failure` | Handles some failures |

---

### 4.2 Video Generation Tests (15 tests)

**File:** `src/app/api/video/__tests__/video-generation.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 181 | `generate video - kie` | Successful generation |
| 182 | `generate video - modal-hallo3` | Successful generation |
| 183 | `generate video - deducts credits` | 20 credits per 6s |
| 184 | `generate video - tracks real cost` | $0.10 or $0.15 |
| 185 | `generate video - insufficient credits` | Returns 402 |
| 186 | `generate video - requires image first` | Validation |
| 187 | `generate video - with motion prompt` | imageToVideoPrompt used |
| 188 | `generate video - failed provider` | Error handling |
| 189 | `generate video - long video` | Multiple segments |
| 190 | `generate video - saves to S3` | URL returned |
| 191 | `generate video - updates scene` | Scene.videoUrl set |
| 192 | `regenerate video - marked as regen` | isRegeneration flag |
| 193 | `batch video - sequential` | Due to resource limits |
| 194 | `video generation - logs metadata` | Provider, duration |
| 195 | `video generation - timeout handling` | Long generation times |

---

### 4.3 TTS Generation Tests (10 tests)

**File:** `src/app/api/tts/__tests__/tts-generation.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 196 | `generate tts - elevenlabs` | Successful generation |
| 197 | `generate tts - gemini-tts` | Successful generation |
| 198 | `generate tts - modal-chatterbox` | Successful generation |
| 199 | `generate tts - deducts credits` | 6 credits per line |
| 200 | `generate tts - tracks real cost` | Per character cost |
| 201 | `generate tts - voice selection` | Correct voice used |
| 202 | `generate tts - long text` | Handles long content |
| 203 | `generate tts - empty text` | Returns error |
| 204 | `generate tts - saves to S3` | URL returned |
| 205 | `generate tts - updates scene` | Scene.audioUrl set |

---

### 4.4 Music Generation Tests (10 tests)

**File:** `src/app/api/music/__tests__/music-generation.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 206 | `generate music - suno` | Successful generation |
| 207 | `generate music - modal` | Successful generation |
| 208 | `generate music - deducts credits` | 10 credits per track |
| 209 | `generate music - tracks real cost` | $0.05 per track |
| 210 | `generate music - with genre` | Genre parameter |
| 211 | `generate music - with mood` | Mood parameter |
| 212 | `generate music - duration limit` | Max duration |
| 213 | `generate music - saves to S3` | URL returned |
| 214 | `generate music - failed provider` | Error handling |
| 215 | `generate music - rate limiting` | Handles limits |

---

### 4.5 Scene Generation Tests (15 tests)

**File:** `src/app/api/claude/scenes/__tests__/scene-generation.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 216 | `generate scenes - openrouter` | Uses configured LLM |
| 217 | `generate scenes - claude-sdk` | Free with Pro/Max |
| 218 | `generate scenes - gemini` | Alternative provider |
| 219 | `generate scenes - deducts credits` | 2 credits per scene |
| 220 | `generate scenes - batch creation` | Multiple scenes |
| 221 | `generate scenes - creates characters` | From story analysis |
| 222 | `generate scenes - parses JSON` | Structured output |
| 223 | `generate scenes - invalid response` | Retry/fallback |
| 224 | `generate scenes - Inngest job created` | Background processing |
| 225 | `generate scenes - progress tracking` | Job status updates |
| 226 | `generate scenes - error recovery` | Partial success handling |
| 227 | `generate characters - deducts credits` | 2 credits each |
| 228 | `generate characters - with reference` | Character consistency |
| 229 | `regenerate scene - updates existing` | Replaces content |
| 230 | `batch scene generation - all at once` | Full project generation |

---

## Phase 5: Statistics & Reporting Tests (25 tests)

### 5.1 User Statistics Tests (15 tests)

**File:** `src/app/api/statistics/__tests__/user-statistics.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 231 | `getUserStatistics - total spent` | Sum of all transactions |
| 232 | `getUserStatistics - total real cost` | Sum of realCost field |
| 233 | `getUserStatistics - by type breakdown` | IMAGE, VIDEO, TTS, etc. |
| 234 | `getUserStatistics - by provider breakdown` | Gemini, Modal, etc. |
| 235 | `getUserStatistics - by project breakdown` | Per-project totals |
| 236 | `getUserStatistics - time range filter` | Last 30 days, etc. |
| 237 | `getUserStatistics - generation count` | Total generations |
| 238 | `getUserStatistics - regeneration count` | Regen-flagged count |
| 239 | `getUserStatistics - average cost per gen` | Calculated average |
| 240 | `getUserStatistics - credits remaining` | Current balance |
| 241 | `getUserStatistics - credits purchased` | totalReceived |
| 242 | `getUserStatistics - credits spent` | totalSpent |
| 243 | `getUserStatistics - empty history` | New user case |
| 244 | `getUserStatistics - cross-project totals` | Aggregation correct |
| 245 | `getUserStatistics - pagination` | Large transaction count |

---

### 5.2 Project Statistics Tests (10 tests)

**File:** `src/app/api/statistics/project/__tests__/project-statistics.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 246 | `getProjectStatistics - total cost` | Project total |
| 247 | `getProjectStatistics - by type` | Type breakdown |
| 248 | `getProjectStatistics - by contributor` | Who spent what |
| 249 | `getProjectStatistics - regeneration costs` | Regen totals |
| 250 | `getProjectStatistics - image count` | Total images |
| 251 | `getProjectStatistics - video count` | Total videos |
| 252 | `getProjectStatistics - owner cost vs collab` | Split by role |
| 253 | `getProjectStatistics - timeline` | Costs over time |
| 254 | `getProjectStatistics - empty project` | No generations yet |
| 255 | `getProjectStatistics - access control` | Only members see |

---

## Phase 6: Edge Cases & Security Tests (25 tests)

### 6.1 Concurrency & Race Conditions (10 tests)

**File:** `src/lib/services/__tests__/concurrency.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 256 | `concurrent credit deduction` | No double-spend |
| 257 | `concurrent invitation accept` | Single membership |
| 258 | `concurrent regeneration approve` | Single approval |
| 259 | `concurrent generation requests` | Queue handling |
| 260 | `user deletion during generation` | Graceful handling |
| 261 | `project deletion during regen` | Cleanup proper |
| 262 | `member removal during operation` | Access revoked mid-op |
| 263 | `simultaneous role changes` | Consistent state |
| 264 | `parallel statistics queries` | Accurate aggregation |
| 265 | `transaction rollback on failure` | Atomicity verified |

---

### 6.2 Security Tests (10 tests)

**File:** `src/app/api/__tests__/security.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 266 | `cross-user data isolation` | Can't access other's data |
| 267 | `project member enumeration` | Can't list all users |
| 268 | `API key not exposed` | Hidden in responses |
| 269 | `SQL injection prevention` | Prisma parameterization |
| 270 | `invitation token security` | Not guessable |
| 271 | `rate limiting - generation` | Prevents abuse |
| 272 | `rate limiting - auth` | Prevents brute force |
| 273 | `session hijacking prevention` | Secure cookies |
| 274 | `CSRF protection` | Token validation |
| 275 | `sensitive data in logs` | No PII leaked |

---

### 6.3 Error Handling Tests (5 tests)

**File:** `src/lib/services/__tests__/error-handling.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 276 | `database connection failure` | Graceful degradation |
| 277 | `external API timeout` | Retry logic |
| 278 | `invalid input validation` | Proper error messages |
| 279 | `partial batch failure` | Continues processing |
| 280 | `recovery after crash` | Job resumption |

---

## Test Data Factories

### User Factory
```typescript
// src/test/factories/user.ts
export const createTestUser = async (overrides = {}) => {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: await hash('password123'),
      ...overrides
    }
  });
};
```

### Project Factory
```typescript
// src/test/factories/project.ts
export const createTestProject = async (userId: string, overrides = {}) => {
  return prisma.project.create({
    data: {
      name: 'Test Project',
      userId,
      visibility: 'private',
      currentStep: 0,
      ...overrides
    }
  });
};
```

### Credit Factory
```typescript
// src/test/factories/credits.ts
export const createTestCredits = async (userId: string, balance = 1000) => {
  return prisma.credits.create({
    data: {
      userId,
      balance,
      totalSpent: 0,
      totalReceived: balance
    }
  });
};
```

---

## Execution Order

### Phase 1: Foundation (Week 1)
- Set up testing framework
- Implement unit tests for credits, real-costs, permissions
- Create test factories

### Phase 2: Role Testing (Week 2)
- Authentication tests
- Role-based access tests (admin, collaborator, reader, public)

### Phase 3: Workflows (Week 3)
- Invitation flow tests
- Deletion request tests
- Regeneration request tests (most complex)

### Phase 4: Generations (Week 4)
- Image, video, TTS, music generation tests
- Cost tracking verification
- Scene generation tests

### Phase 5: Statistics (Week 5)
- User statistics accuracy
- Project statistics accuracy
- Aggregation tests

### Phase 6: Edge Cases (Week 6)
- Concurrency tests
- Security tests
- Error handling tests

---

## Running Tests

```bash
# Run all tests
npm run test

# Run specific phase
npm run test -- --grep "Phase 1"

# Run with coverage
npm run test:coverage

# Run specific file
npm run test src/lib/services/__tests__/credits.test.ts

# Watch mode for development
npm run test:watch
```

---

## Coverage Goals

| Area | Target Coverage |
|------|-----------------|
| Credits Service | 95% |
| Permissions | 95% |
| API Routes | 85% |
| Collaboration Flows | 90% |
| Generation Endpoints | 80% |
| Statistics | 85% |
| Overall | 85% |

---

---

## Phase 7: Complete API Route Tests (90 tests)

### 7.1 Project API Routes (20 tests)

**File:** `src/app/api/projects/__tests__/projects-api.test.ts`

| # | Test Case | Route | Method | Description |
|---|-----------|-------|--------|-------------|
| 281 | `GET /api/projects` | `/projects` | GET | List user's projects |
| 282 | `GET /api/projects - pagination` | `/projects` | GET | Paginated results |
| 283 | `GET /api/projects - filtering` | `/projects` | GET | Filter by status |
| 284 | `POST /api/projects` | `/projects` | POST | Create new project |
| 285 | `POST /api/projects - validation` | `/projects` | POST | Invalid data rejected |
| 286 | `GET /api/projects/:id` | `/projects/[id]` | GET | Get single project |
| 287 | `GET /api/projects/:id - not found` | `/projects/[id]` | GET | 404 for missing |
| 288 | `PUT /api/projects/:id` | `/projects/[id]` | PUT | Update project |
| 289 | `PUT /api/projects/:id - partial` | `/projects/[id]` | PUT | Partial update |
| 290 | `DELETE /api/projects/:id` | `/projects/[id]` | DELETE | Delete project |
| 291 | `DELETE /api/projects/:id - cascade` | `/projects/[id]` | DELETE | Cascade deletes |
| 292 | `GET /api/projects/public` | `/projects/public` | GET | List public projects |
| 293 | `GET /api/projects/costs` | `/projects/costs` | GET | Project cost estimates |
| 294 | `POST /api/projects/import` | `/projects/import` | POST | Import project |
| 295 | `GET /api/projects/:id/export` | `/projects/[id]/export` | GET | Export project JSON |
| 296 | `GET /api/projects/:id/members/me` | `/projects/[id]/members/me` | GET | Get own membership |
| 297 | `POST /api/projects/:id/scenes` | `/projects/[id]/scenes` | POST | Create scene |
| 298 | `PUT /api/projects/:id/scenes` | `/projects/[id]/scenes` | PUT | Bulk update scenes |
| 299 | `PUT /api/projects/:id/scenes/:sceneId` | `/projects/[id]/scenes/[sceneId]` | PUT | Update scene |
| 300 | `DELETE /api/projects/:id/scenes/:sceneId` | `/projects/[id]/scenes/[sceneId]` | DELETE | Delete scene |

---

### 7.2 Character API Routes (10 tests)

**File:** `src/app/api/projects/__tests__/characters-api.test.ts`

| # | Test Case | Route | Method | Description |
|---|-----------|-------|--------|-------------|
| 301 | `POST /api/projects/:id/characters` | `/characters` | POST | Create character |
| 302 | `POST /api/projects/:id/characters - validation` | `/characters` | POST | Validate required fields |
| 303 | `PUT /api/projects/:id/characters/:id` | `/characters/[characterId]` | PUT | Update character |
| 304 | `PUT /api/projects/:id/characters/:id - image` | `/characters/[characterId]` | PUT | Update with image |
| 305 | `DELETE /api/projects/:id/characters/:id` | `/characters/[characterId]` | DELETE | Delete character |
| 306 | `DELETE /api/projects/:id/characters/:id - with image` | `/characters/[characterId]` | DELETE | Cleans up S3 |
| 307 | `characters - admin can CRUD` | `/characters/*` | ALL | Admin permissions |
| 308 | `characters - collaborator can CRUD` | `/characters/*` | ALL | Collaborator permissions |
| 309 | `characters - reader cannot modify` | `/characters/*` | PUT/DELETE | Reader blocked |
| 310 | `characters - validates project ownership` | `/characters/*` | ALL | Cross-project blocked |

---

### 7.3 Member API Routes (10 tests)

**File:** `src/app/api/projects/__tests__/members-api.test.ts`

| # | Test Case | Route | Method | Description |
|---|-----------|-------|--------|-------------|
| 311 | `GET /api/projects/:id/members` | `/members` | GET | List project members |
| 312 | `GET /api/projects/:id/members - includes invites` | `/members` | GET | Pending invitations |
| 313 | `PUT /api/projects/:id/members/:id` | `/members/[memberId]` | PUT | Update member role |
| 314 | `PUT /api/projects/:id/members/:id - cannot demote owner` | `/members/[memberId]` | PUT | Owner protection |
| 315 | `DELETE /api/projects/:id/members/:id` | `/members/[memberId]` | DELETE | Remove member |
| 316 | `DELETE /api/projects/:id/members/:id - cannot remove owner` | `/members/[memberId]` | DELETE | Owner protection |
| 317 | `members - admin only operations` | `/members/*` | ALL | Admin required |
| 318 | `members - collaborator cannot manage` | `/members/*` | PUT/DELETE | Blocked |
| 319 | `members - self leave project` | `/members/[memberId]` | DELETE | Member can leave |
| 320 | `members - last admin cannot leave` | `/members/[memberId]` | DELETE | Protection |

---

### 7.4 Admin API Routes (15 tests)

**File:** `src/app/api/admin/__tests__/admin-api.test.ts`

| # | Test Case | Route | Method | Description |
|---|-----------|-------|--------|-------------|
| 321 | `GET /api/admin/users` | `/admin/users` | GET | List all users |
| 322 | `GET /api/admin/users/:id` | `/admin/users/[userId]` | GET | Get user details |
| 323 | `PUT /api/admin/users/:id` | `/admin/users/[userId]` | PUT | Update user |
| 324 | `POST /api/admin/create-user` | `/admin/create-user` | POST | Create new user |
| 325 | `GET /api/admin/app-config` | `/admin/app-config` | GET | Get app settings |
| 326 | `PUT /api/admin/app-config` | `/admin/app-config` | PUT | Update app settings |
| 327 | `GET /api/admin/approvals` | `/admin/approvals` | GET | Pending approvals |
| 328 | `POST /api/admin/transfer-project` | `/admin/transfer-project` | POST | Transfer ownership |
| 329 | `POST /api/admin/clear-cache` | `/admin/clear-cache` | POST | Clear pricing cache |
| 330 | `POST /api/admin/fix-costs` | `/admin/fix-costs` | POST | Recalculate costs |
| 331 | `POST /api/admin/fix-image-costs` | `/admin/fix-image-costs` | POST | Fix image transactions |
| 332 | `POST /api/admin/fix-video-costs` | `/admin/fix-video-costs` | POST | Fix video transactions |
| 333 | `GET /api/admin/debug-transactions` | `/admin/debug-transactions` | GET | Debug transaction data |
| 334 | `admin - requires system admin role` | `/admin/*` | ALL | Non-admin blocked |
| 335 | `admin - all endpoints authenticated` | `/admin/*` | ALL | Unauthenticated blocked |

---

### 7.5 User API Routes (10 tests)

**File:** `src/app/api/user/__tests__/user-api.test.ts`

| # | Test Case | Route | Method | Description |
|---|-----------|-------|--------|-------------|
| 336 | `GET /api/user/api-keys` | `/user/api-keys` | GET | Get user's API keys |
| 337 | `GET /api/user/api-keys - masked` | `/user/api-keys` | GET | Keys are masked |
| 338 | `POST /api/user/api-keys` | `/user/api-keys` | POST | Save API keys |
| 339 | `POST /api/user/api-keys - validation` | `/user/api-keys` | POST | Invalid key format |
| 340 | `POST /api/user/api-keys - provider selection` | `/user/api-keys` | POST | Provider preferences |
| 341 | `GET /api/user/status` | `/user/status` | GET | User status/credits |
| 342 | `user - authenticated only` | `/user/*` | ALL | Unauthenticated blocked |
| 343 | `user - cannot access other users` | `/user/*` | ALL | Isolation verified |
| 344 | `user - api keys encrypted` | `/user/api-keys` | ALL | Encryption verified |
| 345 | `user - provider defaults` | `/user/api-keys` | GET | Default providers |

---

### 7.6 Credits API Routes (10 tests)

**File:** `src/app/api/credits/__tests__/credits-api.test.ts`

| # | Test Case | Route | Method | Description |
|---|-----------|-------|--------|-------------|
| 346 | `GET /api/credits` | `/credits` | GET | Get credit balance |
| 347 | `GET /api/credits - with history` | `/credits` | GET | Transaction history |
| 348 | `GET /api/credits - pagination` | `/credits` | GET | History pagination |
| 349 | `POST /api/credits` | `/credits` | POST | Add credits (admin/webhook) |
| 350 | `POST /api/credits - purchase type` | `/credits` | POST | Purchase transaction |
| 351 | `POST /api/credits - bonus type` | `/credits` | POST | Bonus transaction |
| 352 | `credits - authenticated only` | `/credits` | ALL | Unauthenticated blocked |
| 353 | `credits - user isolation` | `/credits` | ALL | Cannot see other's credits |
| 354 | `credits - transaction immutable` | `/credits` | ALL | Cannot modify history |
| 355 | `credits - negative balance prevented` | `/credits` | POST | Cannot go negative |

---

### 7.7 Notification API Routes (10 tests)

**File:** `src/app/api/notifications/__tests__/notifications-api.test.ts`

| # | Test Case | Route | Method | Description |
|---|-----------|-------|--------|-------------|
| 356 | `GET /api/notifications` | `/notifications` | GET | List notifications |
| 357 | `GET /api/notifications - unread filter` | `/notifications` | GET | Filter by read status |
| 358 | `GET /api/notifications - pagination` | `/notifications` | GET | Paginated results |
| 359 | `PUT /api/notifications/:id/read` | `/notifications/[id]/read` | PUT | Mark as read |
| 360 | `PUT /api/notifications/read-all` | `/notifications/read-all` | PUT | Mark all read |
| 361 | `notifications - user isolation` | `/notifications` | ALL | Only own notifications |
| 362 | `notifications - auto cleanup old` | `/notifications` | GET | Old notifications removed |
| 363 | `notifications - types: invitation` | `/notifications` | GET | Invitation notifications |
| 364 | `notifications - types: approval` | `/notifications` | GET | Approval notifications |
| 365 | `notifications - types: regeneration` | `/notifications` | GET | Regen notifications |

---

### 7.8 Polar/Billing API Routes (5 tests)

**File:** `src/app/api/polar/__tests__/polar-api.test.ts`

| # | Test Case | Route | Method | Description |
|---|-----------|-------|--------|-------------|
| 366 | `GET /api/polar` | `/polar` | GET | Get subscription status |
| 367 | `POST /api/polar` | `/polar` | POST | Create checkout session |
| 368 | `POST /api/polar/webhook` | `/polar/webhook` | POST | Handle webhook |
| 369 | `webhook - subscription activated` | `/polar/webhook` | POST | Adds credits |
| 370 | `webhook - subscription cancelled` | `/polar/webhook` | POST | Updates status |

---

## Phase 8: Workflow Step Tests (70 tests)

### 8.1 Step 1 - Prompt Generator Tests (15 tests)

**File:** `src/components/workflow/__tests__/step1-prompt-generator.test.tsx`

| # | Test Case | Description |
|---|-----------|-------------|
| 371 | `render prompt generator` | Component renders correctly |
| 372 | `enter film concept` | Text input works |
| 373 | `generate prompt button` | Triggers API call |
| 374 | `generate prompt - loading state` | Shows spinner |
| 375 | `generate prompt - success` | Displays generated prompt |
| 376 | `generate prompt - error handling` | Shows error message |
| 377 | `edit prompt toggle` | Enables editing |
| 378 | `save edited prompt` | Saves changes |
| 379 | `cancel edit` | Reverts changes |
| 380 | `credit cost display` | Shows scene gen cost |
| 381 | `insufficient credits warning` | Shows when low balance |
| 382 | `admin - can generate` | Admin permissions |
| 383 | `collaborator - can generate` | Collaborator permissions |
| 384 | `reader - cannot generate` | Reader blocked |
| 385 | `regenerate prompt` | Regenerates with cost |

---

### 8.2 Step 2 - Character Generator Tests (20 tests)

**File:** `src/components/workflow/__tests__/step2-character-generator.test.tsx`

| # | Test Case | Description |
|---|-----------|-------------|
| 386 | `render character generator` | Component renders |
| 387 | `add character dialog` | Opens add dialog |
| 388 | `create character - form validation` | Validates required fields |
| 389 | `create character - submit` | Creates character |
| 390 | `edit character button` | Opens edit dialog |
| 391 | `edit character - save` | Saves changes |
| 392 | `delete character button` | Shows confirm dialog |
| 393 | `delete character - confirm` | Deletes character |
| 394 | `generate character image button` | Triggers generation |
| 395 | `generate image - loading state` | Shows progress |
| 396 | `generate image - success` | Displays image |
| 397 | `generate all images button` | Batch generation |
| 398 | `regenerate prompt button` | Regenerates description |
| 399 | `copy prompts dialog` | Opens prompts dialog |
| 400 | `image preview modal` | Opens fullscreen preview |
| 401 | `upload custom image` | File upload works |
| 402 | `character card display` | Shows all fields |
| 403 | `character progress bar` | Shows completion % |
| 404 | `image generation settings` | Resolution/aspect ratio |
| 405 | `credit cost per character` | 2 credits per gen |

---

### 8.3 Step 3 - Scene Generator Tests (25 tests)

**File:** `src/components/workflow/__tests__/step3-scene-generator.test.tsx`

| # | Test Case | Description |
|---|-----------|-------------|
| 406 | `render scene generator` | Component renders |
| 407 | `generate all scenes button` | Triggers batch gen |
| 408 | `generate scenes - loading` | Shows progress |
| 409 | `generate scenes - success` | Displays scenes |
| 410 | `add scene dialog` | Opens add dialog |
| 411 | `add scene - form validation` | Validates fields |
| 412 | `add scene - with dialogue` | Adds dialogue lines |
| 413 | `edit scene dialog` | Opens edit dialog |
| 414 | `edit scene - save` | Saves changes |
| 415 | `delete scene - confirm` | Shows confirm |
| 416 | `generate scene image button` | Single scene gen |
| 417 | `generate all images button` | Batch image gen |
| 418 | `generate batch button` | Inngest batch job |
| 419 | `image preview modal` | Fullscreen preview |
| 420 | `scene card display` | Shows all fields |
| 421 | `scene pagination` | Navigate pages |
| 422 | `select scenes - checkbox` | Multi-select |
| 423 | `select all button` | Select all scenes |
| 424 | `select with images` | Filter selection |
| 425 | `clear selection` | Deselect all |
| 426 | `regenerate selected` | Batch regenerate |
| 427 | `copy prompts button` | Opens prompts dialog |
| 428 | `stop generation button` | Cancel in progress |
| 429 | `request regeneration - collaborator` | Opens request dialog |
| 430 | `quick actions menu` | All action buttons work |

---

### 8.4 Step 4 - Video Generator Tests (15 tests)

**File:** `src/components/workflow/__tests__/step4-video-generator.test.tsx`

| # | Test Case | Description |
|---|-----------|-------------|
| 431 | `render video generator` | Component renders |
| 432 | `generate video button` | Triggers generation |
| 433 | `generate video - loading` | Shows progress |
| 434 | `generate video - success` | Displays video |
| 435 | `generate all videos button` | Batch generation |
| 436 | `video player controls` | Play/pause works |
| 437 | `video download button` | Downloads video |
| 438 | `delete video - confirm` | Shows confirm |
| 439 | `video card display` | Shows scene info |
| 440 | `video pagination` | Navigate pages |
| 441 | `select videos - checkbox` | Multi-select |
| 442 | `generate selected` | Batch selected |
| 443 | `video specs info` | Shows specs |
| 444 | `cost summary display` | Shows total cost |
| 445 | `no images warning` | Warns if no images |

---

### 8.5 Step 5 - Voiceover Generator Tests (10 tests)

**File:** `src/components/workflow/__tests__/step5-voiceover-generator.test.tsx`

| # | Test Case | Description |
|---|-----------|-------------|
| 446 | `render voiceover generator` | Component renders |
| 447 | `generate voiceover button` | Triggers generation |
| 448 | `generate all voiceovers` | Batch generation |
| 449 | `play audio button` | Audio playback |
| 450 | `download audio button` | Downloads audio |
| 451 | `provider selector` | Switch providers |
| 452 | `voice settings dialog` | Voice configuration |
| 453 | `dialogue line card` | Shows dialogue |
| 454 | `voiceover progress` | Shows completion % |
| 455 | `download all button` | Batch download |

---

## Phase 9: Admin Panel Tests (30 tests)

### 9.1 Admin Dashboard Tests (15 tests)

**File:** `src/app/admin/__tests__/admin-dashboard.test.tsx`

| # | Test Case | Description |
|---|-----------|-------------|
| 456 | `render admin dashboard` | Page renders |
| 457 | `user list display` | Shows all users |
| 458 | `user search` | Search functionality |
| 459 | `user filter by role` | Role filtering |
| 460 | `edit user dialog` | Opens edit dialog |
| 461 | `update user role` | Role changes saved |
| 462 | `update user credits` | Credit adjustment |
| 463 | `create user form` | New user creation |
| 464 | `app config panel` | Config settings |
| 465 | `update starting credits` | Default credits |
| 466 | `pending approvals list` | Shows pending items |
| 467 | `approve request button` | Approves item |
| 468 | `reject request button` | Rejects item |
| 469 | `transfer project form` | Project transfer |
| 470 | `admin - requires admin role` | Non-admin blocked |

---

### 9.2 Approval Panel Tests (15 tests)

**File:** `src/components/collaboration/__tests__/approval-panel.test.tsx`

| # | Test Case | Description |
|---|-----------|-------------|
| 471 | `render approval panel` | Component renders |
| 472 | `regeneration requests tab` | Shows regen requests |
| 473 | `deletion requests tab` | Shows deletion requests |
| 474 | `prompt edit requests tab` | Shows edit requests |
| 475 | `approve regeneration button` | Approves regen |
| 476 | `reject regeneration button` | Rejects regen |
| 477 | `approve deletion button` | Approves deletion |
| 478 | `reject deletion button` | Rejects deletion |
| 479 | `approve prompt edit button` | Approves edit |
| 480 | `revert prompt edit button` | Reverts edit |
| 481 | `add rejection note` | Note input |
| 482 | `request details display` | Shows full info |
| 483 | `diff view for edits` | Shows before/after |
| 484 | `empty state display` | No pending items |
| 485 | `refresh button` | Reloads data |

---

## Phase 10: Complete Cost Deduction Tests (40 tests)

### 10.1 Image Generation Costs (10 tests)

**File:** `src/app/api/image/__tests__/image-costs.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 486 | `image gen - gemini 1K costs 27 credits` | Credit deduction |
| 487 | `image gen - gemini 2K costs 27 credits` | Credit deduction |
| 488 | `image gen - gemini 4K costs 48 credits` | Credit deduction |
| 489 | `image gen - modal costs 27 credits` | Credit deduction |
| 490 | `image gen - tracks $0.24 real cost gemini` | Real cost tracked |
| 491 | `image gen - tracks $0.09 real cost modal` | Real cost tracked |
| 492 | `image regen - marked isRegeneration` | Metadata flag |
| 493 | `image gen - transaction type=IMAGE` | Correct type |
| 494 | `image gen - provider recorded` | Provider in metadata |
| 495 | `image gen - projectId associated` | Project linked |

---

### 10.2 Video Generation Costs (10 tests)

**File:** `src/app/api/video/__tests__/video-costs.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 496 | `video gen - kie costs 20 credits` | Credit deduction |
| 497 | `video gen - modal costs 20 credits` | Credit deduction |
| 498 | `video gen - tracks $0.10 real cost kie` | Real cost tracked |
| 499 | `video gen - tracks $0.15 real cost modal` | Real cost tracked |
| 500 | `video regen - marked isRegeneration` | Metadata flag |
| 501 | `video gen - transaction type=VIDEO` | Correct type |
| 502 | `video gen - provider recorded` | Provider in metadata |
| 503 | `video gen - duration tracked` | Duration in metadata |
| 504 | `video gen - projectId associated` | Project linked |
| 505 | `video gen - sceneId associated` | Scene linked |

---

### 10.3 TTS Generation Costs (10 tests)

**File:** `src/app/api/tts/__tests__/tts-costs.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 506 | `tts gen - elevenlabs costs 6 credits` | Credit deduction |
| 507 | `tts gen - gemini-tts costs 6 credits` | Credit deduction |
| 508 | `tts gen - modal costs 6 credits` | Credit deduction |
| 509 | `tts gen - tracks $0.03 real cost 11labs` | Real cost tracked |
| 510 | `tts gen - tracks $0.002 real cost gemini` | Real cost tracked |
| 511 | `tts gen - tracks $0.01 real cost modal` | Real cost tracked |
| 512 | `tts gen - transaction type=TTS` | Correct type |
| 513 | `tts gen - voice recorded` | Voice in metadata |
| 514 | `tts gen - character count tracked` | Count in metadata |
| 515 | `tts gen - projectId associated` | Project linked |

---

### 10.4 Scene & Music Generation Costs (10 tests)

**File:** `src/app/api/__tests__/generation-costs.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 516 | `scene gen - costs 2 credits per scene` | Credit deduction |
| 517 | `scene gen - tracks real cost by provider` | Real cost tracked |
| 518 | `scene gen - transaction type=SCENE` | Correct type |
| 519 | `scene gen - batch deduction correct` | N scenes = N*2 credits |
| 520 | `character gen - costs 2 credits` | Credit deduction |
| 521 | `character gen - transaction type=CHARACTER` | Correct type |
| 522 | `music gen - suno costs 10 credits` | Credit deduction |
| 523 | `music gen - tracks $0.05 real cost` | Real cost tracked |
| 524 | `music gen - transaction type=MUSIC` | Correct type |
| 525 | `prompt gen - tracks cost` | Prompt generation cost |

---

## Phase 11: End-to-End Integration Tests (30 tests)

### 11.1 Full Project Creation Flow (10 tests)

**File:** `src/test/e2e/project-creation.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 526 | `create project - complete flow` | New project to scenes |
| 527 | `generate all content - full project` | All steps complete |
| 528 | `project with 60 scenes` | Large project handling |
| 529 | `project export - complete` | Export with all assets |
| 530 | `project import - complete` | Import from export |
| 531 | `project clone - complete` | Clone all content |
| 532 | `project delete - cascade` | All data removed |
| 533 | `project visibility toggle` | Public/private switch |
| 534 | `project transfer - complete` | Owner changed |
| 535 | `multi-project user` | Multiple projects work |

---

### 11.2 Collaboration Flow Tests (10 tests)

**File:** `src/test/e2e/collaboration-flow.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 536 | `invite collaborator - complete flow` | Invite to active member |
| 537 | `collaborator generates content` | Uses own credits |
| 538 | `regeneration request - full flow` | Request to completed |
| 539 | `deletion request - full flow` | Request to deleted |
| 540 | `prompt edit request - full flow` | Request to applied |
| 541 | `member role change - full flow` | Promotion/demotion |
| 542 | `member removal - full flow` | Remove and verify access |
| 543 | `multiple collaborators` | Team collaboration |
| 544 | `cross-user credit isolation` | Credits separate |
| 545 | `notification delivery` | All parties notified |

---

### 11.3 Billing & Credits Flow Tests (10 tests)

**File:** `src/test/e2e/billing-flow.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 546 | `purchase credits - complete flow` | Checkout to balance |
| 547 | `subscription activation` | Credits added monthly |
| 548 | `subscription cancellation` | Access removed |
| 549 | `credit depletion` | Cannot generate at 0 |
| 550 | `bonus credits` | Admin adds bonus |
| 551 | `cost multiplier applied` | User multiplier works |
| 552 | `statistics accuracy` | All costs tracked |
| 553 | `project statistics accuracy` | Per-project totals |
| 554 | `user statistics accuracy` | Per-user totals |
| 555 | `refund handling` | Credits restored |

---

## Phase 12: Service Function Unit Tests (50 tests)

### 12.1 App Config Service Tests (8 tests)

**File:** `src/lib/services/__tests__/app-config.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 556 | `getAppConfig - returns config` | Retrieves settings |
| 557 | `getAppConfig - creates default` | Creates if missing |
| 558 | `getStartingCredits - returns value` | Gets starting credits |
| 559 | `updateStartingCredits - updates` | Saves new value |
| 560 | `updateAppConfig - partial update` | Updates subset |
| 561 | `updateAppConfig - validation` | Invalid values rejected |
| 562 | `app config - cached` | Caching works |
| 563 | `app config - cache invalidation` | Cache clears on update |

---

### 12.2 Email Service Tests (7 tests)

**File:** `src/lib/services/__tests__/email.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 564 | `sendInvitationEmail - sends` | Email sent successfully |
| 565 | `sendInvitationEmail - content` | Correct content |
| 566 | `sendNotificationEmail - sends` | Email sent successfully |
| 567 | `sendNotificationEmail - types` | All notification types |
| 568 | `isEmailConfigured - true` | Config check |
| 569 | `isEmailConfigured - false` | Missing config |
| 570 | `email - error handling` | Failed send handling |

---

### 12.3 S3 Upload Service Tests (10 tests)

**File:** `src/lib/services/__tests__/s3-upload.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 571 | `uploadBase64ToS3 - image` | Uploads image |
| 572 | `uploadBase64ToS3 - video` | Uploads video |
| 573 | `uploadBase64ToS3 - audio` | Uploads audio |
| 574 | `uploadBufferToS3 - success` | Buffer upload |
| 575 | `uploadImageToS3 - success` | Image specific |
| 576 | `uploadVideoToS3 - success` | Video specific |
| 577 | `uploadAudioToS3 - success` | Audio specific |
| 578 | `deleteFromS3 - success` | Deletes object |
| 579 | `isS3Configured - check` | Config verification |
| 580 | `S3 - error handling` | Failed upload handling |

---

### 12.4 Pricing Service Tests (10 tests)

**File:** `src/lib/services/__tests__/pricing-service.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 581 | `loadPricingFromDB - loads all` | Fetches all prices |
| 582 | `getActionCostFromDB - returns` | Gets specific cost |
| 583 | `getActionCostSync - cached` | Uses cache |
| 584 | `invalidatePricingCache - clears` | Cache cleared |
| 585 | `getAllPricing - formatted` | Returns formatted data |
| 586 | `upsertActionCost - create` | Creates new price |
| 587 | `upsertActionCost - update` | Updates existing |
| 588 | `seedPricingData - seeds` | Seeds defaults |
| 589 | `pricing - fallback to constants` | Uses defaults |
| 590 | `pricing - cache refresh` | Auto refresh |

---

### 12.5 Provider Service Tests (15 tests)

**File:** `src/lib/services/__tests__/providers.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 591 | `gemini - generateText` | Text generation |
| 592 | `gemini - generateImage` | Image generation |
| 593 | `gemini - generateSpeech` | TTS generation |
| 594 | `grok - generateVideo` | Video generation |
| 595 | `grok - checkVideoStatus` | Status polling |
| 596 | `elevenlabs - getVoices` | Voice list |
| 597 | `elevenlabs - generateSpeech` | TTS generation |
| 598 | `openrouter - callOpenRouter` | LLM call |
| 599 | `openrouter - streamOpenRouter` | Streaming LLM |
| 600 | `nanoBanana - generateImage` | Image generation |
| 601 | `nanoBanana - checkImageStatus` | Status polling |
| 602 | `piapi - createMusicTask` | Music generation |
| 603 | `piapi - getMusicTaskStatus` | Status polling |
| 604 | `polar - createCheckout` | Checkout session |
| 605 | `polar - getSubscription` | Subscription info |

---

## Summary

| Phase | Tests | Description |
|-------|-------|-------------|
| 1 | 45 | Core Unit Tests (Credits, Costs, Permissions) |
| 2 | 55 | Role & Permission Integration Tests |
| 3 | 60 | Collaboration Workflow Tests |
| 4 | 70 | Generation & Cost Tracking Tests |
| 5 | 25 | Statistics & Reporting Tests |
| 6 | 25 | Edge Cases & Security Tests |
| 7 | 90 | Complete API Route Tests |
| 8 | 70 | Workflow Step Tests |
| 9 | 30 | Admin Panel Tests |
| 10 | 40 | Complete Cost Deduction Tests |
| 11 | 30 | End-to-End Integration Tests |
| 12 | 50 | Service Function Unit Tests |
| **Total** | **590** | **Comprehensive Coverage** |

---

## Notes

1. **Mock External APIs**: All Modal, Gemini, ElevenLabs calls should be mocked
2. **Test Database**: Use separate test database or transactions that rollback
3. **Fixtures**: Pre-create common test data to speed up tests
4. **Parallel Execution**: Tests should be independent for parallel running
5. **CI Integration**: Add to GitHub Actions for PR validation
6. **Cost Verification**: Every generation API must have corresponding cost deduction test
7. **Role Matrix**: Every action tested for all 4 roles (admin, collaborator, reader, public)
