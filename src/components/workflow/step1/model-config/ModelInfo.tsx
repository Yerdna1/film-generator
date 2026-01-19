import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelInfoProps {
  name?: string;
  cost?: number;
  credits?: number;
  description?: string;
  details?: string;
  className?: string;
}

export function ModelInfo({ name, cost, credits, description, details, className }: ModelInfoProps) {
  if (!name && !cost && !credits && !description) return null;

  return (
    <div className={cn(
      "flex items-start gap-2 p-3 bg-muted/30 rounded-lg text-xs overflow-hidden",
      className
    )}>
      <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="space-y-1 min-w-0 flex-1">
        {name && (
          <div className="font-medium text-sm">{name}</div>
        )}
        {(cost !== undefined || credits !== undefined) && (
          <div className="text-muted-foreground">
            {credits && `${credits} credits`}
            {cost !== undefined && ` ($${cost.toFixed(2)})`}
          </div>
        )}
        {description && (
          <div className="text-muted-foreground break-words">{description}</div>
        )}
        {details && (
          <div className="text-muted-foreground text-[11px] break-words">{details}</div>
        )}
      </div>
    </div>
  );
}