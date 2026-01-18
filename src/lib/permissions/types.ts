// Project Collaboration Permission System
// Type definitions for role-based access control for projects

export type ProjectRole = 'admin' | 'collaborator' | 'reader';

export interface ProjectPermissions {
  canView: boolean;
  canEdit: boolean;           // Edit prompts, settings
  canRegenerate: boolean;     // Regenerate images/videos (if user has credits)
  canDelete: boolean;         // Direct delete (admin only)
  canRequestDeletion: boolean; // Request deletion (collaborator)
  canRequestRegeneration: boolean; // Request regeneration when no credits (collaborator)
  canManageMembers: boolean;  // Invite/remove members
  canApproveRequests: boolean; // Approve deletion/regeneration requests
}
