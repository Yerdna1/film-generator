import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useSubscriptionStatus() {
  const { data: session } = useSession();
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session) {
        setIsPremiumUser(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/subscription-status');
        if (response.ok) {
          const data = await response.json();
          setIsPremiumUser(data.hasActiveSubscription || false);
        } else {
          setIsPremiumUser(false);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setIsPremiumUser(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [session]);

  return {
    isPremiumUser,
    isLoading,
  };
}