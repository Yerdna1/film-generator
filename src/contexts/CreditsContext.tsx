'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { InsufficientCreditsModal, type RegenerationContext, type BulkRegenerationContext } from '@/components/billing/InsufficientCreditsModal';

interface InsufficientCreditsData {
  required: number;
  balance: number;
}

interface CreditsContextType {
  showInsufficientCredits: (data: InsufficientCreditsData) => void;
  hideInsufficientCredits: () => void;
  handleApiResponse: (response: Response, regenerationContext?: RegenerationContext) => Promise<boolean>; // Returns true if should stop processing
  handleBulkApiResponse: (response: Response, bulkContext: BulkRegenerationContext) => Promise<boolean>; // For bulk operations
  setRegenerationContext: (context: RegenerationContext | null) => void;
  setBulkRegenerationContext: (context: BulkRegenerationContext | null) => void;
}

const CreditsContext = createContext<CreditsContextType | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creditsData, setCreditsData] = useState<InsufficientCreditsData | null>(null);
  const [regenerationContext, setRegenerationContextState] = useState<RegenerationContext | null>(null);
  const [bulkRegenerationContext, setBulkRegenerationContextState] = useState<BulkRegenerationContext | null>(null);

  const showInsufficientCredits = useCallback((data: InsufficientCreditsData) => {
    setCreditsData(data);
    setIsModalOpen(true);
  }, []);

  const hideInsufficientCredits = useCallback(() => {
    setIsModalOpen(false);
    setCreditsData(null);
    setRegenerationContextState(null);
    setBulkRegenerationContextState(null);
  }, []);

  const setRegenerationContext = useCallback((context: RegenerationContext | null) => {
    setRegenerationContextState(context);
    // Clear bulk context when setting single context
    if (context) setBulkRegenerationContextState(null);
  }, []);

  const setBulkRegenerationContext = useCallback((context: BulkRegenerationContext | null) => {
    setBulkRegenerationContextState(context);
    // Clear single context when setting bulk context
    if (context) setRegenerationContextState(null);
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
            setBulkRegenerationContextState(null);
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

  /**
   * Handle an API response for bulk operations and show modal if 402
   * Returns true if the response was a 402 (caller should stop processing)
   */
  const handleBulkApiResponse = useCallback(async (
    response: Response,
    bulkContext: BulkRegenerationContext
  ): Promise<boolean> => {
    if (response.status === 402) {
      try {
        const data = await response.clone().json();
        if (data.needsPurchase) {
          // Store bulk regeneration context
          setBulkRegenerationContextState(bulkContext);
          setRegenerationContextState(null);
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
        handleBulkApiResponse,
        setRegenerationContext,
        setBulkRegenerationContext,
      }}
    >
      {children}
      <InsufficientCreditsModal
        isOpen={isModalOpen}
        onClose={hideInsufficientCredits}
        required={creditsData?.required || 0}
        balance={creditsData?.balance || 0}
        regenerationContext={regenerationContext}
        bulkRegenerationContext={bulkRegenerationContext}
        onRequestApproval={() => {
          // Clear contexts after successful request
          setRegenerationContextState(null);
          setBulkRegenerationContextState(null);
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
