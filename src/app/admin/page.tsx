'use client';

import { useState, useEffect } from 'react';
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
      toast.error('Failed to load admin data');
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
      toast.error('Please enter a valid positive number');
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
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to update credits');
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
      toast.error('Failed to update user');
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
      toast.error('Failed to update user approval');
    }
  };

  const handleUpdateConfig = async () => {
    const credits = parseInt(startingCreditsInput);
    if (isNaN(credits) || credits < 0) {
      toast.error('Please enter a valid non-negative number');
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
      toast.error('Failed to update config');
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
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage users, credits, and app settings</p>
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
              <h2 className="text-lg font-semibold">App Configuration</h2>
              <p className="text-sm text-muted-foreground">Global settings for the application</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 bg-background/50 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Starting Credits</p>
                <p className="text-2xl font-bold">{config?.startingCredits ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Credits for new users</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartingCreditsInput(String(config?.startingCredits ?? 0));
                  setConfigDialogOpen(true);
                }}
              >
                Edit
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
                Pending Approvals ({users.filter(u => !u.isApproved && u.role !== 'admin').length})
              </h2>
              <p className="text-sm text-muted-foreground">New users waiting for your approval</p>
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
                    <p className="font-medium">{user.name || 'No name'}</p>
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
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => handleApproval(user, false)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
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
              <h2 className="text-lg font-semibold">Users ({users.length})</h2>
              <p className="text-sm text-muted-foreground">Manage user accounts and credits</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
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
                      <span className="font-medium">{user.name || 'No name'}</span>
                      {!user.isApproved && user.role !== 'admin' && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-500 rounded-full">
                          Pending
                        </span>
                      )}
                      {user.isApproved && user.role !== 'admin' && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-500 rounded-full">
                          Approved
                        </span>
                      )}
                      {user.isBlocked && (
                        <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-500 rounded-full">
                          Blocked
                        </span>
                      )}
                      {user.role === 'admin' && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-500 rounded-full">
                          Admin
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
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="font-medium">{user.credits.balance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                      <p className="font-medium">{user.credits.totalSpent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Earned</p>
                      <p className="font-medium">{user.credits.totalEarned.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Real Cost</p>
                      <p className="font-medium">${user.credits.totalRealCost.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Projects</p>
                      <p className="font-medium">{user.projectCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Memberships</p>
                      <p className="font-medium">{user.membershipCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cost Multiplier</p>
                      <p className="font-medium">{user.costMultiplier}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
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
                      Add Credits
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
                      Deduct Credits
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
                      Set Credits
                    </Button>
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
                          Unblock
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4 mr-1" />
                          Block
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditAction === 'add' && 'Add Credits'}
              {creditAction === 'deduct' && 'Deduct Credits'}
              {creditAction === 'set' && 'Set Credits'}
            </DialogTitle>
            <DialogDescription>
              {creditAction === 'add' && `Add credits to ${selectedUser?.name || selectedUser?.email}`}
              {creditAction === 'deduct' && `Deduct credits from ${selectedUser?.name || selectedUser?.email}`}
              {creditAction === 'set' && `Set credit balance for ${selectedUser?.name || selectedUser?.email}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">
                {creditAction === 'set' ? 'New Balance' : 'Amount'}
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="0"
              />
              {selectedUser && creditAction !== 'set' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current balance: {selectedUser.credits.balance.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                placeholder="e.g., Bonus for feedback, Refund, etc."
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreditAction}>
              {creditAction === 'add' && 'Add Credits'}
              {creditAction === 'deduct' && 'Deduct Credits'}
              {creditAction === 'set' && 'Set Credits'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Starting Credits</DialogTitle>
            <DialogDescription>
              Set how many credits new users receive when they sign up.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium">Starting Credits</label>
            <Input
              type="number"
              placeholder="0"
              value={startingCreditsInput}
              onChange={(e) => setStartingCreditsInput(e.target.value)}
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set to 0 to require users to purchase credits before using the app.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateConfig}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
