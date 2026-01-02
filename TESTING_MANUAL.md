# Testing Manual for Film Generator

## Quick Start

```bash
# Run all tests
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm run test src/lib/services/__tests__/credits.test.ts

# Run tests matching a pattern
npm run test -- --grep "admin"
```

## Test Database

Tests use a separate Neon database to avoid affecting production data:

- **Project**: `film-generator-test`
- **Database**: `neondb`
- **Region**: `eu-central-1`

The database is automatically cleaned after each test.

## Test Structure

```
src/
├── test/
│   ├── setup.ts              # Global setup, cleanup, mocks
│   └── factories/            # Test data creators
│       ├── user.ts           # createTestUser(), createTestAdmin()
│       ├── project.ts        # createTestProject(), addProjectMember()
│       ├── credits.ts        # createTestCredits()
│       ├── scene.ts          # createTestScene(), createTestScenes()
│       ├── collaboration.ts  # createRegenerationRequest(), etc.
│       └── index.ts          # createFullTestEnvironment()
├── lib/
│   ├── services/__tests__/   # Service unit tests
│   └── __tests__/            # Other lib tests
└── app/api/
    └── **/__tests__/         # API route tests
```

## Running Tests by Phase

```bash
# Phase 1: Core unit tests (credits, permissions, costs)
npm run test:phase1

# Phase 2: Role-based access tests
npm run test:phase2

# Phase 3: Collaboration workflows
npm run test:phase3

# Phase 4: Generation tests
npm run test:phase4

# Phase 5: Statistics tests
npm run test:phase5

# Phase 6: Security tests
npm run test:phase6

# Phase 13: Security attack simulation tests
npm run test src/app/api/__tests__/security-attacks.test.ts

# Phase 14: Database & S3 load monitoring tests
npm run test src/app/api/__tests__/load-monitoring.test.ts
```

## Writing New Tests

### 1. Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser, createTestProject } from '@/test/factories'

describe('Feature Name', () => {
  describe('Sub-feature', () => {
    it('should do something specific', async () => {
      // Arrange - Set up test data
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      // Act - Perform the action
      const result = await someFunction(project.id)

      // Assert - Check the result
      expect(result).toBeDefined()
      expect(result.status).toBe('success')
    })
  })
})
```

### 2. Using Test Factories

```typescript
// Create a single user
const user = await createTestUser({ name: 'Test User' })

// Create user with credits
const user = await createTestUser()
const credits = await createTestCredits(user.id, { balance: 500 })

// Create a full test environment (admin, collaborator, reader, project, scenes)
const { users, project, scenes, credits } = await createFullTestEnvironment({
  sceneCount: 5,
  adminCredits: 1000,
  collaboratorCredits: 500
})

// Access users
users.admin      // Project owner with admin role
users.collaborator
users.reader
users.outsider   // User with no project access
```

### 3. Testing Database Operations

```typescript
// Create data
const project = await prisma.project.create({
  data: { userId: user.id, name: 'Test' }
})

// Update data
await prisma.project.update({
  where: { id: project.id },
  data: { name: 'Updated' }
})

// Query data
const found = await prisma.project.findUnique({
  where: { id: project.id }
})

// Delete data
await prisma.project.delete({
  where: { id: project.id }
})
```

### 4. Testing Permissions

```typescript
it('collaborator cannot delete project', async () => {
  const { users, project } = await createFullTestEnvironment()

  // Check role
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: project.id, userId: users.collaborator.id }
    }
  })

  expect(member?.role).toBe('collaborator')
  // In real API, delete would return 403
})
```

### 5. Testing Credit Operations

```typescript
it('deducts credits correctly', async () => {
  const user = await createTestUser()
  const credits = await createTestCredits(user.id, { balance: 100 })

  // Deduct credits
  await prisma.credits.update({
    where: { id: credits.id },
    data: {
      balance: { decrement: 27 },
      totalSpent: { increment: 27 }
    }
  })

  // Create transaction record
  await prisma.creditTransaction.create({
    data: {
      creditsId: credits.id,
      amount: -27,
      realCost: 0.24,
      type: 'IMAGE',
      provider: 'gemini-3-pro'
    }
  })

  // Verify
  const updated = await prisma.credits.findUnique({ where: { id: credits.id } })
  expect(updated?.balance).toBe(73)
})
```

## Test Cleanup

Tests automatically clean up after each test via `src/test/setup.ts`:

```typescript
afterEach(async () => {
  await prisma.creditTransaction.deleteMany({})
  await prisma.credits.deleteMany({})
  // ... other models
  await prisma.user.deleteMany({})
})
```

## Mocking External Services

External services are mocked in `setup.ts`:

```typescript
// S3 uploads always succeed with mock URL
vi.mock('@/lib/services/s3-upload', () => ({
  uploadToS3: vi.fn().mockResolvedValue('https://mock-s3-url.com/file.png')
}))

// Email sending is mocked
vi.mock('@/lib/services/email', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(true)
}))
```

## Debugging Tests

```bash
# Run single test with verbose output
npm run test -- --reporter=verbose src/path/to/test.ts

