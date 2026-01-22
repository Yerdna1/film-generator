# Contributing to Film Generator

Thank you for your interest in contributing to Film Generator! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Provider System](#provider-system)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database (Neon recommended for development)
- Git

### Initial Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/film-generator.git
cd film-generator

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Set up the database
npm run db:push

# 5. Run database migrations (if any)
npm run db:migrate

# 6. Start development servers
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Inngest (background jobs)
npx inngest-cli@latest dev
```

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
- Vitest
- Playwright

## Development Workflow

### Branching Strategy

- `main` - Production branch
- `develop` - Development branch (if applicable)
- `feature/xxx` - Feature branches
- `fix/xxx` - Bug fix branches
- `docs/xxx` - Documentation updates

### Creating a Feature Branch

```bash
# Update main branch first
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-new-feature
```

### Making Changes

1. **Write code** following the project's coding standards
2. **Test your changes** (see Testing Guidelines)
3. **Update documentation** if needed
4. **Commit** with clear messages (see Commit Conventions)
5. **Push** to your fork
6. **Create Pull Request**

## Testing Guidelines

### Unit Tests

We use Vitest for unit testing. All new business logic should have unit tests.

```bash
# Run unit tests
npm test

# Run with coverage
npm test:coverage

# Watch mode
npm test:watch
```

#### Writing Unit Tests

- Place tests alongside the file being tested: `src/lib/__tests__/provider-config.test.ts`
- Test file name should match: `filename.test.ts`
- Aim for >90% code coverage on new code

```typescript
import { describe, it, expect } from 'vitest';
import { getProviderConfig } from '../provider-config';

describe('Provider Configuration', () => {
  it('should resolve provider correctly', async () => {
    const config = await getProviderConfig({
      userId: 'test-user',
      type: 'image',
      requestProvider: 'gemini',
    });
    expect(config.provider).toBe('gemini');
  });
});
```

### Component Tests

We use React Testing Library for component testing.

```bash
# Run component tests
npm run test:components
```

### E2E Tests

We use Playwright for end-to-end testing.

```bash
# Install browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npx playwright test tests/e2e/confirmation-dialogs.spec.ts
```

#### Writing E2E Tests

- Place E2E tests in `tests/e2e/`
- Test critical user flows
- Test across different browsers (Chrome, Firefox, Safari)
- Keep tests independent and isolated

```typescript
import { test, expect } from '@playwright/test';

test('user can create a project', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("New Project")');
  await page.fill('input[name="name"]', 'Test Project');
  await page.click('button:has-text("Create")');
  await expect(page.locator('h1')).toContainText('Test Project');
});
```

### Pre-Commit Checklist

Before committing, ensure:

- [ ] All tests pass locally
- [ ] Code follows ESLint rules: `npm run lint`
- [ ] Code is formatted with Prettier: `npm run format`
- [ ] No console errors or warnings
- [ ] Documentation is updated if needed
- [ ] Tests cover new functionality

## Provider System

### Understanding the Provider Architecture

The Film Generator uses a flexible provider system that allows multiple AI services for each operation type.

#### Key Files

- **`src/lib/providers/provider-config.ts`** - Provider resolution logic with priority ordering
- **`src/lib/providers/api-wrapper.ts`** - Unified API wrapper for all providers
- **`src/lib/providers/types.ts`** - Type definitions for providers
- **`src/contexts/ApiKeysContext.tsx`** - React context for API key management
- **`src/components/workflow/api-key-modal/`** - Unified configuration modal

#### Provider Resolution Priority

1. Request-specific provider override
2. Project model configuration
3. Organization API keys (premium/admin users)
4. User settings from database
5. Owner settings (for collaborators)
6. Environment defaults

#### Adding a New Provider

1. **Add provider type** to `src/types/project.ts`:
```typescript
export type ImageProvider = 'gemini' | 'kie' | 'modal' | 'new-provider';
```

2. **Add provider configuration** to `src/lib/providers/provider-config.ts`:
```typescript
const DB_PROVIDER_MAP = {
  image: {
    providerField: 'imageProvider',
    apiKeyFields: {
      'new-provider': 'newProviderApiKey',
    },
  },
};
```

3. **Create provider implementation** in `src/lib/providers/image/new-provider-provider.ts`:
```typescript
import { BaseImageProvider } from './base-image-provider';

export class NewProviderImageProvider extends BaseImageProvider {
  async generateImage(prompt: string, options: ImageGenerationOptions): Promise<string> {
    // Implementation
  }
}
```

4. **Update provider factory** in `src/lib/providers/provider-factory.ts`:
```typescript
export function createImageProvider(provider: ImageProvider): BaseImageProvider {
  switch (provider) {
    case 'new-provider':
      return new NewProviderImageProvider();
    // ...
  }
}
```

5. **Add tests** for the new provider:
```typescript
// src/lib/providers/__tests__/new-provider.test.ts
describe('New Provider', () => {
  it('should generate images', async () => {
    // Test implementation
  });
});
```

6. **Update documentation**:
   - Add provider to `docs/provider-configuration.md`
   - Update `README.md` provider list
   - Add API key instructions

## Commit Conventions

We follow conventional commits:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `perf` - Performance improvements

### Examples

```bash
feat(provider): add support for new AI provider

Add support for XYZ provider in image generation.
Includes provider implementation, tests, and documentation.

Closes #123
```

```bash
fix(dialog): prevent confirmation dialog from closing on error

The dialog was incorrectly closing when API calls failed.
Now shows error state with retry button.

Fixes #456
```

## Pull Request Process

### Before Submitting

1. **Update documentation** - Ensure docs reflect your changes
2. **Add tests** - All new features must have tests
3. **Run tests locally** - Ensure all tests pass
4. **Update CHANGELOG** - Add entry to changelog (if applicable)

### Submitting a PR

1. Push your branch to your fork
2. Create a Pull Request to `main` branch
3. Fill in the PR template:
   - Description of changes
   - Related issues
   - Testing steps
   - Screenshots (for UI changes)

### PR Review Process

1. Automated checks run (CI/CD)
2. Code review by maintainers
3. Address review feedback
4. Approval required before merge

### After Merge

- Your branch will be deleted after merge
- Update your local `main` branch
- Celebrate! 🎉

## Design Guidelines

### Component Design

- Use existing UI components from `src/components/ui/`
- Follow the established design system
- Ensure responsive design (mobile-first)
- Test accessibility (keyboard navigation, screen readers)

### State Management

- Use Zustand for global state (`src/lib/stores/`)
- Use React Context for feature-specific state
- Keep component state local when possible

### API Integration

- Use the unified `api-wrapper.ts` for API calls
- Handle errors gracefully with user-friendly messages
- Show loading states during API calls
- Use confirmation dialogs before expensive operations

## Performance Guidelines

- Lazy load routes and components
- Optimize images (use WebP, proper sizing)
- Minimize re-renders (use React.memo, useMemo, useCallback)
- Use debouncing for search inputs and auto-save
- Virtualize long lists

## Security Guidelines

- Never commit API keys or secrets
- Validate all user input
- Sanitize data before displaying
- Use parameterized queries (Prisma handles this)
- Implement rate limiting on public APIs

## Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our Discord community (link in README)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
