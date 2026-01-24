# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
npm run dev                 # Start development server (Next.js on port 3000)
npx inngest-cli@latest dev  # Start Inngest dashboard (port 8288) for background jobs
```

### Database
```bash
npm run db:push      # Push schema changes to database (development)
npm run db:migrate   # Create and apply migrations (production)
npm run db:studio    # Open Prisma Studio GUI for database inspection
npm run db:generate  # Generate Prisma client after schema changes
npm run db:seed      # Seed database with initial data
npm run db:reset     # Reset database (CAUTION: drops all data)
```

### Testing
```bash
npm test                    # Run all unit tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:ui           # Open Vitest UI

# Run specific test phases (organized by functionality)
npm run test:phase1       # Credits, Permissions, Real Costs
npm run test:phase2       # Roles, Authentication, Access Control
npm run test:phase3       # Invitations, Deletions, Regenerations
npm run test:phase4       # Generation (Image, Video, TTS, Music, Scene)
npm run test:phase5       # Statistics
npm run test:phase6       # Concurrency, Security, Errors

# Run specific test files
npm run test src/path/to/test.ts

# Run E2E tests with Playwright
npx playwright install    # First time setup
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui     # Run with UI mode

# Performance testing
npm run perf:test         # Run performance tests
npm run perf:browser      # Run browser performance tests
```

### Build & Deployment
```bash
npm run build      # Build for production (runs prisma generate first)
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Utility Scripts
```bash
npx tsx scripts/generate-preset-images.ts   # Generate preset images for story templates
npx tsx scripts/fix-project-model-config.ts # Fix project model configurations
npx tsx scripts/test-kie-models.ts          # Test KIE API models
```

### Self-Hosted AI Providers (Modal)
```bash
modal deploy modal/image_generator.py        # Deploy Qwen-Image generation endpoint
modal deploy modal/image_edit_generator.py   # Deploy image editing endpoint
modal deploy modal/image_editor.py           # Deploy image editor endpoint
modal deploy modal/vectcut_processor.py      # Deploy VectCut processor
```

## High-Level Architecture

### Provider Resolution System

The application uses a sophisticated provider resolution hierarchy for AI services. When any AI generation occurs, the system determines which provider and API key to use based on this priority chain:

1. **Request-specific override** - Explicit provider in the API call
2. **Project model configuration** - Per-project settings in `Project.modelConfig`
3. **Organization API keys** - Shared credentials for premium/admin users
4. **User settings** - Personal API keys from `ApiKeys` table
5. **Owner settings** - For collaborators on shared projects
6. **Environment defaults** - Fallback values from env vars

**Key file:** `src/lib/providers/provider-config.ts` - This is the single source of truth for provider selection logic.

### API Wrapper Pattern

All external AI API calls go through a centralized wrapper (`src/lib/providers/api-wrapper.ts`). This ensures:
- Provider configuration is resolved exactly once per call
- Consistent error handling across all providers
- Loading states are managed uniformly
- Easy to add logging, retry logic, or caching

Example flow:
```
User Action → API Route → getProviderConfig() → callExternalApi() → Provider Instance → External Service
```

### Background Job Architecture (Inngest)

Long-running operations use Inngest for reliable background processing:

- **Scene Generation** - Batches of 10 scenes per LLM call to avoid token limits
- **Image Generation** - Parallel processing with progress tracking
- **Video Generation** - Async video creation with polling for completion
- **Voiceover Generation** - Batch TTS processing for dialogue lines

Jobs are resumable - if a batch fails, the system can retry without regenerating previous successful batches. Progress is checkpointed to the database after each batch.

**Key directory:** `src/lib/inngest/functions/` - Contains all background job definitions

### State Management

The application uses two layers of state management:

1. **Global Context** (`src/contexts/ApiKeysContext.tsx`)
   - Manages user's API keys and provider preferences
   - Auto-saves changes with debounce
   - Shows modal when API keys are missing

2. **Project Store** (`src/lib/stores/project-store/`)
   - Zustand store with modular slices
   - Manages in-memory project state
   - Syncs with database on changes

### Credit System

The app uses a dual credit/cost system:

- **Credits** - Virtual currency users purchase (stored in `Credits.balance`)
- **Real Costs** - Actual USD costs from `ActionCost` table
- **Cost Multiplier** - User's multiplier (default 1.5) determines margin

Credits are only consumed when users don't provide their own API keys. The system tracks both credit transactions and real cost calculations separately.

**Key files:**
- `src/lib/services/credits.ts` - Credit balance and spending
- `src/lib/services/real-costs.ts` - Dynamic cost lookup

### Project Workflow

The application guides users through a 6-step film creation process:

1. **Story & Settings** - Define project parameters and story elements
2. **Character Generation** - Create characters with AI-generated portraits
3. **Scene Generation** - Generate scene descriptions via LLM
4. **Image Generation** - Create scene images from descriptions
5. **Video Generation** - Convert images to videos
6. **Voiceover & Music** - Add dialogue and background music

Each step has dedicated components in `src/components/workflow/`.

### Provider Factory System

Providers are registered in a central registry and instantiated dynamically:

```typescript
// Registration happens at startup
providerRegistry.register('image', 'gemini', GeminiImageProvider, metadata);

// Usage
const provider = createProvider(type, config);
```

