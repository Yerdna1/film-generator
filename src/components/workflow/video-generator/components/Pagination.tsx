'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  variant?: 'full' | 'compact';
}

export function Pagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
  variant = 'full',
}: PaginationProps) {
  const t = useTranslations();

  if (totalPages <= 1) return null;

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center glass rounded-xl p-4">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-white/10 hover:bg-white/5"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-white/10 hover:bg-white/5"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="px-4 text-sm">
            {t('common.page')} {currentPage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-white/10 hover:bg-white/5"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-white/10 hover:bg-white/5"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between glass rounded-xl p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {t('common.page')} {currentPage} / {totalPages}
        </span>
        <span className="text-white/30">|</span>
        <span>
          {t('steps.videos.scenesOnPage', {
            start: startIndex + 1,
            end: Math.min(endIndex, totalItems),
            total: totalItems
          })}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 hover:bg-white/5"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.firstPage')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 hover:bg-white/5"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.previousPage')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Page Numbers - show all pages up to 20, otherwise sliding window */}
        <div className="flex items-center gap-0.5 mx-2">
          {(() => {
            const maxVisible = 20;
            let pages: number[] = [];

            if (totalPages <= maxVisible) {
              // Show all pages
              pages = Array.from({ length: totalPages }, (_, i) => i + 1);
            } else {
              // Sliding window for many pages
              const windowSize = 9;
              const halfWindow = Math.floor(windowSize / 2);

              if (currentPage <= halfWindow + 1) {
                pages = Array.from({ length: windowSize }, (_, i) => i + 1);
              } else if (currentPage >= totalPages - halfWindow) {
                pages = Array.from({ length: windowSize }, (_, i) => totalPages - windowSize + 1 + i);
              } else {
                pages = Array.from({ length: windowSize }, (_, i) => currentPage - halfWindow + i);
              }
            }

            return pages.map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="icon"
                className={`h-9 w-9 text-sm font-medium ${
                  currentPage === pageNum
                    ? 'bg-orange-600 hover:bg-orange-500 border-0'
                    : 'border-white/10 hover:bg-white/5'
                }`}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            ));
          })()}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 hover:bg-white/5"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.nextPage')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 hover:bg-white/5"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.lastPage')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
