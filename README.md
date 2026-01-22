# Film Generator

AI-powered film creation studio that generates complete short films from text prompts. Create characters, scenes, images, videos, and voiceovers - all powered by AI.

![Dashboard](docs/screenshots/dashboard.png)

## Features

- **Story Generation** - Generate complete film stories with AI (Claude, OpenRouter)
- **Character Creation** - Create and customize characters with AI-generated images
- **Scene Management** - Up to 360 scenes per project with automatic prompt generation
- **Image Generation** - Generate scene images (Gemini, Modal/Qwen)
- **Video Generation** - Convert images to videos (Kie.ai, Modal/Hallo3)
- **Voiceover** - Text-to-speech for character dialogue (Gemini TTS, ElevenLabs, Modal)
- **Music** - Background music generation (Suno/PiAPI, Modal)
- **Team Collaboration** - Invite collaborators with approval workflows
- **Multi-language** - English and Slovak UI support

## Screenshots

### Character Editor
Create and manage film characters with AI-generated portraits and master prompts for consistent appearance.

![Characters](docs/screenshots/characters.png)

### Scene Image Editor
Generate and manage scene images with batch processing, quality selection, and regeneration options.

![Scene Editor](docs/screenshots/scene-editor.png)

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Zustand
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: Neon PostgreSQL
- **Auth**: NextAuth v5
- **Background Jobs**: Inngest
- **Payments**: Polar.sh
- **AI Providers**: Modal (self-hosted), OpenRouter, Gemini, ElevenLabs

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database (Neon recommended)
- API keys for AI providers (see Settings page)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/film-generator.git
cd film-generator

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database URL and secrets

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Running Background Jobs

Scene and image generation use Inngest for background processing:

```bash
npx inngest-cli@latest dev
```

Open http://localhost:8288 to view the Inngest dashboard.

## Configuration

### AI Providers

Configure AI providers in the Settings page or via the unified provider modal:

| Feature | Providers |
|---------|-----------|
| LLM (Story) | OpenRouter, Claude SDK/CLI, Gemini, Modal, KIE |
| Images | Gemini, Nano Banana, KIE.ai, Modal, Modal Edit |
| Videos | KIE.ai, Modal (Hallo3) |
| TTS | Gemini TTS, ElevenLabs, OpenAI TTS, KIE, Modal |
| Music | PiAPI, Suno, KIE, Modal |

#### Provider Configuration System

The application uses a unified provider configuration system with:

- **Auto-save**: Changes are automatically saved after 500ms
- **Bidirectional sync**: Settings page ↔ Configuration modal
- **Per-project config**: Each project can use different providers
- **Priority resolution**: Project > Org > User > Environment defaults
- **Confirmation dialogs**: See provider, model, and cost before generation

For detailed provider configuration documentation, see [docs/provider-configuration.md](docs/provider-configuration.md).

### Modal Endpoints (Self-hosted)

Deploy your own AI endpoints on Modal.com:

```bash
modal deploy modal/image_edit_generator.py
modal deploy modal/image_generator.py
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API endpoints
│   ├── project/[id]/      # Project editor
│   └── settings/          # User settings
├── components/
│   ├── workflow/          # Step-by-step workflow components
│   └── collaboration/     # Team collaboration features
├── lib/
│   ├── inngest/           # Background job definitions
│   ├── providers/         # AI provider abstraction layer
│   ├── services/          # Business logic
│   └── stores/            # Zustand state management
├── tests/
│   └── e2e/               # End-to-end tests with Playwright
└── types/                 # TypeScript definitions

modal/                     # Python Modal endpoints
prisma/schema.prisma       # Database schema
```

## Testing

### Unit Tests

Run unit tests for provider configuration and business logic:

```bash
# Run all unit tests
npm test

# Run with coverage
npm test:coverage

# Run in watch mode
npm test:watch
```

### Component Tests

Test React components with Vitest and React Testing Library:

```bash
# Run component tests
npm run test:components
```

### E2E Tests

Test full user flows with Playwright:

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/confirmation-dialogs.spec.ts
```

### Test Coverage

The project maintains >90% code coverage on core provider configuration logic.

## Architecture

### Provider Resolution System

The application uses a priority-based provider resolution system:

```
1. Request-specific provider override (explicit in API call)
2. Project model configuration (per-project settings)
3. Organization API keys (for premium/admin users)
4. User settings from database (personal API keys)
5. Owner settings (for collaborators)
6. Environment defaults (fallback)
```

### Key Components

- **`src/lib/providers/provider-config.ts`** - Provider resolution logic
- **`src/contexts/ApiKeysContext.tsx`** - API key state management
- **`src/components/workflow/api-key-modal/`** - Unified configuration modal
- **`src/components/workflow/shared/UnifiedGenerateConfirmationDialog.tsx`** - Confirmation dialogs
- **`src/components/ui/SaveStatus.tsx`** - Auto-save status indicator

## License

MIT