This allows adding new providers without modifying core logic. Each provider implements a common interface with support for both sync and async operations.

**Key file:** `src/lib/providers/provider-factory.ts`

### Database Schema

The application uses Prisma ORM with PostgreSQL. Key models:

- **User/Account/Session** - NextAuth authentication
- **ApiKeys** - User's provider credentials (22 fields for different providers)
- **OrganizationApiKeys** - Shared organization credentials
- **Project** - Film projects with JSON fields for settings and story
- **Character** - Characters with generated images and voice settings
- **Scene** - Scenes with dialogue stored as JSON array
- **Credits/CreditTransaction** - Virtual currency system
- **SceneGenerationJob/ImageGenerationJob/VideoGenerationJob** - Background job tracking

**Schema file:** `prisma/schema.prisma`

### Testing Strategy

The codebase has comprehensive test coverage (685+ tests):

- **Unit tests** - Provider configuration, credit calculations, real costs
- **API tests** - Role-based access, security, concurrency handling
- **Security tests** - Attack simulation, authorization bypass, injection prevention
- **Load monitoring tests** - Database query performance, N+1 detection, S3 upload performance
- **E2E tests** - User workflows with Playwright

Tests are organized by phases for targeted testing of specific functionality.

**Test Factories** (`src/test/factories/`):
The test suite uses factory functions for creating test data:
- `createTestUser()` - Create a user with optional attributes
- `createTestProject()` - Create a project linked to a user
- `createTestCredits()` - Create credits with a balance
- `createTestScene()` / `createTestScenes()` - Create single or multiple scenes
- `createFullTestEnvironment()` - Create a complete environment with admin, collaborator, reader, project, scenes, and credits

**Test Database:**
Tests use a separate Neon database (`film-generator-test`) to avoid affecting production data. The database is automatically cleaned after each test via `src/test/setup.ts`.

### Important Patterns

1. **Confirmation Dialogs** - Show provider, model, and cost before any generation
2. **Auto-save Settings** - Changes save automatically after 500ms
3. **Bidirectional Sync** - Settings page and modal stay in sync via events
4. **Batch Processing** - Large operations split into smaller batches
5. **Progress Tracking** - Real-time updates for long-running operations
6. **Error Recovery** - Jobs can resume from last successful checkpoint

### Environment Configuration

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (Neon recommended)
- `DIRECT_URL` - Direct PostgreSQL connection for Prisma Client
- `AUTH_SECRET` - NextAuth authentication secret (generate with `openssl rand -base64 32`)
- `INNGEST_EVENT_KEY` - For Inngest client
- `INNGEST_SIGNING_KEY` - For webhook verification

Optional configuration:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth authentication
- `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` - S3 media storage
- `NEXT_PUBLIC_DEFAULT_LOCALE` - Default locale (default: `sk`)
- `NEXT_PUBLIC_ENABLE_TTS` - Enable text-to-speech (default: `true`)
- `NEXT_PUBLIC_ENABLE_VIDEO_GENERATION` - Enable video generation (default: `true`)
- `ADMIN_EMAILS` - Comma-separated admin emails for elevated access
- Provider-specific keys (GEMINI_API_KEY, KIE_API_KEY, etc.) - Can be set at app level

### Caching Architecture

The application uses a multi-layer in-memory caching system (`src/lib/cache.ts`):

**Cache TTL Presets:**
- `SHORT`: 5 minutes - User data, frequently changing content
- `MEDIUM`: 30 minutes - Project lists, statistics
- `LONG`: 2 hours - Static content, user projects
- `VERY_LONG`: 6 hours - Reference data

**Cache Key Patterns:**
- `user:{userId}:projects` - User's project list
- `user:{userId}:credits` - User's credit balance
- `user:{userId}:statistics` - User statistics
- `project:{projectId}` - Single project data
- `project:{projectId}:scenes` - Project scenes

**Cache Invalidation:**
- Automatic invalidation on project updates
- Manual invalidation via `cache.invalidate()`, `cache.invalidateUser()`, `cache.invalidatePattern()`
- Image regeneration creates new UUIDs (bypasses cache automatically)

### TypeScript Path Aliases

The project uses path aliases configured in `tsconfig.json`:
- `@/*` maps to `./src/*`

Import example: `import { foo } from '@/lib/bar'` instead of `'../../lib/bar'`

### Multi-Tenant Customer Configuration

Enterprise deployments use customer-specific configuration in `customers/{customer-name}/config/.env`:
- License key system for feature access
- Admin email configuration
- Database and storage options (external vs local)
- Pre-configured authentication secrets

### Internationalization (i18n)

The application uses `next-intl` for multi-language support:

**Configuration:**
- `NEXT_PUBLIC_DEFAULT_LOCALE` - Default locale (default: `sk` for Slovak)
- Locale files in `src/messages/` directory
- Server components use `import { getTranslations } from 'next-intl/server'`
- Client components use `import { useTranslations } from 'next-intl'`

**Adding Translations:**
1. Add keys to locale files in `src/messages/{locale}.json`
2. Use `t('key.path')` in components
3. For dynamic content, pass parameters: `t('key.path', { param: value })`