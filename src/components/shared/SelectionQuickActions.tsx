'use client';

import { useState } from 'react';
import { CheckSquare, XSquare, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCostCompact } from '@/lib/services/real-costs';

export interface SelectionOption {
  label: string;
  count: number;
  onClick: () => void;
  variant?: 'orange' | 'emerald' | 'amber' | 'default';
  disabled?: boolean;
}

export interface SelectionQuickActionsProps {
  // Selection state
  selectedCount: number;
  isDisabled?: boolean;

  // Selection options (Select All, With Images, etc.)
  selectionOptions: SelectionOption[];

  // Clear selection
  onClearSelection: () => void;

  // Primary action (Regenerate/Generate Selected)
  primaryAction?: {
    label: string;
    onClick: () => void;
    costPerItem: number;
    icon?: React.ReactNode;
    confirmThreshold?: number; // Show confirmation if selectedCount > threshold
    confirmTitle?: string;
    confirmDescription?: string;
  };

  // Request approval action (for collaborators)
  onRequestApproval?: () => void;
  requestApprovalLabel?: string;

  // Container styling
  className?: string;
}

const variantClasses: Record<string, string> = {
  orange: 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10',
  emerald: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
  amber: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10',
  default: 'border-white/10 hover:bg-white/5',
};

export function SelectionQuickActions({
  selectedCount,
  isDisabled = false,
  selectionOptions,
  onClearSelection,
  primaryAction,
  onRequestApproval,
  requestApprovalLabel = 'Request Approval',
  className = '',
}: SelectionQuickActionsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handlePrimaryActionClick = () => {
    if (!primaryAction) return;

    const threshold = primaryAction.confirmThreshold ?? 5;
    if (selectedCount > threshold) {
      setShowConfirmDialog(true);
    } else {
      primaryAction.onClick();
    }
  };

  const totalCost = primaryAction ? primaryAction.costPerItem * selectedCount : 0;

  return (
    <>
      <div className={`flex flex-wrap gap-3 justify-center items-center glass rounded-xl p-3 ${className}`}>
        <span className="text-sm text-muted-foreground">Selection:</span>

        {/* Selection Options */}
        {selectionOptions.map((option, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className={variantClasses[option.variant || 'default']}
            onClick={option.onClick}
            disabled={isDisabled || option.disabled}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {option.label} ({option.count})
          </Button>
        ))}

        {/* Selected Items Actions */}
        {selectedCount > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 hover:bg-white/5"
              onClick={onClearSelection}
              disabled={isDisabled}
            >
              <XSquare className="w-4 h-4 mr-2" />
              Clear
            </Button>

            {/* Primary Action Button */}
            {primaryAction && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-0"
                onClick={handlePrimaryActionClick}
                disabled={isDisabled}
              >
                {primaryAction.icon || <RefreshCw className="w-4 h-4 mr-2" />}
                {primaryAction.label} ({selectedCount})
                <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                  ~{formatCostCompact(totalCost)}
                </Badge>
              </Button>
            )}

            {/* Request Approval Button */}
            {onRequestApproval && (
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                onClick={onRequestApproval}
                disabled={isDisabled}
              >
                <Clock className="w-4 h-4 mr-2" />
                {requestApprovalLabel}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {primaryAction && (
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="glass-strong border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {primaryAction.confirmTitle || `${primaryAction.label} ${selectedCount} items?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {primaryAction.confirmDescription ||
                  `You are about to process ${selectedCount} items. This will cost approximately ${formatCostCompact(totalCost)}. Are you sure you want to continue?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-gradient-to-r from-orange-600 to-red-600 text-white border-0"
                onClick={() => {
                  setShowConfirmDialog(false);
                  primaryAction.onClick();
                }}
              >
                Yes, Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
