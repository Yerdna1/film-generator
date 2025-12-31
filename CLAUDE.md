# Film Generator - Project Memory

## Important: Using Claude CLI for LLM Calls (FREE with subscription)

When `llmProvider` is set to `claude-sdk`, the app uses the **Claude CLI** with `--print` mode instead of the Anthropic API. This uses the user's **OAuth subscription** (Claude Pro/Max), NOT API credits!

### How it works:
```typescript
const { execSync } = await import('child_process');

const result = execSync(
  `claude -p --output-format text --dangerously-skip-permissions`,
  {
    input: fullPrompt,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    timeout: 300000, // 5 minute timeout
  }
);
```

### Key points:
- `claude -p` = print mode (non-interactive)
- `--output-format text` = plain text output
- `--dangerously-skip-permissions` = skip permission dialogs for automation
- Input is passed via stdin
- Uses OAuth subscription, NOT ANTHROPIC_API_KEY credits

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
- Image Edit: `https://andrej-galad--film-generator-image-edit-qwenimageeditor-api.modal.run`
- TTS: `https://andrej-galad--chatterbox-tts-generator.modal.run`
- Video: `https://andrej-galad--hallo3-portrait-avatar.modal.run`
- Music: `https://andrej-galad--music-generator.modal.run`
