import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  itemName: string;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
  variant?: 'default' | 'pending';
}

export const PaginationControls = ({
  currentPage,
  setCurrentPage,
  totalItems,
  itemsPerPage,
  itemName,
  t,
  variant = 'default',
}: PaginationControlsProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const borderColor = variant === 'pending' ? 'border-amber-500/20' : 'border-border/50';

  return (
    <div className={`flex items-center justify-between border-t ${borderColor} pt-4 mt-4`}>
      <div className="text-sm text-muted-foreground">
        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} {itemName}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={variant === 'pending' ? 'border-amber-500/20 hover:bg-amber-500/10' : ''}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 text-sm">
          <span className="font-medium">{currentPage}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{totalPages}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={variant === 'pending' ? 'border-amber-500/20 hover:bg-amber-500/10' : ''}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
