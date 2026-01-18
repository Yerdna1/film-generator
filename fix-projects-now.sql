-- STEP 1: Check which projects have missing settings (optional - just to see the problem)
SELECT id, name, settings
FROM "Project"
WHERE settings IS NULL OR settings::text = 'null' OR settings::text = ''
LIMIT 10;

-- STEP 2: Fix all projects with missing settings
UPDATE "Project"
SET settings = '{
  "sceneCount": 12,
  "characterCount": 2,
  "aspectRatio": "21:9",
  "resolution": "4k",
  "imageResolution": "2k",
  "voiceLanguage": "en",
  "voiceProvider": "elevenlabs",
  "storyModel": "claude-sonnet-4.5"
}'::jsonb
WHERE settings IS NULL OR settings::text = 'null' OR settings::text = '';

-- STEP 3: Also fix any projects with missing story field
UPDATE "Project"
SET story = '{
  "title": "Untitled",
  "concept": "",
  "genre": "adventure",
  "tone": "heartfelt",
  "setting": ""
}'::jsonb
WHERE story IS NULL OR story::text = 'null' OR story::text = '';

-- STEP 4: Verify the fix worked - check your projects now have settings
SELECT id, name, settings, story
FROM "Project"
WHERE "userId" = 'cmjsdxepp0000oyqgn471ofdt'
LIMIT 5;