'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users,
  CreditCard,
  Settings,
  Plus,
  Minus,
  Ban,
  CheckCircle,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  XCircle,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface UserCredits {
  balance: number;
  totalSpent: number;
  totalEarned: number;
  totalRealCost: number;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  isBlocked: boolean;
  isApproved: boolean;
  costMultiplier: number;
  createdAt: string;
  credits: UserCredits;
  projectCount: number;
  membershipCount: number;
}

interface AppConfig {
  startingCredits: number;
}

export default function AdminPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Dialog states
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAction, setCreditAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');

  // Config dialog
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [startingCreditsInput, setStartingCreditsInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, configRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/app-config'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('failedToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreditAction = async () => {
    if (!selectedUser || !creditAmount) return;

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('invalidNumber'));
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
        setCreditDialogOpen(false);
        setCreditAmount('');
        setCreditReason('');
        fetchData();
        // Dispatch event to update credits display in header/dashboard
        window.dispatchEvent(new CustomEvent('credits-updated'));
      } else {
        console.error('Credit action failed:', data);
        toast.error(data.details || data.error || t('failedToUpdateCredits'));
      }
    } catch (error) {
      console.error('Credit action error:', error);
      toast.error(t('failedToUpdateCredits'));
    }
  };

  const handleBlockToggle = async (user: User) => {
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
      toast.error(t('failedToUpdateUser'));
    }
  };

  const handleApproval = async (user: User, approve: boolean) => {
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
      toast.error(t('failedToUpdateApproval'));
    }
  };

  const handleUpdateConfig = async () => {
    const credits = parseInt(startingCreditsInput);
    if (isNaN(credits) || credits < 0) {
      toast.error(t('invalidNumber'));
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
        setConfigDialogOpen(false);
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error(t('failedToUpdateConfig'));
    }
  };

  const openCreditDialog = (user: User, action: 'add' | 'deduct' | 'set') => {
    setSelectedUser(user);
    setCreditAction(action);
    setCreditAmount('');
    setCreditReason('');
    setCreditDialogOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

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
      <div className="glass-strong rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Settings className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('appConfiguration')}</h2>
              <p className="text-sm text-muted-foreground">{t('globalSettings')}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 bg-background/50 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('startingCredits')}</p>
                <p className="text-2xl font-bold">{config?.startingCredits ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('creditsForNewUsers')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartingCreditsInput(String(config?.startingCredits ?? 0));
                  setConfigDialogOpen(true);
                }}
              >
                {t('edit')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      {users.filter(u => !u.isApproved && u.role !== 'admin').length > 0 && (
        <div className="glass-strong rounded-xl p-6 border-2 border-amber-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-amber-500">
                {t('pendingApprovals')} ({users.filter(u => !u.isApproved && u.role !== 'admin').length})
              </h2>
              <p className="text-sm text-muted-foreground">{t('newUsersWaiting')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {users.filter(u => !u.isApproved && u.role !== 'admin').map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user.name || t('noName')}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Registered {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApproval(user, true)}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    {t('actions.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => handleApproval(user, false)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {t('actions.reject')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Management */}
      <div className="glass-strong rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Users className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('users')} ({users.length})</h2>
              <p className="text-sm text-muted-foreground">{t('manageUserAccounts')}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('searchUsers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                user.isBlocked
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-border/50 bg-background/50'
              }`}
            >
              {/* User Row */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50"
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name || t('noName')}</span>
                      {!user.isApproved && user.role !== 'admin' && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-500 rounded-full">
                          {t('status.pending')}
                        </span>
                      )}
                      {user.isApproved && user.role !== 'admin' && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-500 rounded-full">
                          {t('status.approved')}
                        </span>
                      )}
                      {user.isBlocked && (
                        <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-500 rounded-full">
                          {t('status.blocked')}
                        </span>
                      )}
                      {user.role === 'admin' && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-500 rounded-full">
                          {t('status.admin')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-medium">{user.credits.balance.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">credits</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="font-medium">{user.projectCount}</p>
                    <p className="text-xs text-muted-foreground">projects</p>
                  </div>
                  {expandedUser === user.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedUser === user.id && (
                <div className="px-4 pb-4 pt-2 border-t border-border/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('fields.balance')}</p>
                      <p className="font-medium">{user.credits.balance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('fields.totalSpent')}</p>
                      <p className="font-medium">{user.credits.totalSpent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('fields.totalEarned')}</p>
                      <p className="font-medium">{user.credits.totalEarned.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('fields.realCost')}</p>
                      <p className="font-medium">${user.credits.totalRealCost.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('fields.projects')}</p>
                      <p className="font-medium">{user.projectCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('fields.memberships')}</p>
                      <p className="font-medium">{user.membershipCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('fields.costMultiplier')}</p>
                      <p className="font-medium">{user.costMultiplier}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('fields.joined')}</p>
                      <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600/30 hover:bg-green-600/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreditDialog(user, 'add');
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t('addCredits')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-600/30 hover:bg-orange-600/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreditDialog(user, 'deduct');
                      }}
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      {t('deductCredits')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreditDialog(user, 'set');
                      }}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      {t('setCredits')}
                    </Button>
                    {/* Don't show block button for admin user */}
                    {user.email !== 'andrej.galad@gmail.com' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={user.isBlocked
                          ? "text-green-600 border-green-600/30 hover:bg-green-600/10"
                          : "text-red-600 border-red-600/30 hover:bg-red-600/10"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlockToggle(user);
                        }}
                      >
                        {user.isBlocked ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('actions.unblock')}
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-1" />
                            {t('actions.block')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t('noUsersFound')}
            </div>
          )}
        </div>
      </div>

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditAction === 'add' && t('addCredits')}
              {creditAction === 'deduct' && t('deductCredits')}
              {creditAction === 'set' && t('setCredits')}
            </DialogTitle>
            <DialogDescription>
              {creditAction === 'add' && `${t('addCredits')} ${selectedUser?.name || selectedUser?.email}`}
              {creditAction === 'deduct' && `${t('deductCredits')} ${selectedUser?.name || selectedUser?.email}`}
              {creditAction === 'set' && `${t('setCredits')} ${selectedUser?.name || selectedUser?.email}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">
                {creditAction === 'set' ? t('newBalance') : t('amount')}
              </label>
              <Input
                type="number"
                placeholder={t('enterAmount')}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="0"
              />
              {selectedUser && creditAction !== 'set' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('currentBalance')} {selectedUser.credits.balance.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">{t('reasonOptional')}</label>
              <Input
                placeholder={t('reasonPlaceholder')}
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCreditAction}>
              {creditAction === 'add' && t('addCredits')}
              {creditAction === 'deduct' && t('deductCredits')}
              {creditAction === 'set' && t('setCredits')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editStartingCredits')}</DialogTitle>
            <DialogDescription>
              {t('startingCreditsDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium">{t('startingCredits')}</label>
            <Input
              type="number"
              placeholder="0"
              value={startingCreditsInput}
              onChange={(e) => setStartingCreditsInput(e.target.value)}
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('purchaseCreditsNote')}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleUpdateConfig}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
