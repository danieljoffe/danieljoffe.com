'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { createSearchEngine, searchWithHighlights } from '@/lib/search';
import { buildSearchIndex } from '@/lib/searchIndex';
import type { PostThumbnail } from '@/types/postTypes';
import { PostCard, ListPagination } from '@/components/kit';

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
}

/**
 * Client island that wraps the blog index grid with an inline MiniSearch
 * input. When the search query is empty, it renders the paginated `pagePosts`
 * grid plus a `<ListPagination>` control. When the query is non-empty, it
 * runs the query against the full blog corpus, hides the pagination, and
 * renders the flat result list.
 */
export function BlogSearchAndList({
  pagePosts,
  allPosts,
  currentPage,
  totalPages,
  basePath,
}: BlogSearchAndListProps) {
  const [query, setQuery] = useState('');
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

  const visiblePosts = isSearching ? searchResults : pagePosts;

  return (
    <div className='space-y-6'>
      <div className='relative max-w-md'>
        <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary'>
          <Search className='h-4 w-4' aria-hidden='true' />
        </div>
        <Input
          type='search'
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Search posts…'
          aria-label='Search blog posts'
          className='pl-9'
        />
      </div>

      {isSearching && (
        <Text variant='meta' as='p' aria-live='polite'>
          {searchResults.length}{' '}
          {searchResults.length === 1 ? 'result' : 'results'} for &quot;
          {trimmedQuery}&quot;
        </Text>
      )}

      {visiblePosts.length === 0 ? (
        <Text variant='body' as='p' className='text-text-secondary'>
          {isSearching
            ? 'No posts match your search. Try a different term.'
            : 'No posts yet.'}
        </Text>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {visiblePosts.map((post, i) => (
            <PostCard
              key={post.slug}
              post={post}
              priority={!isSearching && currentPage === 1 && i < 2}
              analyticsType='blog'
            />
          ))}
        </div>
      )}

      {!isSearching && (
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
