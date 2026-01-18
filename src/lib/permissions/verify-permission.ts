// Verify user can perform a specific action and return appropriate error

import { getUserProjectRole } from './get-user-role';
import { ROLE_PERMISSIONS } from './role-permissions';
import type { ProjectPermissions } from './types';

export async function verifyPermission(
  userId: string,
  projectId: string,
  permission: keyof ProjectPermissions
): Promise<{ allowed: true } | { allowed: false; error: string; status: number }> {
  const role = await getUserProjectRole(userId, projectId);

  if (!role) {
    return {
      allowed: false,
      error: 'Project not found or access denied',
      status: 404,
    };
  }

  const permissions = ROLE_PERMISSIONS[role];

  if (!permissions[permission]) {
    // Special case: if they can request deletion instead of direct delete
    if (permission === 'canDelete' && permissions.canRequestDeletion) {
      return {
        allowed: false,
        error: 'Deletion requires admin approval. Please submit a deletion request.',
        status: 403,
      };
    }

    return {
      allowed: false,
      error: `Insufficient permissions. Required: ${permission}`,
      status: 403,
    };
  }

  return { allowed: true };
}
