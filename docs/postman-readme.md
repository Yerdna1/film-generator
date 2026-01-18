# Film Generator API - Postman Collection

Complete Postman collection for testing the Film Generator API with all endpoints, authentication, and example request bodies.

## 🔐 Authentication - How It Works

This API uses **NextAuth.js with cookie-based authentication** (NOT Bearer tokens).

The collection automatically:
1. Captures the session token from the login response cookie
2. Adds it as a `Cookie` header to all subsequent requests
3. No manual token management needed!

### Quick Start

### 1. Import the Collection

1. Open Postman
2. Click **Import** in the top left
3. Select the `postman-collection.json` file from `/docs`
4. The collection will appear in your sidebar as "Film Generator API"

### 2. Import the Environment (Optional but Recommended)

1. Click **Import** in Postman
2. Select the `postman-environment.json` file from `/docs`
3. Click on the environment selector (top right) and select "Film Generator - Local"

### 3. Configure Base URL

The collection uses `{{baseUrl}}` variable for all requests. Default is `http://localhost:3000`

To change it:
- Click the eye icon in the top right
- Edit the `baseUrl` value to your server URL
- Or set `NEXT_PUBLIC_APP_URL` environment variable

## Authentication Workflow

### Step 1: Login

Navigate to **Authentication > Login (Credentials)** and send:

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**What happens automatically:**
- The response contains a `Set-Cookie` header with `next-auth.session-token`
- A test script extracts this token and saves it to `{{sessionToken}}` variable
- All subsequent requests automatically include this token as a cookie

### Step 2: Verify Token Was Captured

Click the eye icon (top right) in Postman and check that `sessionToken` now has a value (a long JWT string).

### Step 3: Use Authenticated Requests

All other requests will work automatically! The collection has a pre-request script that adds the session cookie to every request:

```
Cookie: next-auth.session-token={{sessionToken}}
```

## Troubleshooting Authentication

### "Unauthorized" Error

**Problem:** Requests return 401 Unauthorized

**Solutions:**
1. Make sure you've run the **Login** request first
2. Check that `sessionToken` variable has a value (click the eye icon)
3. Try logging in again

### Session Token Not Capturing

**Problem:** After login, `sessionToken` is still empty

**Solutions:**
1. Check the **Console** at the bottom of Postman after login - it will show if the cookie was found
2. Check **Cookies** tab in the login response - look for `next-auth.session-token`
3. If using HTTPS, the cookie might be named `__Secure-next-auth.session-token`

### Manual Token Setup (If Auto-Capture Fails)

1. Login via the web interface at `http://localhost:3000/auth/login`
2. Open browser DevTools → Application → Cookies
3. Copy the value of `next-auth.session-token`
4. In Postman, click the eye icon and manually set `sessionToken` to this value

### Session Expires

NextAuth sessions typically expire after 30 days. If you get 401 errors:

1. Simply run the **Login** request again
2. The token will be automatically refreshed

## Test User Credentials

Based on your test setup, you can use:

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

Or create a new user via the registration endpoint.

## Collection Structure

### 📁 Authentication
- `POST /api/auth/signin` - Login with email/password
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Logout

