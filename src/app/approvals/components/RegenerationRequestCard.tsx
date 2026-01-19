import { motion } from 'framer-motion';
import NextImage from 'next/image';
import { ImageIcon, Clock, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { RegenerationRequest } from '@/types/collaboration';
import { formatDate } from '../utils';

interface RegenerationRequestCardProps {
  request: RegenerationRequest & { project?: { id: string; name: string } };
  processingIds: Set<string>;
  onAction: (request: RegenerationRequest, approved: boolean) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export const RegenerationRequestCard = ({ request, processingIds, onAction, t }: RegenerationRequestCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg space-y-2"
    >
      <div className="flex items-start gap-2">
        <div className="relative w-12 h-8 rounded overflow-hidden bg-black/30 flex-shrink-0">
          {request.scene?.imageUrl ? (
            <NextImage
              src={request.scene.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <ImageIcon className="w-4 h-4 m-auto text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{request.targetName}</p>
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
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-7 text-xs"
          onClick={() => onAction(request, false)}
          disabled={processingIds.has(request.id)}
        >
          <X className="w-3 h-3 mr-1" />
          {t('reject')}
        </Button>
        <Button
          size="sm"
          className="flex-1 h-7 text-xs bg-cyan-600 hover:bg-cyan-500"
          onClick={() => onAction(request, true)}
          disabled={processingIds.has(request.id)}
        >
          {processingIds.has(request.id) ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Check className="w-3 h-3 mr-1" />
              {t('approve')}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};
