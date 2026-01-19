import { motion } from 'framer-motion';
import { Trash2, ImageIcon, Video, User, Clock, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DeletionRequest } from '@/types/collaboration';
import { formatDate } from '../utils';

interface DeletionRequestCardProps {
  request: DeletionRequest & { project?: { id: string; name: string } };
  processingIds: Set<string>;
  onAction: (request: DeletionRequest, action: 'approved' | 'rejected') => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export const DeletionRequestCard = ({ request, processingIds, onAction, t }: DeletionRequestCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center">
          {request.targetType === 'scene' && <ImageIcon className="w-4 h-4 text-orange-400" />}
          {request.targetType === 'character' && <User className="w-4 h-4 text-orange-400" />}
          {request.targetType === 'video' && <Video className="w-4 h-4 text-orange-400" />}
          {request.targetType === 'project' && <Trash2 className="w-4 h-4 text-orange-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {t('delete')} {request.targetType}: {request.targetName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {request.project?.name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Avatar className="w-4 h-4">
          <AvatarImage src={request.requester?.image || undefined} />
          <AvatarFallback className="text-[8px]">
            {request.requester?.name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{request.requester?.name}</span>
        <span>·</span>
        <Clock className="w-3 h-3" />
        <span>{formatDate(request.createdAt, t)}</span>
      </div>
      {request.reason && (
        <p className="text-xs text-muted-foreground bg-white/5 rounded p-2">
          "{request.reason}"
        </p>
      )}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-7 text-xs"
          onClick={() => onAction(request, 'rejected')}
          disabled={processingIds.has(request.id)}
        >
          <X className="w-3 h-3 mr-1" />
          {t('reject')}
        </Button>
        <Button
          size="sm"
          className="flex-1 h-7 text-xs bg-red-600 hover:bg-red-500"
          onClick={() => onAction(request, 'approved')}
          disabled={processingIds.has(request.id)}
        >
          {processingIds.has(request.id) ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Check className="w-3 h-3 mr-1" />
              {t('delete')}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};
