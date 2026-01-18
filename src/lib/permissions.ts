// Project Collaboration Permission System
// Handles role-based access control for projects
//
// This file has been split into smaller, focused files for better maintainability.
// All exports are re-exported from './permissions' for backwards compatibility.

export type { ProjectRole, ProjectPermissions } from './permissions/types';
export { ROLE_PERMISSIONS } from './permissions/role-permissions';
export { getUserProjectRole } from './permissions/get-user-role';
export { checkPermission } from './permissions/check-permission';
export { verifyPermission } from './permissions/verify-permission';
export { getProjectWithPermissions } from './permissions/get-project-with-permissions';
export {
  getUserAccessibleProjects,
  getUserAccessibleProjectsSummary
} from './permissions/get-user-accessible-projects';
export { getProjectAdmins } from './permissions/get-project-admins';
export { getPublicProjects } from './permissions/get-public-projects';
