'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useProjectStore } from '@/lib/stores/project-store';

export function ProjectSyncProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;

    // Only load once per session
    if (hasLoadedRef.current) return;

    if (status === 'authenticated') {
      hasLoadedRef.current = true;
      useProjectStore.getState().loadProjectsFromDB();
    } else {
      // Not authenticated - set loading to false so pages don't wait forever
      useProjectStore.setState({ isLoading: false });
    }
  }, [status]);

  return <>{children}</>;
}
