# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm run dev                    # Start Next.js dev server (port 3000)
npx inngest-cli@latest dev     # Start Inngest background job server (port 8288) - required for scene/image generation

# Database
npm run db:push                # Push schema changes to Neon PostgreSQL
npm run db:generate            # Regenerate Prisma client
npm run db:studio              # Open Prisma Studio

# Modal Endpoints (Python)
modal deploy modal/image_edit_generator.py    # Deploy image edit endpoint
modal app logs <app-name>                     # View Modal app logs

# Build & Lint
npm run build                  # Build for production (includes prisma generate)
npm run lint                   # Run ESLint
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand (state)
- **Backend**: Next.js API routes, Prisma ORM, Neon PostgreSQL
- **Auth**: NextAuth v5 (credentials + OAuth)
- **Background Jobs**: Inngest (scene generation, image generation batching)
- **Payments**: Polar.sh (subscriptions, credits)
- **AI Providers**: Modal (self-hosted), OpenRouter, Gemini, ElevenLabs

### Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # REST API endpoints
│   │   ├── image/         # Image generation (Gemini, Modal, Modal-Edit)
│   │   ├── video/         # Video generation (Kie, Modal)
│   │   ├── tts/           # Text-to-speech (Gemini TTS, ElevenLabs, Modal)
│   │   ├── music/         # Music generation (PiAPI/Suno, Modal)
│   │   └── projects/[id]/ # Project CRUD, scenes, members, regeneration
│   ├── project/[id]/      # Main project editor page
│   └── settings/          # User settings (API keys, providers)
├── components/
│   ├── workflow/          # Main workflow steps (scene generator, video generator, export)
│   └── collaboration/     # Team features (regeneration modals, deletion requests)
├── lib/
│   ├── inngest/           # Background job definitions
│   │   └── functions/     # generate-scenes.ts, generate-images.ts
│   ├── services/          # Business logic (credits.ts, real-costs.ts, s3-upload.ts)
│   └── stores/            # Zustand stores (project-store with slices)
└── types/                 # TypeScript definitions (project.ts, collaboration.ts)

modal/                     # Python Modal endpoints for self-hosted AI
prisma/schema.prisma       # Database schema
```

### Key Concepts

**Multi-Provider Architecture**: Each AI capability (LLM, Image, Video, TTS, Music) supports multiple providers configured per-user in the `ApiKeys` table.

**Credits System**: Users have credits that are spent on AI operations. Real costs (USD) are tracked separately from credit costs. See `src/lib/services/credits.ts` for cost constants and `real-costs.ts` for provider-specific pricing.

**Collaboration Flow**: Projects can have collaborators who can request regenerations. Requests go through approval workflow (request → admin approval → collaborator generates → final selection → admin final approval).

**Background Jobs with Inngest**: Scene and image generation use Inngest for reliable background processing with retries. Jobs are batched (30 scenes per batch, 5 images in parallel).

### Claude CLI Integration (Free LLM Calls)

When `llmProvider: 'claude-sdk'`, the app uses Claude CLI with OAuth (free with Claude Pro/Max subscription) instead of API credits:

```typescript
// CRITICAL: Remove ANTHROPIC_API_KEY to force OAuth authentication
const cleanEnv = { ...process.env };
delete cleanEnv.ANTHROPIC_API_KEY;

const result = spawnSync('/Users/andrejpt/.nvm/versions/node/v22.21.1/bin/claude',
  ['-p', '--output-format', 'text'], {
    input: prompt,
    encoding: 'utf-8',
    env: cleanEnv,
  });
```

### Modal Endpoints

Self-hosted AI on Modal.com (GPU serverless):
- **Image Edit**: `https://andrej-galad--film-generator-image-edit-qwenimageeditgen-94d79a.modal.run`
- **Image**: `https://andrej-galad--film-generator-image-qwenimagegenerator-api.modal.run`
- **TTS**: `https://andrej-galad--chatterbox-tts-generator.modal.run`
- **Video**: `https://andrej-galad--hallo3-portrait-avatar.modal.run`
- **Music**: `https://andrej-galad--music-generator.modal.run`

### Database Connection

Uses Neon PostgreSQL. Connection string in `.env.local`. For direct queries:
```bash
DATABASE_URL="postgresql://..." npx prisma db push
```
