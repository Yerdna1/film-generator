# Film Generator - Project Memory

## Important: Using Claude CLI for LLM Calls (FREE with subscription)

When `llmProvider` is set to `claude-sdk`, the app uses the **Claude CLI** with `--print` mode instead of the Anthropic API. This uses the user's **OAuth subscription** (Claude Pro/Max), NOT API credits!

### Critical: OAuth vs API Key Authentication

The Claude CLI can authenticate via:
1. **OAuth session** (FREE with Claude Pro/Max subscription)
2. **ANTHROPIC_API_KEY** (billed to API credits)

**IMPORTANT:** If `ANTHROPIC_API_KEY` is present in the environment, the CLI will use it instead of OAuth. To force OAuth authentication, you MUST remove the ANTHROPIC_API_KEY from the environment passed to the CLI.

### How it works:

```typescript
import { spawnSync } from 'child_process';

// Full path to claude CLI (nvm installation)
const claudePath = '/Users/andrejpt/.nvm/versions/node/v22.21.1/bin/claude';

// CRITICAL: Remove ANTHROPIC_API_KEY to force OAuth authentication
const cleanEnv = { ...process.env };
delete cleanEnv.ANTHROPIC_API_KEY;

const result = spawnSync(claudePath, ['-p', '--output-format', 'text'], {
  input: fullPrompt,
  encoding: 'utf-8',
  maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large responses
  timeout: 300000, // 5 minute timeout
  env: {
    ...cleanEnv,
    PATH: process.env.PATH + ':/Users/andrejpt/.nvm/versions/node/v22.21.1/bin',
    HOME: '/Users/andrejpt',
    USER: 'andrejpt',
  },
  cwd: '/Volumes/DATA/Python/film-generator',
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`Claude CLI failed: ${result.stderr}`);
}

const response = result.stdout;
```

### Key points:
- `claude -p` = print mode (non-interactive, outputs to stdout)
- `--output-format text` = plain text output (no JSON wrapper)
- Input is passed via `input` option to spawnSync (stdin)
- **Must remove ANTHROPIC_API_KEY from env to use OAuth subscription**
- Uses spawnSync for synchronous execution with better error handling

### Why spawnSync instead of execSync:
- Better error handling (separate stdout, stderr, exit code)
- Handles large outputs without shell escaping issues
- Can pass input via stdin cleanly
- Provides signal information for debugging

### Provider settings in DB (ApiKeys table):
- `llmProvider: 'claude-sdk'` = Use Claude CLI (free with subscription)
- `llmProvider: 'openrouter'` = Use OpenRouter API (paid)
- `llmProvider: 'modal'` = Use Modal LLM endpoint (self-hosted)

## Project Architecture

### Inngest Background Jobs
- Scene generation: `src/lib/inngest/functions/generate-scenes.ts`
- Image generation: `src/lib/inngest/functions/generate-images.ts`
- Inngest dev server: `npx inngest-cli@latest dev` (port 8288)

### Scene Generation Batching
- 30 scenes per batch to avoid LLM token limits
- For 360 scenes = 12 batches
- Progress tracked in `SceneGenerationJob` table

### Image Generation
- 5 images in parallel for Modal providers
- Uses Modal endpoints for image generation (Qwen)
- Uploads to S3 after generation

### Database
- Neon PostgreSQL (connection string in .env.local)
- Prisma ORM
- Key tables: Project, Scene, Character, ApiKeys, Credits

## Modal Endpoints
- Image: `https://andrej-galad--film-generator-image-qwenimagegenerator-api.modal.run`
- Image Edit: `https://andrej-galad--film-generator-image-edit-qwenimageeditgen-94d79a.modal.run`
- TTS: `https://andrej-galad--chatterbox-tts-generator.modal.run`
- Video: `https://andrej-galad--hallo3-portrait-avatar.modal.run`
- Music: `https://andrej-galad--music-generator.modal.run`