### 📁 Projects
- `GET /api/projects` - Get all user projects
- `GET /api/projects/public` - Get public projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}/export` - Export project (json/markdown/zip)
- `POST /api/projects/import` - Import project

### 📁 Scenes
- `GET /api/projects/{id}/scenes` - Get scenes with pagination
- `POST /api/projects/{id}/scenes` - Create scene
- `PUT /api/projects/{id}/scenes` - Batch update scenes
- `PUT /api/projects/{id}/scenes/{sceneId}` - Update specific scene
- `PUT /api/projects/{id}/scenes/{sceneId}/lock` - Lock/unlock scene

### 📁 Characters
- `GET /api/projects/{id}/characters` - Get characters
- `POST /api/projects/{id}/characters` - Create character
- `PUT /api/projects/{id}/characters/{id}` - Update character
- `DELETE /api/projects/{id}/characters/{id}` - Delete character

### 📁 AI Generation - Image
- `POST /api/image` - Generate image

**Providers:**
- `gemini` - Google Gemini 3 Pro (default)
- `kie` - KIE AI (multiple models)
- `modal` - Self-hosted Modal
- `modal-edit` - Modal with reference images (character consistency)

**Example Request:**
```json
{
  "prompt": "A brave hero standing at the edge of a magical forest, Disney Pixar style, vibrant colors",
  "aspectRatio": "16:9",
  "resolution": "2k",
  "projectId": "{{projectId}}",
  "imageProvider": "gemini"
}
```

### 📁 AI Generation - Video
- `POST /api/video` - Create video task
- `GET /api/video` - Poll video status
- `POST /api/video/compose` - Compose final video

**Providers:**
- `kie` - KIE AI Grok Imagine (default)
- `modal` - Self-hosted Modal

**Modes:**
- `fun` - Creative/expressive motion
- `normal` - Standard motion (default)
- `spicy` - More dramatic motion

### 📁 AI Generation - TTS (Voiceover)
- `POST /api/tts` - Generate speech

**Providers:**
- `gemini-tts` - Google Gemini TTS (default)
- `elevenlabs` - ElevenLabs
- `openai-tts` - OpenAI gpt-4o-mini-tts
- `kie` - KIE AI ElevenLabs
- `modal` - Self-hosted Modal TTS

**Gemini TTS Example:**
```json
{
  "text": "This is where my journey begins.",
  "voiceId": "Aoede",
  "language": "sk",
  "projectId": "{{projectId}}",
  "provider": "gemini-tts"
}
```

**ElevenLabs with Custom Settings:**
```json
{
  "text": "Hello, this is a test.",
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "provider": "elevenlabs",
  "voiceStability": 0.5,
  "voiceSimilarityBoost": 0.75,
  "voiceStyle": 0.5
}
```

### 📁 AI Generation - Music
- `POST /api/music` - Create music task
- `GET /api/music` - Poll music status

**Providers:**
- `piapi` - PiAPI Suno integration (default)
- `suno` - Direct Suno API
- `kie` - KIE AI Suno
- `modal` - Self-hosted Modal music

**Example:**
```json
{
  "prompt": "Epic orchestral adventure music with building intensity",
  "instrumental": true,
  "title": "Hero's Journey",
  "provider": "piapi"
}
```

### 📁 LLM - Story & Scenes
- `POST /api/llm/prompt` - Generate story prompt
- `POST /api/claude/scenes` - Generate scenes from story

### 📁 Project Members & Permissions
- `GET /api/projects/{id}/members` - Get members
- `POST /api/projects/{id}/members` - Add member
- `PUT /api/projects/{id}/members/{id}` - Update member role
- `DELETE /api/projects/{id}/members/{id}` - Remove member
- `GET /api/projects/{id}/members/me` - Get your permissions
- `GET /api/projects/{id}/permissions` - Get permissions summary

**Roles:**
- `admin` - Full permissions
- `collaborator` - Can edit, regenerate
- `reader` - View only

### 📁 Invitations
- `POST /api/projects/{id}/invitations` - Create invitation
- `GET /api/projects/{id}/invitations` - Get invitations
- `POST /api/invitations/accept/{token}` - Accept invitation
- `POST /api/invitations/decline/{token}` - Decline invitation
- `DELETE /api/projects/{id}/invitations/{id}` - Cancel invitation

### 📁 Regeneration Requests
- `GET /api/projects/{id}/regeneration-requests` - Get requests
- `POST /api/projects/{id}/regeneration-requests` - Create request
- `PUT /api/projects/{id}/regeneration-requests/{id}` - Approve/reject
- `POST /api/projects/{id}/regeneration-requests/bulk` - Bulk process

### 📁 Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/{id}/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read

### 📁 Credits & Billing
- `GET /api/credits` - Get credit balance
- `GET /api/projects/costs` - Get credit costs
- `GET /api/polar` - Get Polar subscription

### 📁 User Profile
- `GET /api/user/status` - Get user status
- `GET /api/user/api-keys` - Get saved API keys
- `PUT /api/user/api-keys` - Update API keys
- `GET /api/user/constants` - Get app constants

**Update API Keys Example:**
```json
{
  "geminiApiKey": "YOUR_GEMINI_API_KEY",
  "elevenLabsApiKey": "YOUR_ELEVENLABS_API_KEY",
  "openaiApiKey": "YOUR_OPENAI_API_KEY",
  "kieApiKey": "YOUR_KIE_API_KEY",
  "piapiApiKey": "YOUR_PIAPI_API_KEY",
  "sunoApiKey": "YOUR_SUNO_API_KEY"
}
```

### 📁 Admin Endpoints
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/{id}` - Approve/reject user
- `POST /api/admin/clear-cache` - Clear caches
- `GET /api/admin/app-config` - Get config
- `PUT /api/admin/app-config` - Update config
- `GET /api/admin/approvals` - Get approval requests