# Run with console output visible
npm run test -- --reporter=verbose --no-file-parallelism

# Debug a specific test
npm run test -- --grep "test name here"
```

## Common Patterns

### Testing State Transitions

```typescript
it('follows regeneration state flow', async () => {
  const { users, project, scenes } = await createFullTestEnvironment()

  // Create pending request
  let request = await createRegenerationRequest(project.id, users.collaborator.id, {
    targetType: 'image',
    targetId: scenes[0].id
  })
  expect(request.status).toBe('pending')

  // Approve
  request = await prisma.regenerationRequest.update({
    where: { id: request.id },
    data: { status: 'approved', reviewedBy: users.admin.id }
  })
  expect(request.status).toBe('approved')

  // ... continue state transitions
})
```

### Testing Concurrent Operations

```typescript
it('handles concurrent credit deductions', async () => {
  const user = await createTestUser()
  const credits = await createTestCredits(user.id, { balance: 100 })

  // Parallel deductions
  await Promise.all([
    prisma.credits.update({
      where: { id: credits.id },
      data: { balance: { decrement: 10 } }
    }),
    prisma.credits.update({
      where: { id: credits.id },
      data: { balance: { decrement: 10 } }
    })
  ])

  const final = await prisma.credits.findUnique({ where: { id: credits.id } })
  expect(final?.balance).toBe(80)
})
```

## Coverage Goals

| Area | Target |
|------|--------|
| Credits Service | 95% |
| Permissions | 95% |
| API Routes | 85% |
| Collaboration Flows | 90% |
| Overall | 85% |

## Adding Tests for New Features

1. Create test file in appropriate `__tests__/` directory
2. Import factories from `@/test/factories`
3. Use `createFullTestEnvironment()` for complex scenarios
4. Test happy path first, then edge cases
5. Test error conditions (insufficient credits, no permission, etc.)
6. Run `npm run test:coverage` to check coverage

## Troubleshooting

### "Connection refused" errors
- Check if test database URL is correct in `vitest.config.mts`

### Tests hanging
- Ensure `afterEach` cleanup is running
- Check for unclosed database connections

### Schema mismatch errors
- Run `npx prisma db push` against test database
- Check field names match schema exactly

### Tests passing locally but failing in CI
- Ensure test database is accessible from CI
- Check environment variables are set

## Security Attack Testing (Phase 13)

The security attack tests in `src/app/api/__tests__/security-attacks.test.ts` simulate real-world attack scenarios to verify application defenses.

### Test Categories (55 tests total)

#### 1. Rate Limiting & DDoS Prevention (8 tests)
```typescript
// Tests verify rate limits work correctly
it('should block rapid-fire requests', async () => {
  // Simulate 100 requests in 1 second
  const requests = Array(100).fill(null).map(() =>
    fetch('/api/image/generate', { method: 'POST' })
  );
  const responses = await Promise.all(requests);

  // Should see 429 Too Many Requests
  const blocked = responses.filter(r => r.status === 429);
  expect(blocked.length).toBeGreaterThan(80);
});
```

#### 2. Authentication Attacks (8 tests)
- Invalid/expired JWT tokens
- Session hijacking attempts
- Brute force login prevention
- Session fixation detection
- Credential stuffing patterns

#### 3. Authorization Bypass (8 tests)
- IDOR (Insecure Direct Object Reference)
- Privilege escalation attempts
- Role manipulation
- Project access boundary violations

#### 4. Input Validation & Injection (8 tests)
- SQL injection attempts
- XSS payload detection
- Command injection
- Path traversal attacks
- NoSQL injection patterns

#### 5. File Upload Security (8 tests)
- MIME type validation
- Magic byte verification
- File size limits
- Malicious filename detection
- Path traversal in filenames

#### 6. Session Security (5 tests)
- Cookie security flags
- Session timeout behavior
- Concurrent session limits
- Session invalidation on logout

#### 7. API Abuse Prevention (5 tests)
- Mass data extraction attempts
- Automated scraping detection
- Resource exhaustion prevention

#### 8. Data Exposure Prevention (5 tests)
- PII leakage in responses
- Error message information disclosure
- Debug data exposure

### Running Security Tests

```bash
# Run all security tests
npm run test src/app/api/__tests__/security-attacks.test.ts

# Run specific category
npm run test -- --grep "Rate Limiting"
npm run test -- --grep "SQL Injection"
npm run test -- --grep "Authorization Bypass"

# Verbose output with details
npm run test -- --reporter=verbose src/app/api/__tests__/security-attacks.test.ts
```

### Writing Security Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createTestUser, createTestProject } from '@/test/factories';

describe('IDOR Prevention', () => {
  it('user cannot access other user projects via ID manipulation', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const project = await createTestProject(user1.id, { visibility: 'private' });

    // Simulate user2 trying to access user1's project
    const canAccess = await checkProjectAccess(user2.id, project.id);
    expect(canAccess).toBe(false);
  });
});
```

