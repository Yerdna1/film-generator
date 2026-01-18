'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Users,
  Check,
  X,
  Loader2,
  AlertCircle,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProjectInvitation, ProjectRole } from '@/types/collaboration';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

const roleColors: Record<ProjectRole, { bg: string; text: string }> = {
  admin: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  collaborator: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  reader: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

const roleDescriptions: Record<ProjectRole, string> = {
  admin: 'Full control over the project including managing members',
  collaborator: 'Can edit and regenerate content. Deletions require admin approval',
  reader: 'View-only access to the project',
};

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const t = useTranslations('invite');
  const [token, setToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<ProjectInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Fetch invitation details
  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/accept/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || t('failedToLoad'));
          return;
        }

        setInvitation(data.invitation);
      } catch (e) {
        setError(t('failedToLoad'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/invitations/accept/${token}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('failedToAccept'));
        return;
      }

      setSuccess(true);
      // Redirect to project after a short delay
      setTimeout(() => {
        router.push(`/project/${data.projectId}`);
      }, 2000);
    } catch (e) {
      setError(t('failedToAccept'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;

    setIsProcessing(true);

    try {
      await fetch(`/api/invitations/decline/${token}`, {
        method: 'POST',
      });
      router.push('/');
    } catch (e) {
      router.push('/');
    }
  };

  // Show loading state
  if (isLoading || authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-purple-900/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-500" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </motion.div>
      </div>
    );
  }

  // Show error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-purple-900/10 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md glass border-white/10">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-purple-900/10 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md glass border-white/10">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <CardTitle className="text-2xl">Project Invitation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invitation && (
                <div className="p-4 bg-white/5 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Project</p>
                    <p className="font-semibold">{invitation.project?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invited by</p>
                    <p className="font-medium">{invitation.inviter.name || invitation.inviter.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <Badge className={`${roleColors[invitation.role].bg} ${roleColors[invitation.role].text} border-0`}>
                      {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                    </Badge>
                  </div>
                </div>
              )}

              <p className="text-center text-muted-foreground">
                Sign in to accept this invitation
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => router.push(`/auth/login?callbackUrl=/invite/${token}`)}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/auth/register?callbackUrl=/invite/${token}`)}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-purple-900/10 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md glass border-white/10">
            <CardContent className="pt-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">Welcome to the Team!</h2>
              <p className="text-muted-foreground mb-4">
                You've joined "{invitation?.project?.name}"
              </p>
              <p className="text-sm text-muted-foreground">Redirecting to project...</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show invitation details
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-purple-900/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="max-w-md glass border-white/10">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <CardTitle className="text-2xl">Project Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {invitation && (
              <>
                <div className="p-4 bg-white/5 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Project</p>
                    <p className="text-lg font-semibold">{invitation.project?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invited by</p>
                    <p className="font-medium">{invitation.inviter.name || invitation.inviter.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your Role</p>
                    <Badge className={`${roleColors[invitation.role].bg} ${roleColors[invitation.role].text} border-0`}>
                      {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {roleDescriptions[invitation.role]}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDecline}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                  <Button
                    onClick={handleAccept}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Accept
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
