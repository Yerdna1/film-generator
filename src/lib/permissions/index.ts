// Project Collaboration Permission System
// Role-based access control for projects
//
// This module has been split into smaller, focused files for better maintainability.

export type { ProjectRole, ProjectPermissions } from './types';
export { ROLE_PERMISSIONS } from './role-permissions';
export { getUserProjectRole } from './get-user-role';
export { checkPermission } from './check-permission';
export { verifyPermission } from './verify-permission';
export { getProjectWithPermissions } from './get-project-with-permissions';
export {
  getUserAccessibleProjects,
  getUserAccessibleProjectsSummary
} from './get-user-accessible-projects';
export { getProjectAdmins } from './get-project-admins';
export { getPublicProjects } from './get-public-projects';
