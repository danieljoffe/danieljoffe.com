'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, FileText, Briefcase, BookOpen, Globe } from 'lucide-react';
import { Text } from '@danieljoffe/shared-ui/Text';
import { cn } from '@/lib/cn';
import { buildSearchIndex, type SearchEntry } from '@/lib/searchIndex';
import { Z_INDEX } from '@/utils/constants';
import { createSearchEngine, searchWithHighlights } from '@/lib/search';

const TYPE_ICONS: Record<SearchEntry['type'], typeof Search> = {
  project: FileText,
  experience: Briefcase,
  blog: BookOpen,
  page: Globe,
};

const TYPE_LABELS: Record<SearchEntry['type'], string> = {
  project: 'Projects',
  experience: 'Experience',
  blog: 'Blog',
  page: 'Pages',
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const { engine, entries } = useMemo(() => {
    try {
      const entries = buildSearchIndex();
      const engine = createSearchEngine(entries);

      return { engine, entries };
    } catch (error) {
      console.error('Failed to build search index:', error);
      return { engine: null, entries: [] };
    }
  }, []);

  const results = useMemo(() => {
    if (!engine || !entries.length) {
      return { grouped: {}, isSearching: false };
    }

    if (!search.trim()) {
      const grouped: Partial<Record<SearchEntry['type'], SearchEntry[]>> = {};
      for (const entry of entries) {
        if (!grouped[entry.type]) grouped[entry.type] = [];
        grouped[entry.type]?.push(entry);
      }

      return { grouped, isSearching: false };
    }

    try {
      // Use MiniSearch for ranked results
      const results = searchWithHighlights(engine, search, entries);
      return { results, isSearching: true };
    } catch (error) {
      console.error('Search failed:', error);
      return { grouped: {}, isSearching: false };
    }
  }, [search, engine, entries]);

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Allow external triggers (e.g. nav search button) to open the palette
  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener('open-command-palette', handler);
    return () => document.removeEventListener('open-command-palette', handler);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-y-hidden');
    } else {
      document.body.classList.remove('overflow-y-hidden');
    }
    return () => document.body.classList.remove('overflow-y-hidden');
  }, [open]);

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router]
  );

  // Get matched terms from the matches object
  const getMatchedTerms = (result: {
    matches?: Record<string, string[]>;
  }): string[] => {
    const terms = new Set<string>();

    if (result.matches && typeof result.matches === 'object') {
      // The keys of the matches object are the actual matched terms
      Object.keys(result.matches).forEach(term => {
        terms.add(term);
      });
    }

    return Array.from(terms);
  };

  // Highlight text based on matched terms
  const HighlightText = ({
    text,
    terms,
  }: {
    text: string;
    terms: string[];
  }) => {
    if (!text || terms.length === 0) return <>{text}</>;

    // Find all terms that appear in the text
    const matchingTerms = terms.filter(
      term => term && text.toLowerCase().includes(term.toLowerCase())
    );

    if (matchingTerms.length === 0) return <>{text}</>;

    // Create a regex that matches any of the terms (case insensitive)
    const escapedTerms = matchingTerms.map(term =>
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          if (!part) return null;
          // Check if this part matches any term (case insensitive)
          const isMatch = matchingTerms.some(
            term => part.toLowerCase() === term.toLowerCase()
          );
          if (isMatch) {
            return (
              <mark
                key={i}
                className='bg-yellow-200 dark:bg-yellow-800 rounded px-0.5'
              >
                {part}
              </mark>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  if (!open)
    return <span data-testid='command-palette-ready' className='hidden' />;

  const hasGroupedResults =
    !results.isSearching &&
    results.grouped &&
    Object.keys(results.grouped).length > 0;
  const hasSearchResults =
    results.isSearching &&
    'results' in results &&
    results.results &&
    results.results.length > 0;

  return (
    <div
      className='fixed inset-0 bg-black/50 backdrop-blur-sm'
      style={{ zIndex: Z_INDEX.POPOVER }}
      onClick={() => setOpen(false)}
      data-testid='command-palette-overlay'
    >
      <div
        className='mx-auto mt-[20vh] w-full max-w-lg'
        onClick={e => e.stopPropagation()}
      >
        <Command
          loop
          shouldFilter={false}
          label='Command palette'
          className={cn(
            'rounded-xl border border-neutral-200 bg-white shadow-2xl',
            'dark:border-neutral-700 dark:bg-neutral-900'
          )}
        >
          <div className='flex items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-700'>
            <Search className='h-4 w-4 shrink-0 text-neutral-400' />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              autoFocus
              placeholder='Search pages, posts, services…'
              className={cn(
                'w-full bg-transparent py-3 text-sm outline-none',
                'placeholder:text-neutral-400',
                'dark:text-white'
              )}
            />
            <kbd
              className={cn(
                'hidden shrink-0 rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:inline-block',
                'dark:border-neutral-600'
              )}
            >
              ESC
            </kbd>
          </div>

          <Command.List className='max-h-96 overflow-y-auto'>
            <Command.Empty className='px-4 py-8 text-center text-sm text-neutral-400'>
              No results found.
            </Command.Empty>

            {hasGroupedResults && (
              <>
                {Object.entries(results.grouped).map(([type, items]) => {
                  const Icon = TYPE_ICONS[type as SearchEntry['type']];

                  return (
                    <Command.Group key={type} className='relative'>
                      <Command.Item className='flex sticky top-0 gap-2 px-3 py-3 bg-neutral-100 dark:bg-neutral-800'>
                        <div>
                          <Icon className='h-4 w-4 shrink-0' />
                        </div>

                        <div className='min-w-0 flex-1'>
                          <Text as='p' variant='label'>
                            {TYPE_LABELS[type as SearchEntry['type']]}
                          </Text>
                        </div>
                      </Command.Item>

                      {items.map(item => (
                        <Command.Item
                          key={`${type}-${item.slug}`}
                          // value={item.id}
                          value={`${item.title} ${item.excerpt} ${item.tags.join(' ')}`}
                          onSelect={() => handleSelect(item.url)}
                          className={cn(
                            'flex cursor-pointer gap-2 rounded-lg px-3 py-3 text-sm',
                            'data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-neutral-800'
                          )}
                        >
                          <div className='size-4 shrink-0'></div>
                          <div className='min-w-0 flex-1'>
                            <Text
                              as='p'
                              variant='cardDescription'
                              className='truncate'
                            >
                              {item.title}
                            </Text>
                            {item.excerpt && (
                              <Text as='p' variant='meta' className='truncate'>
                                {item.excerpt}
                              </Text>
                            )}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </>
            )}

            {hasSearchResults && (
              <div>
                {results.results.map(result => {
                  const matchedTerms = getMatchedTerms(result);
                  const Icon = TYPE_ICONS[result.type as SearchEntry['type']];

                  return (
                    <Command.Item
                      key={`${result.type}-${result.slug}`}
                      value={`${result.title} ${result.excerpt} ${result.tags.join(' ')}`}
                      onSelect={() => handleSelect(result.url)}
                      className={cn(
                        'flex cursor-pointer gap-2 rounded-lg px-3 py-3 text-sm',
                        'data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-neutral-800'
                      )}
                    >
                      <div>
                        <Icon className='h-4 w-4 shrink-0' />
                      </div>

                      <div className='min-w-0 flex-1'>
                        <Text as='p' variant='label'>
                          {TYPE_LABELS[result.type as SearchEntry['type']]}
                        </Text>
                        <Text
                          as='p'
                          variant='cardDescription'
                          className='truncate'
                        >
                          <HighlightText
                            text={result.title}
                            terms={matchedTerms}
                          />
                        </Text>
                        {result.excerpt && (
                          <Text as='p' variant='meta' className='truncate'>
                            <HighlightText
                              text={result.excerpt}
                              terms={matchedTerms}
                            />
                          </Text>
                        )}
                      </div>
                    </Command.Item>
                  );
                })}
              </div>
            )}
          </Command.List>

          <div className='border-t dark:border-gray-700 px-4 py-2 text-xs text-gray-500 flex justify-between'>
            <span>↑↓ to navigate</span>
            <span>⏎ to select</span>
            <span>⌘K to close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
