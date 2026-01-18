// Check if user has a specific permission for a project

import { getUserProjectRole } from './get-user-role';
import { ROLE_PERMISSIONS } from './role-permissions';
import type { ProjectPermissions } from './types';

export async function checkPermission(
  userId: string,
  projectId: string,
  permission: keyof ProjectPermissions
): Promise<boolean> {
  const role = await getUserProjectRole(userId, projectId);

  if (!role) {
    return false;
  }

  return ROLE_PERMISSIONS[role][permission];
}
