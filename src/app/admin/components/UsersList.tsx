import { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UserRow } from './UserRow';
import { PaginationControls } from './PaginationControls';
import type { User, CreditAction } from '../types';

interface UsersListProps {
  users: User[];
  itemsPerPage: number;
  onOpenCreditDialog: (user: User, action: CreditAction) => void;
  onBlockToggle: (user: User) => void;
  t: (key: string) => string;
}

export const UsersList = ({
  users,
  itemsPerPage,
  onOpenCreditDialog,
  onBlockToggle,
  t,
}: UsersListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
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
        {paginatedUsers.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isExpanded={expandedUser === user.id}
            onToggle={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
            onOpenCreditDialog={onOpenCreditDialog}
            onBlockToggle={onBlockToggle}
            t={t}
          />
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('noUsersFound')}
          </div>
        )}

        <PaginationControls
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          itemName="users"
          t={t}
        />
      </div>
    </div>
  );
};
