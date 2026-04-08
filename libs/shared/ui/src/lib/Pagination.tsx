'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DISABLED } from './styles/formStyles';
import { cn } from './utils/cn';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <nav className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={cn(
          'p-1.5 rounded-md text-text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer',
          DISABLED
        )}
      >
        <ChevronLeft className='h-4 w-4' />
      </button>
      {getPages().map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} className='px-1 text-text-tertiary text-sm'>
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'h-8 min-w-8 px-2 text-sm rounded-md transition-colors cursor-pointer',
              page === currentPage
                ? 'bg-brand-600 text-white font-medium'
                : 'text-text-secondary hover:bg-surface-tertiary'
            )}
          >
            {page}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={cn(
          'p-1.5 rounded-md text-text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer',
          DISABLED
        )}
      >
        <ChevronRight className='h-4 w-4' />
      </button>
    </nav>
  );
}
