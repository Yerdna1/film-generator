-- Fix projects with missing settings field
-- This query adds default settings to all projects that don't have them

-- First, check which projects have missing or null settings
SELECT id, name, settings
FROM "Project"
WHERE settings IS NULL OR settings::text = 'null' OR settings::text = '';

-- Fix all projects with missing settings
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

-- Also ensure story field has default values if missing
UPDATE "Project"
SET story = '{
  "title": "",
  "concept": "",
  "genre": "adventure",
  "tone": "heartfelt",
  "setting": ""
}'::jsonb
WHERE story IS NULL OR story::text = 'null' OR story::text = '';

-- Verify the fix
SELECT id, name, settings, story
FROM "Project"
WHERE "userId" = 'cmjsdxepp0000oyqgn471ofdt'
LIMIT 5;