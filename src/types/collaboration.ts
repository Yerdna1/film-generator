// Collaboration Types for Project Sharing

export type ProjectRole = 'admin' | 'collaborator' | 'reader';

export interface ProjectPermissions {
  canView: boolean;
  canEdit: boolean;
  canRegenerate: boolean;
  canDelete: boolean;
  canRequestDeletion: boolean;
  canRequestRegeneration: boolean;
  canManageMembers: boolean;
  canApproveRequests: boolean;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  invitedBy?: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  email: string;
  role: ProjectRole;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  inviter: {
    id: string;
    name: string | null;
    email: string | null;
  };
  project?: {
    id: string;
    name: string;
  };
}

export type DeletionTargetType = 'project' | 'scene' | 'character' | 'video';

export type RegenerationTargetType = 'image' | 'video';

export interface DeletionRequest {
  id: string;
  projectId: string;
  requesterId: string;
  targetType: DeletionTargetType;
  targetId: string;
  targetName?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  requester: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
  reviewer?: {
    id: string;
    name: string | null;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface RegenerationRequest {
  id: string;
  projectId: string;
  requesterId: string;
  targetType: RegenerationTargetType;
  targetId: string; // Scene ID
  targetName?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
  requester: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
  reviewer?: {
    id: string;
    name: string | null;
  };
  scene?: {
    id: string;
    title: string;
    number: number;
    imageUrl?: string | null;
    videoUrl?: string | null;
  };
  project?: {
    id: string;
    name: string;
  };
}

export type NotificationType =
  | 'deletion_request'
  | 'invitation'
  | 'invitation_accepted'
  | 'role_change'
  | 'request_approved'
  | 'request_rejected'
  | 'member_joined'
  | 'member_removed'
  | 'regeneration_request'
  | 'regeneration_completed'
  | 'regeneration_failed';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: {
    projectId?: string;
    projectName?: string;
    requestId?: string;
    invitationId?: string;
    memberId?: string;
    memberName?: string;
    targetType?: DeletionTargetType;
    targetName?: string;
    role?: ProjectRole;
    [key: string]: unknown;
  };
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// API Request/Response Types

export interface InviteMemberRequest {
  email: string;
  role: ProjectRole;
  message?: string; // Optional personal message in email
}

export interface UpdateMemberRoleRequest {
  role: ProjectRole;
}

export interface CreateDeletionRequestRequest {
  targetType: DeletionTargetType;
  targetId: string;
  targetName?: string;
  reason?: string;
}

export interface ReviewDeletionRequestRequest {
  approved: boolean;
  note?: string;
}

export interface CreateRegenerationRequestRequest {
  targetType: RegenerationTargetType;
  sceneIds: string[]; // Batch support - array of scene IDs
  reason?: string;
}

export interface ReviewRegenerationRequestRequest {
  approved: boolean;
  note?: string;
}

// Store Types

export interface CollaborationState {
  members: ProjectMember[];
  invitations: ProjectInvitation[];
  deletionRequests: DeletionRequest[];
  regenerationRequests: RegenerationRequest[];
  currentUserRole: ProjectRole | null;
  permissions: ProjectPermissions | null;
  isLoading: boolean;
  error: string | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

// Extended Project type with collaboration info
export interface ProjectWithCollaboration {
  id: string;
  name: string;
  role: ProjectRole;
  isOwner: boolean;
  owner?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  memberCount?: number;
  pendingInvites?: number;
  pendingDeletionRequests?: number;
  pendingRegenerationRequests?: number;
}