## Database & S3 Load Monitoring (Phase 14)

The load monitoring tests in `src/app/api/__tests__/load-monitoring.test.ts` measure performance and detect inefficient patterns.

### Test Categories (40 tests total)

#### 1. Database Query Performance (10 tests)
```typescript
// Measures query execution time
it('project list query completes within threshold', async () => {
  const start = performance.now();
  await prisma.project.findMany({
    where: { userId: user.id },
    include: { scenes: true, characters: true }
  });
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(100); // 100ms threshold
});
```

#### 2. Connection Pool Monitoring (5 tests)
- Pool exhaustion detection
- Connection timeout handling
- Concurrent connection limits

#### 3. N+1 Query Detection (10 tests)
```typescript
// Detects inefficient query patterns
it('fetches projects without N+1 queries', async () => {
  const queryLog: string[] = [];
  prisma.$on('query', (e) => queryLog.push(e.query));

  await getUserAccessibleProjects(user.id);

  // Should be 2-3 queries, not 1 + N
  expect(queryLog.length).toBeLessThan(5);
});
```

#### 4. S3 Upload Performance (5 tests)
- Upload throughput measurement
- Concurrent upload handling
- Large file upload behavior
- Timeout handling

#### 5. S3 Caching Verification (5 tests)
```typescript
// Verifies S3 caching headers
it('S3 objects have correct cache headers', async () => {
  const response = await fetch(imageUrl);
  const cacheControl = response.headers.get('Cache-Control');

  expect(cacheControl).toContain('max-age=86400'); // 1 day cache
});
```

#### 6. Concurrent Load Testing (5 tests)
- Throughput measurement under load
- Response time distribution
- Error rate under stress

### Running Load Tests

```bash
# Run all load monitoring tests
npm run test src/app/api/__tests__/load-monitoring.test.ts

# Run database performance tests
npm run test -- --grep "Database Query Performance"

# Run S3 tests
npm run test -- --grep "S3"

# Run with timing details
npm run test -- --reporter=verbose src/app/api/__tests__/load-monitoring.test.ts
```

### Performance Thresholds

| Operation | Threshold | Notes |
|-----------|-----------|-------|
| Project list query | < 100ms | With scenes/characters |
| Single project fetch | < 50ms | With full includes |
| Scene batch update | < 200ms | For 12 scenes |
| S3 image upload | < 5s | Standard resolution |
| Notification poll | < 30ms | Every 60 seconds |

### Caching Architecture

The application uses multiple caching layers:

```
┌─────────────────────────────────────────────────────────┐
│                    Request Flow                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Browser ──► CDN ──► Next.js ──► Memory Cache ──► DB    │
│                         │              │                 │
│                         │              └──► S3 (images)  │
│                         │                                │
│                         └──► Rate Limiter (in-memory)    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Cache TTLs:**
- `VERY_SHORT`: 30 seconds (real-time data)
- `SHORT`: 5 minutes (user data)
- `MEDIUM`: 30 minutes (project lists)
- `LONG`: 2 hours (static content)
- `VERY_LONG`: 6 hours (reference data)
- **S3 Images**: 1 day (Cache-Control: max-age=86400)

**Cache Invalidation:**
- Project updates invalidate `userProjects` cache
- Image regeneration creates new UUID (bypasses cache)
- Manual refresh buttons in UI components (SceneCard, VideoCard, CharacterCard)

### Writing Load Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Throughput Testing', () => {
  it('handles concurrent requests efficiently', async () => {
    const concurrency = 50;
    const requests = Array(concurrency).fill(null).map(() =>
      measureRequest(() => fetch('/api/projects'))
    );

    const results = await Promise.all(requests);
    const avgResponseTime = results.reduce((a, b) => a + b, 0) / concurrency;
    const successRate = results.filter(r => r.success).length / concurrency;

    expect(avgResponseTime).toBeLessThan(200);
    expect(successRate).toBeGreaterThan(0.95);
  });
});
```

## Test File Locations Summary

| Test Category | File Location | Tests |
|--------------|---------------|-------|
| Credits Service | `src/lib/services/__tests__/credits.test.ts` | 68 |
| Permissions | `src/lib/__tests__/permissions.test.ts` | 45 |
| Real Costs | `src/lib/services/__tests__/real-costs.test.ts` | 22 |
| Role-Based Access | `src/app/api/__tests__/role-based-access.test.ts` | 83 |
| Collaboration | `src/app/api/__tests__/collaboration-workflow.test.ts` | 70 |
| Generation | `src/app/api/__tests__/generation-flows.test.ts` | 67 |
| Statistics | `src/app/api/__tests__/statistics.test.ts` | 45 |
| Security Core | `src/app/api/__tests__/security.test.ts` | 74 |
| Deletion Requests | `src/app/api/__tests__/deletion-requests.test.ts` | 51 |
| Security Attacks | `src/app/api/__tests__/security-attacks.test.ts` | 55 |
| Load Monitoring | `src/app/api/__tests__/load-monitoring.test.ts` | 40 |
| **Total** | | **685** |
