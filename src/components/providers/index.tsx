'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { ProjectSyncProvider } from './project-sync-provider';
import { CreditsProvider } from '@/contexts/CreditsContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <CreditsProvider>
          <ProjectSyncProvider>
            {children}
          </ProjectSyncProvider>
        </CreditsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
