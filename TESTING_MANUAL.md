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
