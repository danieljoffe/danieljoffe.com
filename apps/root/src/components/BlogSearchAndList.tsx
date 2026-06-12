'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@danieljoffe/shared-ui/Input';
import { Text } from '@danieljoffe/shared-ui/Text';
import { createSearchEngine, searchWithHighlights } from '@/lib/search';
import { buildSearchIndex } from '@/lib/searchIndex';
import type { PostThumbnail } from '@/types/postTypes';
import { PostCard, ListPagination, TagChipStrip } from '@/components/kit';
import type { TagChip } from '@/components/kit';

interface BlogSearchAndListProps {
  /** Paginated slice of posts shown when the search query is empty. */
  pagePosts: PostThumbnail[];
  /** Full set of blog posts, newest-first. Used for client-side search. */
  allPosts: PostThumbnail[];
  currentPage: number;
  totalPages: number;
  /**
   * Base path for the paginated route. Page 1 lives at `basePath`, later
   * pages at `${basePath}/page/N`. Passed as a string (not a function) so
   * it can cross the server/client boundary.
   */
  basePath: string;
  /** Tag chips for client-side filtering. */
  tags: TagChip[];
  /** Href for the "View all tags" trailing link. */
  viewAllTagsHref?: string;
}

/**
 * Client island that wraps the blog index grid with an inline MiniSearch
 * input and tag chip filtering. When neither search nor tag filter is active,
 * it renders the paginated `pagePosts` grid plus a `<ListPagination>` control.
 * When a search query is entered or a tag is selected, it filters the full
 * blog corpus client-side and hides the pagination. Selecting a tag clears
 * the search query and vice versa.
 */
export function BlogSearchAndList({
  pagePosts,
  allPosts,
  currentPage,
  totalPages,
  basePath,
  tags,
  viewAllTagsHref,
}: BlogSearchAndListProps) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const hrefFor = (page: number): string =>
    page <= 1 ? basePath : `${basePath}/page/${page}`;

  const { engine, blogEntries } = useMemo(() => {
    try {
      const blogEntries = buildSearchIndex().filter(e => e.type === 'blog');
      return { engine: createSearchEngine(blogEntries), blogEntries };
    } catch (error) {
      console.error('Failed to build blog search index:', error);
      return { engine: null, blogEntries: [] };
    }
  }, []);

  const bySlug = useMemo(() => {
    const map = new Map<string, PostThumbnail>();
    for (const post of allPosts) map.set(post.slug, post);
    return map;
  }, [allPosts]);

  const trimmedQuery = deferredQuery.trim();
  const isSearching = trimmedQuery.length > 0;
  const isFiltering = activeTag !== null;

  const searchResults = useMemo(() => {
    if (!isSearching || !engine) return [];
    try {
      return searchWithHighlights(engine, trimmedQuery, blogEntries)
        .map(entry => bySlug.get(entry.slug))
        .filter((p): p is PostThumbnail => p !== undefined);
    } catch (error) {
      console.error('Blog search failed:', error);
      return [];
    }
  }, [isSearching, engine, trimmedQuery, blogEntries, bySlug]);

  const tagResults = useMemo(() => {
    if (!isFiltering) return [];
    return allPosts.filter(post => post.tags && post.tags.includes(activeTag));
  }, [isFiltering, allPosts, activeTag]);

  const handleTagClick = (tagName: string) => {
    setActiveTag(prev => (prev === tagName ? null : tagName));
    setQuery('');
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value.trim().length > 0) setActiveTag(null);
  };

  const visiblePosts = isSearching
    ? searchResults
    : isFiltering
      ? tagResults
      : pagePosts;

  const showPagination = !isSearching && !isFiltering;

  return (
    <div className='space-y-6'>
      <TagChipStrip
        tags={tags}
        viewAllHref={viewAllTagsHref}
        ariaLabel='Filter blog posts by tag'
        onTagClick={handleTagClick}
        activeTag={activeTag}
        className='mb-2'
      />

      <div className='relative'>
        <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary'>
          <Search className='h-4 w-4' aria-hidden='true' />
        </div>
        <Input
          type='search'
          value={query}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder='Search posts…'
          aria-label='Search blog posts'
          className='pl-9'
        />
      </div>

      {isSearching && (
        <Text variant='meta' as='p' aria-live='polite'>
          {`${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'} for "${trimmedQuery}"`}
        </Text>
      )}

      {isFiltering && !isSearching && (
        <Text variant='meta' as='p' aria-live='polite'>
          {`${tagResults.length} ${tagResults.length === 1 ? 'post' : 'posts'} tagged "${activeTag}"`}
        </Text>
      )}

      {visiblePosts.length === 0 ? (
        <Text variant='body' as='p' className='text-text-secondary'>
          {isSearching
            ? 'No posts match your search. Try a different term.'
            : isFiltering
              ? `No posts tagged "${activeTag}".`
              : 'No posts yet.'}
        </Text>
      ) : (
        <div
          data-testid='post-list'
          className='grid grid-cols-1 sm:grid-cols-2 gap-4'
        >
          {visiblePosts.map((post, i) => (
            <PostCard
              key={post.slug}
              post={post}
              priority={showPagination && currentPage === 1 && i < 2}
              analyticsType='blog'
            />
          ))}
        </div>
      )}

      {showPagination && (
        <ListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          hrefFor={hrefFor}
          className='mt-2'
        />
      )}
    </div>
  );
}
