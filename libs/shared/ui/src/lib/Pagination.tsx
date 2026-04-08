'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComponentSize } from './types';
import { cn } from './utils/cn';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  ariaLabel?: string;
  size?: ComponentSize;
}

const navButtonSizeStyles: Record<ComponentSize, string> = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

const pageButtonSizeStyles: Record<ComponentSize, string> = {
  sm: 'h-6 min-w-6 px-1.5 text-xs',
  md: 'h-8 min-w-8 px-2 text-sm',
  lg: 'h-10 min-w-10 px-3 text-base',
};

const iconSizeStyles: Record<ComponentSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  ariaLabel = 'Pagination',
  size = 'md',
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

  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn('flex items-center gap-1', className)}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isPrevDisabled}
        aria-label='Previous page'
        aria-disabled={isPrevDisabled ? 'true' : undefined}
        className={cn(
          'rounded-md text-text-secondary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          navButtonSizeStyles[size]
        )}
      >
        <ChevronLeft className={iconSizeStyles[size]} />
      </button>
      {getPages().map((page, i) =>
        page === '...' ? (
          <span
            key={`dots-${i}`}
            className={cn(
              'px-1 text-text-tertiary',
              size === 'sm'
                ? 'text-xs'
                : size === 'lg'
                  ? 'text-base'
                  : 'text-sm'
            )}
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-label={
              page === currentPage ? `Page ${page}` : `Go to page ${page}`
            }
            aria-current={page === currentPage ? 'page' : undefined}
            className={cn(
              'rounded-md transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              pageButtonSizeStyles[size],
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
        disabled={isNextDisabled}
        aria-label='Next page'
        aria-disabled={isNextDisabled ? 'true' : undefined}
        className={cn(
          'rounded-md text-text-secondary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          navButtonSizeStyles[size]
        )}
      >
        <ChevronRight className={iconSizeStyles[size]} />
      </button>
    </nav>
  );
}
