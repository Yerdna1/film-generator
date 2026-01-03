'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  X,
  Users,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification, NotificationType } from '@/types/collaboration';
import { useNotifications } from '@/hooks';

const notificationIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  deletion_request: Trash2,
  invitation: UserPlus,
  invitation_accepted: Users,
  role_change: Users,
  request_approved: CheckCircle2,
  request_rejected: XCircle,
  member_joined: UserPlus,
  member_removed: Users,
  regeneration_request: RefreshCw,
  regeneration_completed: CheckCircle2,
  regeneration_failed: XCircle,
};

const notificationColors: Record<NotificationType, string> = {
  deletion_request: 'text-orange-400',
  invitation: 'text-purple-400',
  invitation_accepted: 'text-green-400',
  role_change: 'text-cyan-400',
  request_approved: 'text-green-400',
  request_rejected: 'text-red-400',
  member_joined: 'text-green-400',
  member_removed: 'text-red-400',
  regeneration_request: 'text-cyan-400',
  regeneration_completed: 'text-green-400',
  regeneration_failed: 'text-red-400',
};

export function NotificationBell() {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use centralized SWR hook for notifications
  const {
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh
  } = useNotifications();

  const markAsRead = async (id: string) => {
    try {
      await handleMarkAsRead(id);
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const markAllAsRead = async () => {
    setIsLoading(true);
    try {
      await handleMarkAllAsRead();
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.time.justNow');
    if (diffMins < 60) return t('common.time.minutesAgo', { minutes: diffMins });
    if (diffHours < 24) return t('common.time.hoursAgo', { hours: diffHours });
    if (diffDays < 7) return t('common.time.daysAgo', { days: diffDays });
    return date.toLocaleDateString();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 glass-strong border-white/10"
        align="end"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold">{t('notifications.title')}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isLoading}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="w-3 h-3 mr-1" />
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('notifications.noNotifications')}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type as NotificationType] || AlertCircle;
                const iconColor = notificationColors[notification.type as NotificationType] || 'text-gray-400';

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-white/5 ${
                      !notification.read ? 'bg-purple-500/5' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
