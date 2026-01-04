'use client';

import { motion } from 'framer-motion';
import { Clock, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslations } from 'next-intl';

interface RequestCardProps {
  id: string;
  colorClass: string; // e.g., 'orange', 'cyan', 'purple'
  icon: React.ReactNode;
  title: React.ReactNode;
  requesterName?: string | null;
  requesterImage?: string | null;
  createdAt: string;
  reason?: string | null;
  isProcessing: boolean;
  showNoteInput: boolean;
  reviewNote: string;
  formatDate: (date: string) => string;
  onShowNote: () => void;
  onNoteChange: (note: string) => void;
  actions: React.ReactNode;
  children?: React.ReactNode;
}

export function RequestCard({
  id,
  colorClass,
  icon,
  title,
  requesterName,
  requesterImage,
  createdAt,
  reason,
  isProcessing,
  showNoteInput,
  reviewNote,
  formatDate,
  onShowNote,
  onNoteChange,
  actions,
  children,
}: RequestCardProps) {
  const t = useTranslations();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`p-4 bg-${colorClass}-500/5 border border-${colorClass}-500/20 rounded-lg space-y-3`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg bg-${colorClass}-500/20 flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {title}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Avatar className="w-4 h-4">
              <AvatarImage src={requesterImage || undefined} />
              <AvatarFallback className="text-[8px]">
                {requesterName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <span>{requesterName || t('common.unknown')}</span>
            <span>·</span>
            <Clock className="w-3 h-3" />
            <span>{formatDate(createdAt)}</span>
          </div>

          {reason && (
            <div className="mt-2 p-2 bg-white/5 rounded text-sm text-muted-foreground">
              "{reason}"
            </div>
          )}

          {children}
        </div>
      </div>

      {/* Review note input */}
      {showNoteInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pt-2"
        >
          <Textarea
            value={reviewNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder={t('collaborationModals.approvalPanel.addNotePlaceholder')}
            className="bg-white/5 border-white/10 min-h-[60px] text-sm"
          />
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {!showNoteInput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowNote}
            className="text-muted-foreground"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            {t('collaborationModals.approvalPanel.addNote')}
          </Button>
        )}

        <div className="flex-1" />

        {actions}
      </div>
    </motion.div>
  );
}
