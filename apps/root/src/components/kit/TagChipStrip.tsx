import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import {
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import { cn } from '@/lib/cn';

export interface TagChip {
  name: string;
  count: number;
  href: string;
}

interface TagChipStripProps {
  tags: TagChip[];
  /** Optional href for a trailing "View all tags" link. */
  viewAllHref?: string | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
  /** When provided, chips render as buttons that call this handler. */
  onTagClick?: ((tagName: string) => void) | undefined;
  /** Name of the currently active tag (highlighted + toggle-off on re-click). */
  activeTag?: string | null | undefined;
}

/**
 * Horizontal chip strip of tags for filtering a content index. When
 * `onTagClick` is provided, chips render as interactive `<button>` elements
 * for client-side filtering. Otherwise they render as `<Link>` elements
 * that navigate to the corresponding tag detail route. Returns `null` when
 * there are no tags so pages don't render an empty container.
 */
export function TagChipStrip({
  tags,
  viewAllHref,
  ariaLabel = 'Filter by tag',
  className,
  onTagClick,
  activeTag,
}: TagChipStripProps) {
  if (tags.length === 0) return null;

  const interactive = typeof onTagClick === 'function';

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'flex flex-wrap items-center gap-2 overflow-x-auto',
        className
      )}
    >
      {tags.map(tag => {
        const isActive = interactive && activeTag === tag.name;

        if (interactive) {
          return (
            <button
              key={tag.name}
              type='button'
              onClick={() => onTagClick(tag.name)}
              aria-pressed={isActive}
              className={cn(
                'rounded-md transition-opacity hover:opacity-80',
                FOCUS_RING,
                FOCUS_RING_OFFSET
              )}
            >
              <Badge variant={isActive ? 'info' : 'default'} size='md'>
                {tag.name}
                <span className='ml-1 text-text-tertiary'>({tag.count})</span>
              </Badge>
            </button>
          );
        }

        return (
          <Link
            key={tag.name}
            href={tag.href}
            className={cn(
              'rounded-md transition-opacity hover:opacity-80',
              FOCUS_RING,
              FOCUS_RING_OFFSET
            )}
          >
            <Badge variant='default' size='md'>
              {tag.name}
              <span className='ml-1 text-text-tertiary'>({tag.count})</span>
            </Badge>
          </Link>
        );
      })}
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className={cn(
            'inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors rounded-md',
            FOCUS_RING,
            FOCUS_RING_OFFSET
          )}
        >
          View all tags
          <ArrowRight className='h-3.5 w-3.5' aria-hidden='true' />
        </Link>
      )}
    </nav>
  );
}
