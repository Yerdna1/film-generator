'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Square } from 'lucide-react';
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
  isProcessing?: boolean;
  onStop?: () => void;
}

export function Pagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
  variant = 'full',
  isProcessing = false,
  onStop,
}: PaginationProps) {
  const t = useTranslations();

  // Show stop button even if only 1 page when processing
  if (totalPages <= 1 && !isProcessing) return null;

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center glass rounded-xl p-4 gap-4">
        {/* Stop button when processing */}
        {isProcessing && onStop && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-3 bg-red-600 hover:bg-red-500"
            onClick={onStop}
          >
            <Square className="w-3 h-3 mr-1 fill-current" />
            {t('common.stop')}
          </Button>
        )}
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
    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between glass rounded-xl p-4 gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        {/* Stop button when processing */}
        {isProcessing && onStop && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-3 bg-red-600 hover:bg-red-500 shrink-0"
            onClick={onStop}
          >
            <Square className="w-3 h-3 mr-1 fill-current" />
            {t('common.stop')}
          </Button>
        )}
        <span className="text-center sm:text-left">
          {t('common.page')} {currentPage} / {totalPages}
        </span>
        <span className="hidden sm:inline text-white/30">|</span>
        <span className="hidden sm:inline">
          {t('steps.videos.scenesOnPage', {
            start: startIndex + 1,
            end: Math.min(endIndex, totalItems),
            total: totalItems
          })}
        </span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto max-w-full">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 hover:bg-white/5 shrink-0"
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
                className="h-8 w-8 border-white/10 hover:bg-white/5 shrink-0"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.previousPage')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Page Numbers - conservative 5 page window */}
        <div className="flex items-center gap-0.5 mx-2">
          {(() => {
            // Use a conservative 5-page window that works well on all screen sizes
            const windowSize = 5;
            let pages: number[] = [];

            if (totalPages <= windowSize) {
              // Show all pages
              pages = Array.from({ length: totalPages }, (_, i) => i + 1);
            } else {
              // Sliding window for many pages
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
                className={`h-9 w-9 text-sm font-medium shrink-0 ${
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
                className="h-8 w-8 border-white/10 hover:bg-white/5 shrink-0"
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
                className="h-8 w-8 border-white/10 hover:bg-white/5 shrink-0"
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
