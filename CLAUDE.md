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

# Run E2E tests with Playwright
npx playwright install    # First time setup
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui     # Run with UI mode
```

### Build & Deployment
```bash
npm run build      # Build for production (runs prisma generate first)
npm run start      # Start production server
npm run lint       # Run ESLint
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

The codebase has comprehensive test coverage:

- **Unit tests** - Provider configuration, credit calculations, real costs
- **API tests** - Role-based access, security, concurrency handling
- **E2E tests** - User workflows with Playwright

Tests are organized by phases for targeted testing of specific functionality.

### Important Patterns

1. **Confirmation Dialogs** - Show provider, model, and cost before any generation
2. **Auto-save Settings** - Changes save automatically after 500ms
3. **Bidirectional Sync** - Settings page and modal stay in sync via events
4. **Batch Processing** - Large operations split into smaller batches
5. **Progress Tracking** - Real-time updates for long-running operations
6. **Error Recovery** - Jobs can resume from last successful checkpoint

### Environment Configuration

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Authentication secret
- `INNGEST_EVENT_KEY` - For Inngest client
- `INNGEST_SIGNING_KEY` - For webhook verification

Optional provider defaults can be set for each AI service type.