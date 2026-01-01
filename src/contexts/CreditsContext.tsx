'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { InsufficientCreditsModal, type RegenerationContext } from '@/components/billing/InsufficientCreditsModal';

interface InsufficientCreditsData {
  required: number;
  balance: number;
}

interface CreditsContextType {
  showInsufficientCredits: (data: InsufficientCreditsData) => void;
  hideInsufficientCredits: () => void;
  handleApiResponse: (response: Response, regenerationContext?: RegenerationContext) => Promise<boolean>; // Returns true if should stop processing
  setRegenerationContext: (context: RegenerationContext | null) => void;
}

const CreditsContext = createContext<CreditsContextType | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creditsData, setCreditsData] = useState<InsufficientCreditsData | null>(null);
  const [regenerationContext, setRegenerationContextState] = useState<RegenerationContext | null>(null);

  const showInsufficientCredits = useCallback((data: InsufficientCreditsData) => {
    setCreditsData(data);
    setIsModalOpen(true);
  }, []);

  const hideInsufficientCredits = useCallback(() => {
    setIsModalOpen(false);
    setCreditsData(null);
    setRegenerationContextState(null);
  }, []);

  const setRegenerationContext = useCallback((context: RegenerationContext | null) => {
    setRegenerationContextState(context);
  }, []);

  /**
   * Handle an API response and show modal if 402
   * Returns true if the response was a 402 (caller should stop processing)
   * Optionally accepts regeneration context to show "Request Admin Approval" option
   */
  const handleApiResponse = useCallback(async (
    response: Response,
    context?: RegenerationContext
  ): Promise<boolean> => {
    if (response.status === 402) {
      try {
        const data = await response.clone().json();
        if (data.needsPurchase) {
          // Store regeneration context if provided
          if (context) {
            setRegenerationContextState(context);
          }
          showInsufficientCredits({
            required: data.required || 0,
            balance: data.balance || 0,
          });
          return true;
        }
      } catch (error) {
        console.error('Error parsing 402 response:', error);
      }
    }
    return false;
  }, [showInsufficientCredits]);

  return (
    <CreditsContext.Provider
      value={{
        showInsufficientCredits,
        hideInsufficientCredits,
        handleApiResponse,
        setRegenerationContext,
      }}
    >
      {children}
      <InsufficientCreditsModal
        isOpen={isModalOpen}
        onClose={hideInsufficientCredits}
        required={creditsData?.required || 0}
        balance={creditsData?.balance || 0}
        regenerationContext={regenerationContext}
        onRequestApproval={() => {
          // Clear context after successful request
          setRegenerationContextState(null);
        }}
      />
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
}
