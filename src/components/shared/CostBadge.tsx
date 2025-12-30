'use client';

import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { formatCostCompact } from '@/lib/services/real-costs';
import { cn } from '@/lib/utils';

interface CostBadgeProps {
  cost: number;
  credits?: number;
  showCredits?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'inline';
  className?: string;
}

export function CostBadge({
  cost,
  credits,
  showCredits = false,
  size = 'sm',
  variant = 'default',
  className,
}: CostBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  if (variant === 'inline') {
    return (
      <span className={cn('text-green-400 font-medium', className)}>
        {formatCostCompact(cost)}
        {showCredits && credits !== undefined && (
          <span className="text-muted-foreground ml-1">({credits} cr)</span>
        )}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-green-500/30 text-green-400 gap-0.5',
        sizeClasses[size],
        className
      )}
    >
      <DollarSign className="w-3 h-3" />
      {formatCostCompact(cost)}
      {showCredits && credits !== undefined && (
        <span className="text-muted-foreground ml-1">• {credits} cr</span>
      )}
    </Badge>
  );
}

interface CostEstimateProps {
  label: string;
  cost: number;
  quantity?: number;
  provider?: string;
  className?: string;
}

export function CostEstimate({
  label,
  cost,
  quantity = 1,
  provider,
  className,
}: CostEstimateProps) {
  const totalCost = cost * quantity;

  return (
    <div className={cn('flex items-center justify-between text-sm', className)}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{label}</span>
        {quantity > 1 && (
          <span className="text-xs text-muted-foreground">×{quantity}</span>
        )}
        {provider && (
          <span className="text-xs text-purple-400">({provider})</span>
        )}
      </div>
      <span className="text-green-400 font-medium">{formatCostCompact(totalCost)}</span>
    </div>
  );
}

interface CostBreakdownProps {
  items: Array<{
    label: string;
    cost: number;
    quantity?: number;
  }>;
  className?: string;
}

export function CostBreakdown({ items, className }: CostBreakdownProps) {
  const totalCost = items.reduce((sum, item) => sum + item.cost * (item.quantity || 1), 0);

  return (
    <div className={cn('space-y-2 text-sm', className)}>
      {items.map((item, index) => (
        <CostEstimate
          key={index}
          label={item.label}
          cost={item.cost}
          quantity={item.quantity}
        />
      ))}
      <div className="border-t border-white/10 pt-2 flex items-center justify-between font-medium">
        <span>Total</span>
        <span className="text-green-400">{formatCostCompact(totalCost)}</span>
      </div>
    </div>
  );
}
