import { getContentByType, type ContentEntry } from '@/data/contentRegistry';
import { ContentType } from '@/types/postTypes';

export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/**
 * Slice an array into a page. `pageNumber` is 1-indexed. Out-of-range page
 * numbers clamp to the valid range (page 1 for empty lists). `pageSize` is
 * coerced to at least 1 so callers can't accidentally divide by zero.
 */
export function paginate<T>(
  items: readonly T[],
  pageSize: number,
  pageNumber: number
): PaginatedResult<T> {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const currentPage = Math.min(Math.max(1, Math.floor(pageNumber)), totalPages);
  const start = (currentPage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    currentPage,
    totalPages,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}

/**
 * Paginated view of a content type in its display order. Ordering matches the
 * registry (reversed to newest-first for consumers that use it like the
 * existing `/blog` and `/projects` pages).
 */
export function getPaginatedContent(
  type: ContentType,
  pageNumber: number,
  pageSize: number
): PaginatedResult<ContentEntry> {
  const all = getContentByType(type).slice().reverse();
  return paginate(all, pageSize, pageNumber);
}

/** Total number of pages for a content type at the given page size. */
export function getTotalPages(type: ContentType, pageSize: number): number {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const count = getContentByType(type).length;
  return Math.max(1, Math.ceil(count / safeSize));
}
