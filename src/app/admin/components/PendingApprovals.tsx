import { Clock, UserCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaginationControls } from './PaginationControls';
import type { User } from '../types';

interface PendingApprovalsProps {
  users: User[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  onApprove: (user: User, approve: boolean) => void;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
}

export const PendingApprovals = ({
  users,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  onApprove,
  t,
}: PendingApprovalsProps) => {
  const pendingUsers = users.filter(u => !u.isApproved && u.role !== 'admin' && !u.isBlocked);

  if (pendingUsers.length === 0) return null;

  const paginatedPendingUsers = pendingUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="glass-strong rounded-xl p-6 border-2 border-amber-500/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-amber-500">
            {t('pendingApprovals')} ({pendingUsers.length})
          </h2>
          <p className="text-sm text-muted-foreground">{t('newUsersWaiting')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {paginatedPendingUsers.map(user => (
          <div
            key={user.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg"
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
                onClick={() => onApprove(user, true)}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {t('actions.approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                onClick={() => onApprove(user, false)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                {t('actions.reject')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <PaginationControls
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={pendingUsers.length}
        itemsPerPage={itemsPerPage}
        itemName="pending"
        t={t}
      />
    </div>
  );
};
