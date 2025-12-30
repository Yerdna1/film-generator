'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { ProjectSyncProvider } from './project-sync-provider';

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
        <ProjectSyncProvider>
          {children}
        </ProjectSyncProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
