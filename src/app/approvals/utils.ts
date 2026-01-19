import type { LogEntry } from './types';

export const formatDate = (dateString: string, t: (key: string, params?: Record<string, string | number | Date>) => string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return t('justNow');
  if (diffHours < 24) return t('hoursAgo', { hours: diffHours });
  if (diffDays < 7) return t('daysAgo', { days: diffDays });
  return date.toLocaleDateString();
};

export const formatLogTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const getLogIcon = (type: string) => {
  switch (type) {
    case 'success':
      return 'CheckCircle';
    case 'error':
      return 'AlertCircle';
    case 'cost':
      return 'DollarSign';
    default:
      return 'Info';
  }
};
