'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'andrejgalad@gmail.com';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/');
  }

  // Check if user is admin
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="p-4 bg-red-500/10 rounded-full">
            <Shield className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground text-center max-w-md">
            This page is restricted to administrators only. If you believe you should have access, please contact the admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Admin Badge */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <Shield className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-500">Admin Only</span>
        </div>
        <span className="text-sm text-muted-foreground">
          These pages are only visible to administrators
        </span>
      </div>

      {children}
    </div>
  );
}
