'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Mail,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectRole } from '@/types/collaboration';

interface InviteMemberDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
}

const roleOptions: { value: ProjectRole; label: string; description: string }[] = [
  {
    value: 'collaborator',
    label: 'Collaborator',
    description: 'Can edit prompts and regenerate content',
  },
  {
    value: 'reader',
    label: 'Viewer',
    description: 'View-only access',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full control including member management',
  },
];

export function InviteMemberDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
  onInviteSent,
}: InviteMemberDialogProps) {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('collaborator');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, message: message || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation');
        return;
      }

      setInviteLink(data.inviteLink);
      onInviteSent?.();
    } catch (e) {
      setError('Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setEmail('');
      setRole('collaborator');
      setMessage('');
      setError(null);
      setInviteLink(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-strong border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            {t('collaboration.inviteTitle')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('collaboration.inviteDescription')}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!inviteLink ? (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">{t('collaboration.emailPlaceholder')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="pl-10 bg-white/5 border-white/10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('collaboration.roleLabel')}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-strong border-white/10">
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (optional)</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal note to the invitation..."
                  className="bg-white/5 border-white/10 min-h-[80px]"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('collaboration.sendInvite')}
                  </>
                )}
              </Button>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Invitation Sent!</h3>
                <p className="text-sm text-muted-foreground">
                  An invitation has been sent to <strong>{email}</strong>
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LinkIcon className="w-4 h-4" />
                  <span>Or share this invite link:</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="bg-white/5 border-white/10 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="flex-shrink-0"
                  >
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteLink(null);
                    setEmail('');
                    setMessage('');
                  }}
                  className="flex-1"
                >
                  Invite Another
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
