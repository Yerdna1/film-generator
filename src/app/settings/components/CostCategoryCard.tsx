'use client';

import type { LucideIcon } from 'lucide-react';
import type { ActionCostItem } from '../types';
import { formatPriceCompact, getCurrencySymbol } from '@/lib/utils/currency';

interface CostCategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  costs: ActionCostItem[];
}

export function CostCategoryCard({
  title,
  description,
  icon: Icon,
  iconColor,
  bgColor,
  costs,
}: CostCategoryCardProps) {
  const currencySymbol = getCurrencySymbol();

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-2">
        {costs.map((cost) => (
          <div key={cost.provider} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <div>
              <span className="font-medium capitalize">{cost.provider}</span>
              {cost.description && (
                <p className="text-xs text-muted-foreground">{cost.description}</p>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-green-400">
                {formatPriceCompact(cost.cost)}
              </span>
              <span className="text-sm text-green-400/70">
                {currencySymbol}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
