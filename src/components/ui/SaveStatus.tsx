'use client';

import { Loader2, CheckCircle2, AlertCircle, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveStatusProps {
  status: SaveStatus;
  className?: string;
  showText?: boolean;
  'aria-live'?: 'polite' | 'off';
  'aria-label'?: string;
}

const STATUS_CONFIG = {
  idle: {
    icon: null,
    text: '',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    ariaLabel: 'No changes',
  },
  saving: {
    icon: Loader2,
    text: 'Saving...',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    ariaLabel: 'Saving changes',
  },
  saved: {
    icon: CheckCircle2,
    text: 'Saved',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    ariaLabel: 'Changes saved',
  },
  error: {
    icon: AlertCircle,
    text: 'Save failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    ariaLabel: 'Failed to save changes',
  },
};

export function SaveStatus({
  status,
  className,
  showText = true,
  'aria-live': ariaLive = 'polite',
  'aria-label': ariaLabel,
}: SaveStatusProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Use custom aria-label if provided, otherwise use config
  const label = ariaLabel || config.ariaLabel;

  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
        config.bgColor,
        config.borderColor,
        'border',
        className
      )}
      aria-live={ariaLive}
      aria-label={label}
      role="status"
    >
      {Icon && (
        <Icon
          className={cn(
            'w-4 h-4',
            status === 'saving' && 'animate-spin',
            config.color
          )}
          aria-hidden="true"
        />
      )}
      {showText && (
        <span className={config.color}>{config.text}</span>
      )}
    </div>
  );
}

// Compact variant - icon only, smaller size
export interface SaveStatusCompactProps {
  status: SaveStatus;
  className?: string;
  'aria-label'?: string;
}

export function SaveStatusCompact({
  status,
  className,
  'aria-label': ariaLabel,
}: SaveStatusCompactProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const label = ariaLabel || config.ariaLabel;

  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-full',
        config.bgColor,
        config.borderColor,
        'border',
        className
      )}
      aria-label={label}
      role="status"
    >
      {Icon && (
        <Icon
          className={cn(
            'w-3 h-3',
            status === 'saving' && 'animate-spin',
            config.color
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Inline text variant - just text, no background
export interface SaveStatusTextProps {
  status: SaveStatus;
  className?: string;
  'aria-label'?: string;
}

export function SaveStatusText({
  status,
  className,
  'aria-label': ariaLabel,
}: SaveStatusTextProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const label = ariaLabel || config.ariaLabel;

  if (status === 'idle') {
    return null;
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', config.color, className)}
      aria-label={label}
      role="status"
    >
      {Icon && (
        <Icon
          className={cn(
            'w-3.5 h-3.5',
            status === 'saving' && 'animate-spin'
          )}
          aria-hidden="true"
        />
      )}
      {config.text}
    </span>
  );
}
