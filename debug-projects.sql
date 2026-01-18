-- 1. Check the structure of settings in your projects
SELECT
    id,
    name,
    settings,
    jsonb_typeof(settings) as settings_type,
    settings->'storyModel' as story_model
FROM "Project"
WHERE "userId" = 'cmjsdxepp0000oyqgn471ofdt'
LIMIT 5;

-- 2. Check if settings is a valid JSON object
SELECT
    id,
    name,
    CASE
        WHEN settings IS NULL THEN 'NULL'
        WHEN jsonb_typeof(settings) = 'object' THEN 'Valid JSON Object'
        ELSE 'Invalid Type: ' || jsonb_typeof(settings)
    END as settings_status
FROM "Project"
WHERE "userId" = 'cmjsdxepp0000oyqgn471ofdt';

-- 3. Look at the raw settings data
SELECT id, name, settings::text as raw_settings
FROM "Project"
WHERE "userId" = 'cmjsdxepp0000oyqgn471ofdt'
LIMIT 3;

-- 4. Check if any projects have empty object settings
SELECT id, name
FROM "Project"
WHERE "userId" = 'cmjsdxepp0000oyqgn471ofdt'
AND settings::text = '{}';