import { ChevronDown, ChevronUp, Plus, Minus, DollarSign, Ban, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User, CreditAction } from '../types';

interface UserRowProps {
  user: User;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenCreditDialog: (user: User, action: CreditAction) => void;
  onBlockToggle: (user: User) => void;
  t: (key: string) => string;
}

export const UserRow = ({
  user,
  isExpanded,
  onToggle,
  onOpenCreditDialog,
  onBlockToggle,
  t,
}: UserRowProps) => {
  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${user.isBlocked
        ? 'border-red-500/30 bg-red-500/5'
        : 'border-border/50 bg-background/50'
        }`}
    >
      {/* User Row */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50"
        onClick={onToggle}
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
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
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
                onOpenCreditDialog(user, 'add');
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
                onOpenCreditDialog(user, 'deduct');
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
                onOpenCreditDialog(user, 'set');
              }}
            >
              <DollarSign className="w-4 h-4 mr-1" />
              {t('setCredits')}
            </Button>
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
                  onBlockToggle(user);
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
  );
};
