'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useProjectStore } from '@/lib/stores/project-store';

export function ProjectSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { loadProjectsFromDB } = useProjectStore();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user) {
      // Load projects from database when user is authenticated
      loadProjectsFromDB();
    } else {
      // Not authenticated - set loading to false so pages don't wait forever
      useProjectStore.setState({ isLoading: false });
    }
  }, [status, session, loadProjectsFromDB]);

  return <>{children}</>;
}
