'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAdminData,
  useAdminActions,
} from './hooks';
import {
  AppConfigCard,
  PendingApprovals,
  UsersList,
  CreditDialog,
  ConfigDialog,
} from './components';
import type { User, CreditAction } from './types';

const ITEMS_PER_PAGE = 10;

export default function AdminPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  // Data fetching
  const {
    users,
    config,
    loading,
    fetchData,
  } = useAdminData();

  // Actions
  const { handleCreditAction, handleBlockToggle, handleApproval, handleUpdateConfig } = useAdminActions({ fetchData });

  // Dialog states
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAction, setCreditAction] = useState<CreditAction>('add');

  // Config dialog
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Pagination for pending approvals
  const [currentPendingPage, setCurrentPendingPage] = useState(1);

  const openCreditDialog = (user: User, action: CreditAction) => {
    setSelectedUser(user);
    setCreditAction(action);
    setCreditDialogOpen(true);
  };

  const handleCreditSubmit = async (creditAmount: string, creditReason: string) => {
    await handleCreditAction(selectedUser, creditAction, creditAmount, creditReason, () => {
      setCreditDialogOpen(false);
    });
  };

  const handleConfigSubmit = async (startingCredits: string) => {
    await handleUpdateConfig(startingCredits, () => {
      setConfigDialogOpen(false);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1">{t('manageUsers')}</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* App Config Card */}
      <AppConfigCard
        config={config}
        onEdit={() => setConfigDialogOpen(true)}
        t={t}
      />

      {/* Pending Approvals */}
      <PendingApprovals
        users={users}
        currentPage={currentPendingPage}
        setCurrentPage={setCurrentPendingPage}
        itemsPerPage={ITEMS_PER_PAGE}
        onApprove={handleApproval}
        t={t}
      />

      {/* Users Management */}
      <UsersList
        users={users}
        itemsPerPage={ITEMS_PER_PAGE}
        onOpenCreditDialog={openCreditDialog}
        onBlockToggle={handleBlockToggle}
        t={t}
      />

      {/* Credit Dialog */}
      <CreditDialog
        open={creditDialogOpen}
        onOpenChange={setCreditDialogOpen}
        selectedUser={selectedUser}
        creditAction={creditAction}
        onSubmit={handleCreditSubmit}
        t={t}
        tCommon={tCommon}
      />

      {/* Config Dialog */}
      <ConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        currentStartingCredits={config?.startingCredits ?? 0}
        onSubmit={handleConfigSubmit}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}
