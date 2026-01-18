# Fix: Admin Not Seeing Projects

## Problem Diagnosis

Based on my investigation, there are two main reasons why you're not seeing your projects:

### 1. User Approval Status
Even admin users need to have `isApproved = true` in the database. If this is false, you'll be redirected to `/pending-approval`.

### 2. Project Ownership Mismatch
The API only shows projects where:
- The project's `userId` field matches your current user ID, OR
- You're listed as a member in the `ProjectMember` table

If your admin user ID doesn't match the `userId` in the projects, you won't see them.

## SQL Queries to Diagnose

First, run these queries to understand the current state:

```sql
-- 1. Check your user status (replace 'your-email@example.com' with your actual email)
  SELECT id, email, role, "isApproved", "isBlocked"
  FROM "User"
  WHERE email = 'andrej.galad@gmail.com';
-- 2. Check if you have projects with matching userId (replace 'your-user-id' with your actual ID)
  SELECT id, name, "userId", "createdAt", "updatedAt"
  FROM "Project"
  WHERE "userId" = 'your-user-id'
  LIMIT 10;
-- 3. Check all projects in the database
SELECT id, name, "userId", "createdAt", "updatedAt"
FROM "Project"
ORDER BY "createdAt" DESC
LIMIT 20;

-- 4. Check if you're a member of any projects (replace 'your-user-id')
SELECT pm.*, p.name
FROM "ProjectMember" pm
JOIN "Project" p ON pm."projectId" = p.id
WHERE pm."userId" = 'your-user-id';
```

## SQL Queries to Fix

### Fix 1: Ensure Admin User is Approved

```sql
-- Update your admin user to be approved (replace with your email)
UPDATE "User"
SET "isApproved" = true, role = 'admin'
WHERE email = 'your-email@example.com';
```

### Fix 2: Transfer Project Ownership

If the projects belong to a different user ID, you have three options:

#### Option A: Transfer ownership to your admin user
```sql
-- Transfer all projects from old user to admin user
-- Replace 'old-user-id' with the current owner's ID
-- Replace 'your-admin-user-id' with your admin user's ID
UPDATE "Project"
SET "userId" = 'your-admin-user-id'
WHERE "userId" = 'old-user-id';
```

#### Option B: Transfer specific projects
```sql
-- Transfer specific projects to admin user
-- Replace project IDs and your admin user ID
UPDATE "Project"
SET "userId" = 'your-admin-user-id'
WHERE id IN ('project-id-1', 'project-id-2', 'project-id-3');
```

#### Option C: Add yourself as an admin member (keeps original owner)
```sql
-- Add yourself as admin member to all projects
-- Replace 'your-admin-user-id' with your actual ID
INSERT INTO "ProjectMember" (id, "projectId", "userId", role, "joinedAt")
SELECT
    gen_random_uuid(),
    p.id,
    'your-admin-user-id',
    'admin',
    NOW()
FROM "Project" p
WHERE NOT EXISTS (
    SELECT 1 FROM "ProjectMember" pm
    WHERE pm."projectId" = p.id AND pm."userId" = 'your-admin-user-id'
);
```

### Fix 3: Clear Cache After Database Changes

After running the SQL fixes, the projects might still not appear due to caching. Force a refresh by:

1. **Browser method**: Navigate to `http://localhost:3000/api/projects?refresh=true`
2. **Clear all caches**: Restart your development server

## Quick Fix Script

Here's a combined script that will fix most issues:

```sql
-- Replace these variables with your actual values
-- SET @admin_email = 'your-email@example.com';
-- SET @admin_user_id = 'your-user-id';

-- 1. Fix admin user status
UPDATE "User"
SET "isApproved" = true, role = 'admin'
WHERE email = @admin_email;

-- 2. Add admin as member to all projects they don't own
INSERT INTO "ProjectMember" (id, "projectId", "userId", role, "joinedAt")
SELECT
    gen_random_uuid(),
    p.id,
    u.id,
    'admin',
    NOW()
FROM "Project" p
CROSS JOIN "User" u
WHERE u.email = @admin_email
  AND p."userId" != u.id
  AND NOT EXISTS (
    SELECT 1 FROM "ProjectMember" pm
    WHERE pm."projectId" = p.id AND pm."userId" = u.id
);
```

## Verification Steps

1. Run the diagnostic queries to check your user status
2. Apply the appropriate fix based on your situation
3. Clear browser cache and cookies
4. Navigate to `http://localhost:3000/?refresh=true`
5. Check browser console for any errors

## Additional Debugging

If projects still don't appear:

1. **Check browser console** for JavaScript errors
2. **Check network tab** to see if `/api/projects` returns data
3. **Check server logs** for any error messages
4. **Verify session**: Make sure you're logged in with the correct account

## Common Issues

1. **Multiple admin accounts**: Make sure you're logged in with the account that has the correct user ID
2. **Database connection**: Ensure your database is running and accessible
3. **Session expired**: Try logging out and back in
4. **Browser cache**: Try incognito/private browsing mode

## Prevention

To prevent this in the future:

1. Always create projects while logged in with your admin account
2. Use the application's built-in project creation instead of direct database inserts
3. Regularly backup your database before making manual changes