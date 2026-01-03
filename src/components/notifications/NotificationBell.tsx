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

  // Translate notification title
  const translateTitle = (title: string): string => {
    const titleMap: Record<string, string> = {
      'Regeneration Request': 'notifications.regenerationRequest.title',
      'Regeneration Request Approved': 'notifications.regenerationRequest.approved',
      'Regeneration Approved': 'notifications.regenerationRequest.finalApproved',
      'Batch Regeneration Approved': 'notifications.regenerationRequest.batchApproved',
      'Regeneration Request Rejected': 'notifications.regenerationRequest.rejected',
      'Regeneration Completed': 'notifications.regenerationRequest.completed',
      'Regeneration Failed': 'notifications.regenerationRequest.failed',
      'Final Approval Required': 'notifications.regenerationRequest.finalApprovalRequired',
      'Selection Ready': 'notifications.regenerationRequest.selectionReady',
    };
    return titleMap[title] ? t(titleMap[title]) : title;
  };

  // Translate notification message
  const translateMessage = (title: string, message: string): string => {
    // Match "Your {type} regeneration request for "{title}" was approved! You can now regenerate it up to {n} times."
    const approvedMatch = message.match(/^Your (\w+) regeneration request for "(.+?)" was approved! You can now regenerate it up to (\d+) times\.$/);
    if (approvedMatch) {
      return t('notifications.regenerationRequest.approvedMessage', {
        type: t(`notifications.types.${approvedMatch[1]}`, { defaultValue: approvedMatch[1] }),
        title: approvedMatch[2],
        maxAttempts: approvedMatch[3]
      });
    }

    // Match "Your selected {type} for "{title}" has been approved and applied!"
    const finalApprovedMatch = message.match(/^Your selected (\w+) for "(.+?)" has been approved and applied!$/);
    if (finalApprovedMatch) {
      return t('notifications.regenerationRequest.finalApprovedMessage', {
        type: t(`notifications.types.${finalApprovedMatch[1]}`, { defaultValue: finalApprovedMatch[1] }),
        title: finalApprovedMatch[2]
      });
    }

    // Match batch approval messages
    const batchMatch = message.match(/^Your batch request for (\d+) (\w+)s? was approved!/);
    if (batchMatch) {
      return t('notifications.regenerationRequest.batchApprovedMessage', {
        count: batchMatch[1],
        type: t(`notifications.types.${batchMatch[2]}`, { defaultValue: batchMatch[2] }),
        maxAttempts: '3' // Default
      });
    }

    // Match "{user} requested to regenerate images for: {scenes}"
    const requestImagesMatch = message.match(/^(.+?) requested to regenerate images for: (.+)$/);
    if (requestImagesMatch) {
      return t('notifications.regenerationRequest.requestedImages', {
        user: requestImagesMatch[1],
        scenes: requestImagesMatch[2]
      });
    }

    // Match "{user} requested to regenerate video for: {scene}"
    const requestVideoMatch = message.match(/^(.+?) requested to regenerate video for: (.+)$/);
    if (requestVideoMatch) {
      return t('notifications.regenerationRequest.requestedVideo', {
        user: requestVideoMatch[1],
        scene: requestVideoMatch[2]
      });
    }

    // Match "{user} selected a regenerated {type} for "{title}". Please review and approve."
    const selectedMatch = message.match(/^(.+?) selected a regenerated (\w+) for "(.+?)"\. Please review and approve\.$/);
    if (selectedMatch) {
      return t('notifications.regenerationRequest.selectedForApproval', {
        user: selectedMatch[1],
        type: t(`notifications.types.${selectedMatch[2]}`, { defaultValue: selectedMatch[2] }),
        title: selectedMatch[3]
      });
    }

    return message;
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
                            {translateTitle(notification.title)}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {translateMessage(notification.title, notification.message)}
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
