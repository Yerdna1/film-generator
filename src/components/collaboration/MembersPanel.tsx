'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Crown,
  Edit3,
  Eye,
  MoreVertical,
  Trash2,
  Mail,
  Clock,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InviteMemberDialog } from './InviteMemberDialog';
import type { ProjectRole, ProjectMember, ProjectInvitation } from '@/types/collaboration';

interface MembersPanelProps {
  projectId: string;
  projectName: string;
  currentUserRole: ProjectRole;
  canManageMembers: boolean;
}

const roleIcons: Record<ProjectRole, React.ComponentType<{ className?: string }>> = {
  admin: Crown,
  collaborator: Edit3,
  reader: Eye,
};

const roleLabels: Record<ProjectRole, string> = {
  admin: 'Admin',
  collaborator: 'Collaborator',
  reader: 'Viewer',
};

const roleColors: Record<ProjectRole, string> = {
  admin: 'text-yellow-400',
  collaborator: 'text-purple-400',
  reader: 'text-cyan-400',
};

export function MembersPanel({
  projectId,
  projectName,
  currentUserRole,
  canManageMembers,
}: MembersPanelProps) {
  const t = useTranslations();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (e) {
      console.error('Failed to fetch members:', e);
      setError('Failed to load members');
    }
  }, [projectId]);

  const fetchInvitations = useCallback(async () => {
    if (!canManageMembers) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations.filter((i: ProjectInvitation) => i.status === 'pending'));
      }
    } catch (e) {
      console.error('Failed to fetch invitations:', e);
    }
  }, [projectId, canManageMembers]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMembers(), fetchInvitations()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchMembers, fetchInvitations]);

  const handleRoleChange = async (memberId: string, newRole: ProjectRole) => {
    setUpdatingMemberId(memberId);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update role');
      }
    } catch (e) {
      setError('Failed to update role');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove member');
      }
    } catch (e) {
      setError('Failed to remove member');
    }
  };

  const handleRevokeInvitation = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations/${inviteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } catch (e) {
      console.error('Failed to revoke invitation:', e);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold">{t('collaboration.members')}</h3>
          <span className="text-sm text-muted-foreground">({members.length})</span>
        </div>
        {canManageMembers && (
          <Button
            size="sm"
            onClick={() => setInviteDialogOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('collaboration.inviteMember')}
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        {members.map((member) => {
          const RoleIcon = roleIcons[member.role as ProjectRole];
          const isCurrentUserAdmin = currentUserRole === 'admin';
          const isSelf = false; // TODO: Check if this is the current user
          const canModify = isCurrentUserAdmin && member.role !== 'admin';

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-white/5 rounded-lg flex items-center gap-3"
            >
              <Avatar className="w-10 h-10 border border-white/10">
                <AvatarImage src={member.user?.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-sm">
                  {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {member.user?.name || 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.user?.email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canModify ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.id, value as ProjectRole)}
                    disabled={updatingMemberId === member.id}
                  >
                    <SelectTrigger className="w-[130px] bg-white/5 border-white/10">
                      {updatingMemberId === member.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent className="glass-strong border-white/10">
                      <SelectItem value="collaborator">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-purple-400" />
                          Collaborator
                        </div>
                      </SelectItem>
                      <SelectItem value="reader">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-cyan-400" />
                          Viewer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 ${roleColors[member.role as ProjectRole]}`}>
                    <RoleIcon className="w-4 h-4" />
                    <span className="text-sm">{roleLabels[member.role as ProjectRole]}</span>
                  </div>
                )}

                {canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-strong border-white/10">
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('collaboration.removeMember')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pending Invitations */}
      {canManageMembers && invitations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t('collaboration.pendingInvites')} ({invitations.length})
          </h4>
          <div className="space-y-2">
            {invitations.map((invite) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-yellow-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as {roleLabels[invite.role as ProjectRole]} · Expires {formatDate(invite.expiresAt)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeInvitation(invite.id)}
                  className="text-muted-foreground hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <InviteMemberDialog
        projectId={projectId}
        projectName={projectName}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInviteSent={() => {
          fetchInvitations();
        }}
      />
    </div>
  );
}
