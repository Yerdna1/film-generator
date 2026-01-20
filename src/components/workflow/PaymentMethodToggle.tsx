'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Key, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { useCredits } from '@/contexts/CreditsContext';
import type { OperationType } from '@/lib/services/user-permissions';
import { useSession } from 'next-auth/react';

interface PaymentMethodToggleProps {
  operation?: OperationType;
  onMethodChange?: (useOwnKeys: boolean) => void;
  className?: string;
}

export function PaymentMethodToggle({ operation, onMethodChange, className }: PaymentMethodToggleProps) {
  const { data: session } = useSession();
  const { apiKeys, updatePaymentPreference, hasApiKey } = useApiKeys();
  const [loading, setLoading] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const [credits, setCredits] = useState<number>(0);

  // Check if toggle should be shown
  useEffect(() => {
    async function checkPaymentMethods() {
      if (!session?.user?.id) return;

      try {
        // Get available payment methods from API
        const params = new URLSearchParams({
          includePaymentMethods: 'true',
          ...(operation && { operation })
        });

        const response = await fetch(`/api/user/permissions?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const { paymentMethods } = await response.json();

        if (paymentMethods) {
          const canUseCredits = paymentMethods.some((m: any) => m.type === 'credits' && m.available);
          const canUseKeys = paymentMethods.some((m: any) => m.type === 'apiKeys' && m.available);

          // Show toggle only if both methods are available
          setShowToggle(canUseCredits && canUseKeys);
        }

        // Set initial state from user preference
        if (apiKeys?.preferOwnKeys) {
          setUseOwnKeys(true);
        }

        // Get current credit balance
        const creditsResponse = await fetch('/api/credits');
        if (creditsResponse.ok) {
          const data = await creditsResponse.json();
          setCredits(data.balance || 0);
        }
      } catch (error) {
        console.error('Error checking payment methods:', error);
      }
    }

    checkPaymentMethods();
  }, [session?.user?.id, apiKeys?.preferOwnKeys, operation]);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const success = await updatePaymentPreference(checked);
      if (success) {
        setUseOwnKeys(checked);
        onMethodChange?.(checked);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!showToggle) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">Credits</span>
          <Badge variant="outline" className="text-xs">
            {credits.toLocaleString()}
          </Badge>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Switch
                id="payment-method"
                checked={useOwnKeys}
                onCheckedChange={handleToggle}
                disabled={loading}
              />
              <Label htmlFor="payment-method" className="cursor-pointer">
                Use Own API Keys
              </Label>
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              {useOwnKeys
                ? 'Using your own API keys (no credit cost)'
                : 'Using system API keys (deducts credits)'}
            </p>
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">API Keys</span>
          {operation && (
            <Badge variant={hasApiKey(operation) ? 'default' : 'secondary'} className="text-xs">
              {hasApiKey(operation) ? 'Configured' : 'Not Set'}
            </Badge>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Compact version for inline use
export function PaymentMethodToggleCompact({ operation, onMethodChange }: PaymentMethodToggleProps) {
  const { apiKeys, updatePaymentPreference } = useApiKeys();
  const { data: session } = useSession();
  const [showToggle, setShowToggle] = useState(false);
  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkMethods() {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/user/permissions');
        if (response.ok) {
          const { permissions } = await response.json();
          setShowToggle(permissions.canChoosePaymentMethod);
          setUseOwnKeys(apiKeys?.preferOwnKeys ?? false);
        }
      } catch (error) {
        console.error('Error checking payment methods:', error);
      }
    }

    checkMethods();
  }, [session?.user?.id, apiKeys?.preferOwnKeys]);

  if (!showToggle) return null;

  const handleToggle = async () => {
    setLoading(true);
    const newValue = !useOwnKeys;
    try {
      const success = await updatePaymentPreference(newValue);
      if (success) {
        setUseOwnKeys(newValue);
        onMethodChange?.(newValue);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : useOwnKeys ? (
        <Key className="w-3 h-3" />
      ) : (
        <CreditCard className="w-3 h-3" />
      )}
      {useOwnKeys ? 'Using API Keys' : 'Using Credits'}
    </button>
  );
}