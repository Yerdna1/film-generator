// Role-based permission mapping

import type { ProjectPermissions, ProjectRole } from './types';

export const ROLE_PERMISSIONS: Record<ProjectRole, ProjectPermissions> = {
  admin: {
    canView: true,
    canEdit: true,
    canRegenerate: true,
    canDelete: true,
    canRequestDeletion: false, // Admin doesn't need to request
    canRequestRegeneration: false, // Admin regenerates directly
    canManageMembers: true,
    canApproveRequests: true,
  },
  collaborator: {
    canView: true,
    canEdit: true,
    canRegenerate: true, // Can regenerate if they have credits
    canDelete: false,
    canRequestDeletion: true,
    canRequestRegeneration: true, // Can request if no credits
    canManageMembers: false,
    canApproveRequests: false,
  },
  reader: {
    canView: true,
    canEdit: false,
    canRegenerate: false,
    canDelete: false,
    canRequestDeletion: false,
    canRequestRegeneration: false,
    canManageMembers: false,
    canApproveRequests: false,
  },
};
