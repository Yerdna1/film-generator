# Provider Configuration System

## Overview

The Film Generator uses a flexible provider configuration system that allows you to choose between multiple AI service providers for each operation type (LLM, image generation, video generation, TTS, and music generation).

## Supported Providers

### LLM Providers (Scene Generation)
- **OpenRouter** - Multi-provider router with access to Claude, GPT-4, Gemini, and more
- **Claude SDK/CLI** - Use your own Claude SDK or CLI installation
- **Google Gemini** - Direct integration with Gemini API
- **Modal** - Self-hosted LLM on Modal.com
- **KIE.ai** - Alternative AI provider

### Image Providers (Character & Scene Images)
- **Google Gemini** - Gemini 2.0 Flash and Gemini 3 Pro
- **Nano Banana Pro** - Gemini-based image generation
- **KIE.ai** - Seedream and other image models
- **Modal** - Qwen-Image for self-hosted generation
- **Modal Edit** - Qwen-Image-Edit for character consistency

### Video Providers (Scene Videos)
- **KIE.ai** - Primary video generation provider
- **Modal** - Self-hosted video generation

### TTS Providers (Voiceovers)
- **Google Gemini TTS** - Built-in text-to-speech
- **ElevenLabs** - Premium voice generation
- **OpenAI TTS** - GPT-4o-mini-tts
- **KIE.ai** - ElevenLabs-based TTS
- **Modal** - Self-hosted Chatterbox TTS

### Music Providers (Background Music)
- **PiAPI** - Suno API wrapper
- **Suno AI** - Direct Suno integration
- **KIE.ai** - Alternative music generation
- **Modal** - ACE-Step on Modal.com

## Configuration Steps

### 1. Access Provider Settings

There are two ways to configure providers:

#### From Settings Page
1. Click the **Settings** icon in the top navigation
2. Scroll to the **API Keys & Providers** section
3. Configure each operation type's provider and models

#### From Workflow Modal
1. Start any generation step
2. If API keys are missing, the **Configure API Keys & Providers** modal will appear
3. You can also open it manually from the workflow

### 2. Add API Keys

For each provider you want to use:

1. **Select the provider** from the dropdown
2. **Enter your API key** in the field provided
3. **Click Save** (or wait for auto-save)

#### API Key Sources

| Provider | Where to Get API Key |
|----------|---------------------|
| OpenRouter | https://openrouter.ai/keys |
| Google Gemini | https://makersuite.google.com/app/apikey |
| ElevenLabs | https://elevenlabs.io/app/settings/api-keys |
| OpenAI | https://platform.openai.com/api-keys |
| KIE.ai | Contact KIE.ai for access |
| Modal | Deploy your own endpoint |

### 3. Configure Models

For certain providers, you can select specific models:

#### OpenRouter Models
- `anthropic/claude-sonnet-4` - Claude Sonnet 4 (recommended)
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet
- `google/gemini-2.0-flash-exp` - Gemini 2.0 Flash
- And many more available on OpenRouter

#### KIE Models
- **Images**: `seedream/4-5-text-to-image` (recommended)
- **Videos**: `kungfu/african-ring-tailed-mamba-v1`
- **TTS**: `eleven_multilingual_v2`
- **Music**: `suno/bark`

#### Modal Models
- Enter your self-hosted endpoint URL
- Example: `https://your-app--image.modal.run`

## Provider Priority and Resolution

The system uses a priority order when resolving which provider and API key to use:

### Priority Order

1. **Request-specific override** - Explicit provider specified in the API call
2. **Project configuration** - Provider configured for a specific project
3. **Organization keys** - For premium/admin users, shared org API keys
4. **User settings** - Your personal API key configuration
5. **Environment defaults** - Server-side default API keys

### Example Scenario

```
1. User has configured Gemini API key in settings
2. Project is configured to use KIE for images
3. User explicitly requests Gemini for a specific generation
→ Result: Gemini is used (priority 1)
```

## Per-Project Provider Configuration

Each project can have its own provider configuration:

### How to Configure

1. Open a project
2. Click **Settings** in the project sidebar
3. Scroll to **Model Configuration**
4. Select providers for each operation type

### Benefits

- **Different providers for different projects**
- **Project-specific model selections**
- **Cost optimization** (use cheaper providers for test projects)
- **Quality optimization** (use premium providers for final output)

## Auto-Save Behavior

Changes to provider settings are **automatically saved** after 500ms of inactivity:

### What Gets Auto-Saved
- Provider selection changes
- Model selection changes
- API key entries
- Modal endpoint URLs

### Save Status Indicators

| Status | Meaning |
|--------|---------|
| 💾 Saving | Your changes are being saved... |
| ✅ Saved | Changes saved successfully |
| ❌ Save failed | There was an error saving your changes |

## Bidirectional Synchronization

Provider settings are synchronized between:

