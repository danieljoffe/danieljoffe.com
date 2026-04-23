import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DISABLED,
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import { cn } from '@/lib/cn';

interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  /** Return the href for a given 1-indexed page number. */
  hrefFor: (page: number) => string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Build the page-number display array with ellipses.
 *
 * Algorithm mirrors `libs/shared/ui/src/lib/Pagination.tsx` so the page-number
 * rendering stays visually consistent with the existing client-side
 * Pagination component.
 */
function getPages(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
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
}

const navItemBase =
  'rounded-md p-1.5 text-text-secondary hover:bg-surface-tertiary transition-colors';
const pageItemBase = 'rounded-md h-8 min-w-8 px-2 text-sm transition-colors';

/**
 * Server-rendered page-number pagination using real `<Link>` elements so
 * search engines can crawl paginated routes and Next can prefetch them.
 *
 * Use `hrefFor` to build the URL for each page (e.g.
 * `page => (page === 1 ? '/blog' : \`/blog/page/\${page}\`)`).
 *
 * Disabled states (page 1 / last page / current page) render non-interactive
 * `<span>` elements rather than links so assistive tech doesn't announce
 * them as active destinations.
 */
export function ListPagination({
  currentPage,
  totalPages,
  hrefFor,
  ariaLabel = 'Pagination',
  className,
}: ListPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPages(currentPage, totalPages);
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {isPrevDisabled ? (
        <span
          aria-hidden='true'
          className={cn(navItemBase, DISABLED, 'opacity-50 cursor-not-allowed')}
        >
          <ChevronLeft className='h-4 w-4' />
        </span>
      ) : (
        <Link
          href={hrefFor(currentPage - 1)}
          aria-label='Previous page'
          className={cn(navItemBase, FOCUS_RING, FOCUS_RING_OFFSET)}
        >
          <ChevronLeft className='h-4 w-4' />
        </Link>
      )}

      {pages.map((page, i) =>
        page === '...' ? (
          <span
            key={`dots-${i}`}
            aria-hidden='true'
            className='px-1 text-sm text-text-tertiary'
          >
            ...
          </span>
        ) : page === currentPage ? (
          <span
            key={page}
            aria-current='page'
            className={cn(
              pageItemBase,
              'bg-brand-600 text-white font-medium inline-flex items-center justify-center'
            )}
          >
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={hrefFor(page)}
            aria-label={`Go to page ${page}`}
            className={cn(
              pageItemBase,
              'text-text-secondary hover:bg-surface-tertiary inline-flex items-center justify-center',
              FOCUS_RING,
              FOCUS_RING_OFFSET
            )}
          >
            {page}
          </Link>
        )
      )}

      {isNextDisabled ? (
        <span
          aria-hidden='true'
          className={cn(navItemBase, DISABLED, 'opacity-50 cursor-not-allowed')}
        >
          <ChevronRight className='h-4 w-4' />
        </span>
      ) : (
        <Link
          href={hrefFor(currentPage + 1)}
          aria-label='Next page'
          className={cn(navItemBase, FOCUS_RING, FOCUS_RING_OFFSET)}
        >
          <ChevronRight className='h-4 w-4' />
        </Link>
      )}
    </nav>
  );
}