## Testing Workflow Example

### Complete Film Generation Flow

1. **Create Project**
   - Go to `Projects > Create Project`
   - Send request with your story concept
   - Save the returned `projectId` (auto-saved to environment)

2. **Generate Story Prompt**
   - Go to `LLM - Story & Scenes > Generate Story Prompt`
   - Send with your concept
   - Copy the generated story

3. **Generate Scenes**
   - Go to `LLM - Story & Scenes > Generate Scenes from Story`
   - Paste the generated story
   - Scenes will be created automatically

4. **Generate Images**
   - Go to `AI Generation - Image > Generate Image`
   - Use a scene's `textToImagePrompt`
   - Save the returned `imageUrl`

5. **Generate Video**
   - Go to `AI Generation - Video > Generate Video`
   - Use the `imageUrl` from step 4
   - Save the returned `taskId`

6. **Check Video Status**
   - Go to `AI Generation - Video > Check Video Status`
   - Use the `taskId`
   - Poll until status is `complete`

7. **Generate Voiceover**
   - Go to `AI Generation - TTS > Generate Speech`
   - Use dialogue text from a scene
   - Save the returned `audioUrl`

8. **Export Project**
   - Go to `Projects > Export Project`
   - Choose format (json/markdown/zip)

## Credit System

All AI generation operations consume credits:

| Operation | Credit Cost |
|-----------|-------------|
| Image Generation (HD) | 48 credits |
| Image Generation (SD) | 12 credits |
| Video Generation | 20 credits |
| Voiceover Line | 1 credit |
| Music Generation | 10 credits |
| Story/Scene Generation | 2 credits |

## Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Server Error |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `baseUrl` | API base URL (default: http://localhost:3000) |
| `sessionToken` | NextAuth session token from cookie (auto-set after login) |
| `userId` | Current user ID (auto-set after login) |
| `projectId` | Current project ID (auto-set) |
| `sceneId` | Current scene ID (auto-set) |
| `characterId` | Current character ID (auto-set) |

## Tips

1. **Auto-save IDs**: The collection automatically saves IDs to environment variables after successful requests
2. **Test Scripts**: Many requests include test scripts to parse responses and save IDs
3. **Use Folders**: Organize related requests in folders for easier navigation
4. **Collection Runner**: Use the collection runner to execute multiple requests in sequence
5. **Environments**: Create multiple environments (local, staging, production) and switch between them

## Troubleshooting

### "Unauthorized" Error
- Make sure you've logged in successfully
- Check that `sessionToken` is set in environment variables
- Try logging in again

### "Project not found" Error
- Verify `projectId` is set correctly
- Make sure you have access to the project
- Check the project exists in `GET /api/projects`

### "Insufficient credits" Error
- Check your balance with `GET /api/credits`
- Purchase credits or upgrade plan
- Check credit costs with `GET /api/projects/costs`

### API Key Not Configured
- Add your API keys via `PUT /api/user/api-keys`
- Or set environment variables on the server
- Each AI provider needs its own API key

## Support

For issues or questions, refer to the main documentation at `/docs/dokumentacia-kompletna-sk.md`.
