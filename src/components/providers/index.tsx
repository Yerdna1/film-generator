'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { ProjectSyncProvider } from './project-sync-provider';
import { CreditsProvider } from '@/contexts/CreditsContext';
import { ApiKeysProvider } from '@/contexts/ApiKeysContext';

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
          <ApiKeysProvider>
            <ProjectSyncProvider>
              {children}
            </ProjectSyncProvider>
          </ApiKeysProvider>
        </CreditsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
