'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Check admin status from database via API
  useEffect(() => {
    async function checkAdminStatus() {
      if (status === 'authenticated' && session?.user?.id) {
        try {
          // Use the user status endpoint to check admin role
          const response = await fetch('/api/user/status');
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.role === 'admin');
          } else {
            setIsAdmin(false);
          }
        } catch {
          setIsAdmin(false);
        }
      }
      setIsCheckingAdmin(false);
    }

    if (status !== 'loading') {
      checkAdminStatus();
    }
  }, [session, status]);

  // Show loading state
  if (status === 'loading' || isCheckingAdmin) {
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
