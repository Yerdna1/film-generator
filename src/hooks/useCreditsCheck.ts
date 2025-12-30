'use client';

import { useState, useCallback } from 'react';

interface InsufficientCreditsData {
  required: number;
  balance: number;
}

/**
 * Hook to handle credit-aware API calls
 * Returns a wrapped fetch function that detects 402 responses and shows the purchase modal
 */
export function useCreditsCheck() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [insufficientCreditsData, setInsufficientCreditsData] = useState<InsufficientCreditsData | null>(null);

  /**
   * Wrapper for fetch that handles 402 Payment Required responses
   */
  const fetchWithCreditsCheck = useCallback(async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const response = await fetch(input, init);

    if (response.status === 402) {
      try {
        // Clone the response so we can read it
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();

        if (data.needsPurchase) {
          setInsufficientCreditsData({
            required: data.required || 0,
            balance: data.balance || 0,
          });
          setShowPurchaseModal(true);
        }
      } catch (error) {
        console.error('Error parsing 402 response:', error);
      }
    }

    return response;
  }, []);

  /**
   * Close the purchase modal
   */
  const closePurchaseModal = useCallback(() => {
    setShowPurchaseModal(false);
    setInsufficientCreditsData(null);
  }, []);

  return {
    showPurchaseModal,
    insufficientCreditsData,
    fetchWithCreditsCheck,
    closePurchaseModal,
  };
}

/**
 * Type guard to check if a response indicates insufficient credits
 */
export function isInsufficientCreditsError(response: Response): boolean {
  return response.status === 402;
}

/**
 * Parse an insufficient credits error response
 */
export async function parseInsufficientCreditsError(response: Response): Promise<InsufficientCreditsData | null> {
  if (response.status !== 402) return null;

  try {
    const data = await response.json();
    if (data.needsPurchase) {
      return {
        required: data.required || 0,
        balance: data.balance || 0,
      };
    }
  } catch (error) {
    console.error('Error parsing 402 response:', error);
  }

  return null;
}
