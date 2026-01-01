'use client';

import { useSession, signOut } from 'next-auth/react';
import { Clock, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

export default function PendingApprovalPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Account Pending Approval
          </h1>
          <p className="text-muted-foreground">
            Thank you for registering! Your account is awaiting approval from an administrator.
          </p>
        </div>

        {/* Info Card */}
        <div className="glass-strong rounded-xl p-6 text-left space-y-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-purple-500 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">What happens next?</p>
              <p className="text-sm text-muted-foreground">
                The administrator has been notified about your registration.
                You'll receive an email once your account is approved.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Registered as:</span>{' '}
              {session?.user?.email}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Check Status
          </Button>
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-muted-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