- **Settings Page** - Long-form configuration interface
- **Configuration Modal** - Quick access during workflow

Changes in either location are immediately reflected in the other.

### Multi-Tab Synchronization

If you have multiple browser tabs open:

1. Make changes in one tab
2. Refresh other tabs to see updates
3. Changes are persisted to the database instantly

## Troubleshooting

### "No API Key Configured" Error

**Problem**: You see an error saying no API key is configured for a provider.

**Solution**:
1. Go to Settings → API Keys & Providers
2. Select the operation type (e.g., "Image Generation")
3. Choose a provider and enter your API key
4. Save and try again

### Wrong Provider Being Used

**Problem**: Generation uses a different provider than expected.

**Solution**:
1. Check if the project has its own provider configuration
2. Check Settings → API Keys & Providers for your default
3. Project configuration overrides personal settings

### API Key Not Saving

**Problem**: Changes to API keys don't persist.

**Solution**:
1. Check your internet connection
2. Make sure you're logged in
3. Look for error messages in the save indicator
4. Try refreshing the page and re-entering the key

### Missing Model Options

**Problem**: Expected models don't appear in the dropdown.

**Solution**:
1. Make sure the provider is selected first
2. Some providers load models dynamically (wait a moment)
3. Check if the KIE models are available in the database

## Cost Estimation

The system shows estimated costs before generation:

### How Costs Are Calculated

- **Image Generation**: Based on resolution (1K, 2K, 4K) and provider
- **Video Generation**: Per 6-second clip, varies by provider
- **Voiceover**: Based on character count and TTS provider
- **Music**: Flat rate per track
- **LLM**: Based on token count and model

### Cost Ranges (in credits)

| Operation | Low Cost | High Cost |
|-----------|----------|-----------|
| Image (2K) | 5-30 credits | 50-100 credits |
| Video (6s) | 10-20 credits | 30-50 credits |
| Voiceover | 2-10 credits | 20-40 credits |
| Music | 5-10 credits | 10-20 credits |
| Scene (LLM) | 1-5 credits | 10-20 credits |

## Security Best Practices

### API Key Storage

- API keys are **encrypted at rest** in the database
- Keys are **never logged** or exposed in error messages
- Keys are **only sent** to their respective providers

### Organization Keys (Premium/Admin)

For teams with shared resources:

- Organization API keys are stored separately
- Admin users can configure org-wide keys
- Regular users benefit from org keys without seeing them
- Usage is tracked per-user for billing

### Personal Keys

- Your personal API keys are **only used** for your generations
- They are **never shared** with other users
- You can remove them at any time from Settings

## Advanced Configuration

### Environment Variables (Server-Side)

For server-side defaults, administrators can set:

```bash
# Provider API Keys
GEMINI_API_KEY=your-key-here
KIE_API_KEY=your-key-here
ELEVENLABS_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
PIAPI_API_KEY=your-key-here
OPENROUTER_API_KEY=your-key-here

# Modal Endpoints
MODAL_IMAGE_ENDPOINT=https://your-app--image.modal.run
MODAL_VIDEO_ENDPOINT=https://your-app--video.modal.run
MODAL_TTS_ENDPOINT=https://your-app--tts.modal.run
MODAL_MUSIC_ENDPOINT=https://your-app--music.modal.run
```

### Custom Modal Endpoints

To use your own Modal deployments:

1. Deploy your model on Modal.com
2. Copy the deployment URL
3. Enter it in Settings under Modal endpoints
4. Select "Modal" as the provider

### Migration from LocalStorage

**Old Behavior**: Settings stored in browser's localStorage

**New Behavior**: Settings stored in database and synced across devices

If you're upgrading, your localStorage settings will be **automatically migrated** to the database on your first login after the update.

## FAQ

### Can I use multiple providers for the same operation?

Yes, you can switch providers at any time. Each project can also have its own provider configuration.

### What happens if my API key runs out of credits?

You'll see an error message from the provider. You can then switch to a different provider or add more credits to your account.

### Are my API keys shared with other users?

No. Your personal API keys are only used for your own generations. Organization keys (for teams) are shared but configured separately.

### How do I know which provider is being used?

Before any generation, a confirmation dialog shows:
- Provider name and logo
- Model being used
- Estimated cost

### Can I test a provider without committing to it?

Yes! Select the provider in settings or the modal, then use the confirmation dialog to review before confirming the generation.

## Support

For issues or questions about provider configuration:

1. Check this documentation first
2. Review error messages carefully
3. Check your API key validity with the provider
4. Contact support if issues persist

## Related Documentation

- [KIE Model Flow](./KIE-MODEL-FLOW.md) - KIE provider configuration details
- [Model Selection Updates](./MODEL-SELECTION-UPDATES.md) - Model selection system
- [Image Generation Flow](./IMAGE-GENERATION-FLOW-EXAMPLE.md) - Image generation walkthrough
