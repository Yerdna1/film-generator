'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useProjectStore } from '@/lib/stores/project-store';

export function ProjectSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { loadProjectsFromDB, isLoading } = useProjectStore();

  useEffect(() => {
    // Load projects from database when user is authenticated
    if (status === 'authenticated' && session?.user) {
      loadProjectsFromDB();
    }
  }, [status, session, loadProjectsFromDB]);

  return <>{children}</>;
}
