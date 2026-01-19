import { useCallback } from 'react';
import { toast } from 'sonner';
import type { User, AppConfig, CreditAction } from '../types';

interface UseAdminActionsProps {
  fetchData: () => void;
}

export const useAdminActions = ({ fetchData }: UseAdminActionsProps) => {
  const handleCreditAction = useCallback(async (
    selectedUser: User | null,
    creditAction: CreditAction,
    creditAmount: string,
    creditReason: string,
    onSuccess: () => void
  ) => {
    if (!selectedUser || !creditAmount) return;

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid number');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: creditAction === 'add' ? 'add_credits' :
            creditAction === 'deduct' ? 'deduct_credits' : 'set_credits',
          amount,
          reason: creditReason,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        onSuccess();
        fetchData();
        window.dispatchEvent(new CustomEvent('credits-updated'));
      } else {
        console.error('Credit action failed:', data);
        toast.error(data.details || data.error || 'Failed to update credits');
      }
    } catch (error) {
      console.error('Credit action error:', error);
      toast.error('Failed to update credits');
    }
  }, [fetchData]);

  const handleBlockToggle = useCallback(async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_block',
          isBlocked: !user.isBlocked,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to update user');
    }
  }, [fetchData]);

  const handleApproval = useCallback(async (user: User, approve: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approve ? 'approve' : 'reject',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to update approval');
    }
  }, [fetchData]);

  const handleUpdateConfig = useCallback(async (
    startingCredits: string,
    onSuccess: () => void
  ) => {
    const credits = parseInt(startingCredits);
    if (isNaN(credits) || credits < 0) {
      toast.error('Invalid number');
      return;
    }

    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startingCredits: credits }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        onSuccess();
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to update config');
    }
  }, [fetchData]);

  return {
    handleCreditAction,
    handleBlockToggle,
    handleApproval,
    handleUpdateConfig,
  };
};
